import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy init Gemini AI
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('GEMINI_API_KEY not set in environment.');
      return null;
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Algorithmic heuristic fallback for robust zero-failure calculation
function calculateHeuristicPriorities(tasks: any[], goals: any[]) {
  const goalMap = new Map(goals.map((g: any) => [g.id, g]));
  const now = new Date();

  return tasks.map((task: any) => {
    const goal = task.goalId ? goalMap.get(task.goalId) : null;
    const goalWeight = goal ? goal.weight : 3; // 1-10
    const goalCategory = goal ? goal.category : 'general';

    // Deadline urgency score (0-100)
    let urgencyScore = 30;
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours <= 24) urgencyScore = 95;
      else if (diffHours <= 72) urgencyScore = 80;
      else if (diffHours <= 168) urgencyScore = 60;
      else urgencyScore = 40;
    }

    // Energy weight
    const energyBonus = task.energyLevel === 'high' ? 10 : task.energyLevel === 'medium' ? 5 : 0;

    // Significance calculation: 60% Goal weight + 30% Urgency + 10% Energy
    const rawSignificance = (goalWeight / 10) * 60 + (urgencyScore / 100) * 30 + energyBonus;
    const significanceScore = Math.min(100, Math.max(15, Math.round(rawSignificance)));

    // Goal alignment percent
    const goalAlignmentPercent = goal ? Math.min(100, Math.round((goalWeight / 10) * 85 + (significanceScore / 100) * 15)) : 20;

    // Eisenhower quadrant
    let quadrant = 'schedule';
    let priority: 'P1' | 'P2' | 'P3' | 'P4' = 'P2';

    if (urgencyScore >= 70 && significanceScore >= 75) {
      quadrant = 'do_first';
      priority = 'P1';
    } else if (significanceScore >= 60) {
      quadrant = 'schedule';
      priority = 'P2';
    } else if (urgencyScore >= 70) {
      quadrant = 'delegate';
      priority = 'P3';
    } else {
      quadrant = 'eliminate';
      priority = 'P4';
    }

    const reasoning = goal
      ? `Задача привязана к ключевой цели "${goal.title}" (стратегический вес ${goalWeight}/10). Оценка значимости ${significanceScore}/100 обусловлена высоким влиянием на результат и дедлайном.`
      : `Задача не привязана к явной стратегической цели. Присвоен приоритет ${priority} как операционная рутина. Рекомендуется связать с целью или оптимизировать.`;

    return {
      ...task,
      significanceScore,
      goalAlignmentPercent,
      eisenhowerQuadrant: quadrant,
      priority,
      aiReasoning: reasoning,
    };
  });
}

// Call DeepSeek API
async function callDeepSeekAPI(prompt: string, apiKey: string, model: string = 'deepseek-reasoner') {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-reasoner',
      messages: [
        {
          role: 'system',
          content:
            'Ты — главный эксперт по стратегической приоритизации задач и тайм-менеджменту (Goal-Driven Prioritization & DeepSeek Reasoning). Отвечай строго в формате JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const reasoning = choice?.message?.reasoning_content || '';
  const content = choice?.message?.content || '{}';

  return {
    content: JSON.parse(content),
    reasoning,
  };
}

// Call Gemini API with automatic model fallback (3.8-flash -> 3.1-flash-lite -> flash-latest)
interface GeminiCallParams {
  prompt: string;
  systemInstruction?: string;
  preferredModel?: string;
  responseMimeType?: string;
}

interface GeminiCallResult {
  text: string;
  content: any;
  modelUsed: string;
}

async function callGeminiWithFallback(params: GeminiCallParams): Promise<GeminiCallResult | null> {
  const client = getGeminiClient();
  if (!client) return null;

  // Build candidate models order
  // Supported free tier models: gemini-3.8-flash, gemini-3.1-flash-lite, gemini-flash-latest
  const candidates: string[] = [];
  if (params.preferredModel && !params.preferredModel.startsWith('deepseek')) {
    candidates.push(params.preferredModel);
  }
  if (!candidates.includes('gemini-3.8-flash')) candidates.push('gemini-3.8-flash');
  if (!candidates.includes('gemini-3.1-flash-lite')) candidates.push('gemini-3.1-flash-lite');
  if (!candidates.includes('gemini-flash-latest')) candidates.push('gemini-flash-latest');

  for (const model of candidates) {
    try {
      const config: any = {};
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }

      const response = await client.models.generateContent({
        model,
        contents: params.prompt,
        config,
      });

      const text = response.text || '';
      let content: any = null;
      if (params.responseMimeType === 'application/json') {
        try {
          content = JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              content = JSON.parse(jsonMatch[0]);
            } catch {
              content = null;
            }
          }
        }
      }

      return {
        text,
        content,
        modelUsed: model,
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isQuotaOrDemand =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('limit: 0');

      if (isQuotaOrDemand) {
        console.log(`[Gemini Fallback] Model ${model} temporarily unavailable. Switching to next candidate model...`);
        if (errMsg.includes('503') || errMsg.includes('high demand')) {
          await new Promise(r => setTimeout(r, 400));
        }
        continue;
      }

      console.log(`[Gemini Fallback] Model ${model} returned error, trying next: ${errMsg.slice(0, 100)}`);
      continue;
    }
  }

  return null;
}

// Legacy helper for compatibility
async function callGeminiThinking(prompt: string, preferredModel?: string) {
  const result = await callGeminiWithFallback({
    prompt,
    systemInstruction:
      'Вы — ведущий ИИ-стратег по согласованию задач и целей (Goal Alignment Engine). Всегда возвращайте валидный JSON согласно предоставленной схеме.',
    responseMimeType: 'application/json',
    preferredModel: preferredModel || 'gemini-3.8-flash',
  });

  if (!result || !result.content) {
    throw new Error('Gemini models unavailable');
  }

  return {
    content: result.content,
    reasoning: `Стратегический анализ целей и зависимостей выполнен в режиме ${result.modelUsed}.`,
    modelUsed: result.modelUsed,
  };
}

// API: Prioritize tasks against goals
app.post('/api/ai/prioritize', async (req, res) => {
  try {
    const { tasks = [], goals = [], selectedModel = 'deepseek-reasoner', customApiKey = '' } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Список задач пуст' });
    }

    const deepseekKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    const isDeepSeek = selectedModel.startsWith('deepseek');
    const systemPrompt = `
Проведи стратегическую переоценку и автоматическое распределение значимости списка задач на основе установленных целей.

Список установленных целей (Goal list with strategic weights 1-10):
${JSON.stringify(goals, null, 2)}

Список задач пользователя:
${JSON.stringify(tasks, null, 2)}

Инструкция по приоритизации:
1. Рассчитай "significanceScore" (0-100) для каждой задачи исходя из важности связанной цели (weight 1-10), вклада задачи в прогресс цели, срочности дедлайна и когнитивной энергии.
2. Определи "goalAlignmentPercent" (0-100%) — насколько задача приближает выполнение установленных целей.
3. Назначь "priority":
   - "P1" (Критический фокус, наивысший импакт на ключевую цель)
   - "P2" (Высокий приоритет, важный плановый этап)
   - "P3" (Средний приоритет, второстепенные задачи)
   - "P4" (Низкий приоритет / рутина / под делегирование)
4. Присвой "eisenhowerQuadrant": "do_first" | "schedule" | "delegate" | "eliminate".
5. Напиши четкое и обоснованное "aiReasoning" (на русском языке) для каждой задачи: почему ей присвоен такой приоритет и как она двигает главную цель.
6. Составь краткое стратегическое резюме "summary" и 3 конкретных совета "strategicAdvice" по балансировке времени.

Верни ответ ТОЛЬКО в формате JSON:
{
  "tasks": [
    {
      "id": "task_id",
      "significanceScore": number,
      "goalAlignmentPercent": number,
      "priority": "P1" | "P2" | "P3" | "P4",
      "eisenhowerQuadrant": "do_first" | "schedule" | "delegate" | "eliminate",
      "aiReasoning": "string"
    }
  ],
  "summary": "Краткое заключение по фокусу и распределению нагрузки",
  "strategicAdvice": ["совет 1", "совет 2", "совет 3"]
}
`;

    let aiResult: any = null;
    let reasoningChain = '';
    let modelUsed = selectedModel;

    // Try DeepSeek if selected and key available
    if (isDeepSeek && deepseekKey) {
      try {
        const dsRes = await callDeepSeekAPI(systemPrompt, deepseekKey, selectedModel);
        aiResult = dsRes.content;
        reasoningChain = dsRes.reasoning;
        modelUsed = selectedModel;
      } catch (err: any) {
        console.warn('DeepSeek call failed, falling back to Gemini / Heuristics:', err.message);
      }
    }

    // Try Gemini if Gemini selected or DeepSeek not configured
    if (!aiResult && process.env.GEMINI_API_KEY) {
      const geminiRes = await callGeminiWithFallback({
        prompt: systemPrompt,
        systemInstruction:
          'Вы — ведущий ИИ-стратег по согласованию задач и целей (Goal Alignment Engine). Всегда возвращайте валидный JSON согласно предоставленной схеме.',
        responseMimeType: 'application/json',
        preferredModel: selectedModel.startsWith('gemini') ? selectedModel : 'gemini-3.8-flash',
      });
      if (geminiRes && geminiRes.content && Array.isArray(geminiRes.content.tasks)) {
        aiResult = geminiRes.content;
        reasoningChain = `Стратегический анализ целей и критического пути выполнен моделью ${geminiRes.modelUsed}.`;
        modelUsed = geminiRes.modelUsed;
      }
    }

    // Fallback to high-precision heuristic calculation
    if (!aiResult || !aiResult.tasks) {
      console.log('Using robust heuristic goal-alignment engine');
      const heuristicTasks = calculateHeuristicPriorities(tasks, goals);
      modelUsed = isDeepSeek ? 'DeepSeek Engine (Авто-эвристика)' : 'GoalFlow AI Engine';
      aiResult = {
        tasks: heuristicTasks,
        summary:
          'Автоматическая приоритизация рассчитана на основе матрицы стратегического веса целей, близости дедлайнов и требуемой энергии концентрации.',
        strategicAdvice: [
          'Сфокусируйтесь утром на задачах P1 из цели с максимальным весом.',
          'Задачи с низким Goal Alignment рекомендуется перенести во вторую половину дня.',
          'Проверьте задачи без привязки к целям: возможно, часть из них можно делегировать.',
        ],
      };
      reasoningChain =
        '1. Взвешивание стратегического импакта (Goal Weight 1-10)\n2. Оценка временного окна дедлайнов и критического пути\n3. Анализ когнитивной нагрузки и распределение в матрицу Эйзенхауэра.';
    }

    // Merge AI updates with existing task objects
    const aiTaskMap = new Map((aiResult.tasks || []).map((t: any) => [t.id, t]));
    const updatedTasks = tasks.map(orig => {
      const aiData: any = aiTaskMap.get(orig.id);
      if (!aiData) return orig;
      return {
        ...orig,
        significanceScore: typeof aiData.significanceScore === 'number' ? aiData.significanceScore : orig.significanceScore,
        goalAlignmentPercent:
          typeof aiData.goalAlignmentPercent === 'number' ? aiData.goalAlignmentPercent : orig.goalAlignmentPercent,
        priority: aiData.priority || orig.priority,
        eisenhowerQuadrant: aiData.eisenhowerQuadrant || orig.eisenhowerQuadrant,
        aiReasoning: aiData.aiReasoning || orig.aiReasoning,
      };
    });

    // Compute goal distribution stats
    const goalStats = goals.map(g => {
      const related = updatedTasks.filter(t => t.goalId === g.id);
      const totalMinutes = related.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
      const avgSig = related.length > 0
        ? Math.round(related.reduce((acc, t) => acc + (t.significanceScore || 0), 0) / related.length)
        : 0;

      return {
        goalId: g.id,
        goalTitle: g.title,
        color: g.color,
        taskCount: related.length,
        totalMinutes,
        averageSignificance: avgSig,
      };
    });

    res.json({
      updatedTasks,
      summary: aiResult.summary || 'Приоритизация успешно выполнена в реальном времени.',
      strategicAdvice: aiResult.strategicAdvice || [],
      thinkingProcess: reasoningChain,
      goalDistributionStats: goalStats,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Prioritization endpoint error:', error);
    res.status(500).json({ error: error.message || 'Ошибка сервера при расчете приоритетов' });
  }
});

// API: Propose intelligent schedule and deadlines based on goals
app.post('/api/ai/propose-schedule', async (req, res) => {
  try {
    const { tasks = [], goals = [], config = {}, selectedModel = 'deepseek-reasoner', customApiKey = '' } = req.body;
    const activeTasks = tasks.filter((t: any) => t.status !== 'completed');

    if (activeTasks.length === 0) {
      return res.status(400).json({ error: 'Нет активных задач для распределения' });
    }

    const deepseekKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    const isDeepSeek = selectedModel.startsWith('deepseek');

    const prompt = `
Вы — ведущий ИИ-архитектор расписания и дедлайнов (Reverse Goal-Driven Scheduler).
Текущая дата: ${new Date().toISOString().split('T')[0]}.
Параметры расписания:
- Рабочий день: с ${config.workStartHour || 9}:00 до ${config.workEndHour || 18}:00
- Утренний пик фокуса: с ${config.focusPeakStart || 10}:00 до ${config.focusPeakEnd || 12}:00
- Обед: с ${config.lunchStartHour || 13}:00 (60 минут)

Цели пользователя с весами 1-10 и дедлайнами:
${JSON.stringify(goals, null, 2)}

Задачи пользователя:
${JSON.stringify(activeTasks, null, 2)}

Инструкция:
1. Для каждой задачи назначь оптимальный дедлайн (proposedDeadline в формате YYYY-MM-DD):
   - Задачи с максимальной значимостью для цели (P1, высокий вес цели) должны иметь ранний дедлайн (за несколько дней до или в ближайшие 2-5 дней), чтобы не блокировать финальный запуск цели.
   - Менее важные задачи получают дедлайн дальше по календарю.
2. Для каждой задачи назначь конкретный календарный слот (proposedStart и proposedEnd в формате ISO 8601):
   - Задачи P1 резервируют утренние часы пика фокуса (${config.focusPeakStart || 10}:00).
   - Задачи не должны накладываться друг на друга и на обеденное время.
3. Напиши четкое обоснование (reasoning на русском): почему дедлайн и время назначены именно так относительно цели.

Верни ответ ТОЛЬКО в формате JSON:
{
  "summary": "Краткое резюме стратегии планирования",
  "strategyExplanation": "Объяснение принципа распределения дедлайнов",
  "proposals": [
    {
      "taskId": "id задачи",
      "proposedDeadline": "YYYY-MM-DD",
      "proposedStart": "ISO_DATE",
      "proposedEnd": "ISO_DATE",
      "reasoning": "Обоснование на русском"
    }
  ]
}
`;

    let aiResult: any = null;
    let modelUsed = selectedModel;

    if (isDeepSeek && deepseekKey) {
      try {
        const dsRes = await callDeepSeekAPI(prompt, deepseekKey, selectedModel);
        aiResult = dsRes.content;
      } catch (err: any) {
        console.warn('DeepSeek schedule failed:', err.message);
      }
    }

    if (!aiResult && process.env.GEMINI_API_KEY) {
      const geminiRes = await callGeminiWithFallback({
        prompt,
        systemInstruction: 'Вы — ИИ-планировщик расписания и дедлайнов на основе целей. Возвращайте только JSON.',
        responseMimeType: 'application/json',
        preferredModel: selectedModel.startsWith('gemini') ? selectedModel : 'gemini-3.8-flash',
      });
      if (geminiRes && geminiRes.content && Array.isArray(geminiRes.content.proposals)) {
        aiResult = geminiRes.content;
        modelUsed = geminiRes.modelUsed;
      }
    }

    // Fallback if no LLM response: algorithmic generation
    if (!aiResult || !Array.isArray(aiResult.proposals)) {
      const goalMap = new Map<string, any>(goals.map((g: any) => [g.id, g]));
      const now = new Date();
      let dayOffset = 0;
      let curHour = config.focusPeakStart || 9;

      const fallbackProposals = activeTasks.map((task: any) => {
        const goal: any = task.goalId ? goalMap.get(task.goalId) : null;
        const isP1 = task.priority === 'P1' || task.significanceScore >= 80;

        if (curHour >= (config.workEndHour || 18) - 1) {
          dayOffset++;
          curHour = isP1 ? (config.focusPeakStart || 9) : (config.workStartHour || 9);
        }
        if (curHour === (config.lunchStartHour || 13)) curHour++;

        const slotStart = new Date(now);
        slotStart.setDate(slotStart.getDate() + dayOffset);
        slotStart.setHours(curHour, 0, 0, 0);

        const duration = task.durationMinutes || 60;
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        curHour += Math.max(1, Math.ceil((duration + 15) / 60));

        const deadDays = isP1 ? 3 : 7;
        const deadDate = new Date(now);
        deadDate.setDate(deadDate.getDate() + deadDays);

        return {
          taskId: task.id,
          taskTitle: task.title,
          currentDeadline: task.deadline || null,
          proposedDeadline: deadDate.toISOString().split('T')[0],
          proposedStart: slotStart.toISOString(),
          proposedEnd: slotEnd.toISOString(),
          significanceScore: task.significanceScore || 70,
          priority: task.priority || 'P2',
          goalTitle: goal ? goal.title : undefined,
          goalColor: goal ? goal.color : undefined,
          reasoning: goal
            ? `Связано с целью "${goal.title}" (вес ${goal.weight}/10). Ранний дедлайн назначен для устранения рисков срыва цели.`
            : 'Операционная задача. Дедлайн оптимизирован для сбалансированного темпа работы.',
          accepted: true,
        };
      });

      aiResult = {
        summary: `Алгоритмический движок GoalFlow подготовил сбалансированный план дедлайнов и календарных слотов для ${fallbackProposals.length} задач.`,
        strategyExplanation: 'Задачи P1 зарезервировали пиковые часы фокуса, а дедлайны скорректированы относительно дедлайнов целей.',
        proposals: fallbackProposals,
      };
      modelUsed = 'GoalFlow Engine (Heuristic)';
    } else {
      // Enrich AI proposals with goal and title info
      const taskMap = new Map<string, any>(tasks.map((t: any) => [t.id, t]));
      const goalMap = new Map<string, any>(goals.map((g: any) => [g.id, g]));

      aiResult.proposals = aiResult.proposals.map((p: any) => {
        const origTask: any = taskMap.get(p.taskId);
        const goal: any = origTask?.goalId ? goalMap.get(origTask.goalId) : null;
        return {
          ...p,
          taskTitle: origTask ? origTask.title : p.taskId,
          currentDeadline: origTask?.deadline || null,
          significanceScore: origTask?.significanceScore || 70,
          priority: origTask?.priority || 'P2',
          goalTitle: goal ? goal.title : undefined,
          goalColor: goal ? goal.color : undefined,
          accepted: true,
        };
      });
    }

    res.json({
      id: `proposal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary: aiResult.summary,
      strategyExplanation: aiResult.strategyExplanation,
      modelUsed,
      proposals: aiResult.proposals,
    });
  } catch (error: any) {
    console.error('Schedule proposal error:', error);
    res.status(500).json({ error: error.message || 'Ошибка генерации расписания' });
  }
});

// API: Interactive AI Assistant Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history = [], tasks = [], goals = [], selectedModel = 'deepseek-reasoner', customApiKey = '' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const deepseekKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    const isDeepSeek = selectedModel.startsWith('deepseek');

    const systemPrompt = `
Вы — персональный интеллектуальный ассистент по управлению целями, расписанием и задачами GoalFlow AI.
Пользователь общается с вами в чате и может:
1. Задавать вопросы о своих целях, приоритетах и балансе времени.
2. Отдавать команды:
   - "составить расписание" / "поставить дедлайны" / "сделай план" -> распознай действие propose_schedule
   - "добавить задачу [название]" / "создать задачу" -> распознай действие create_task
   - "создать цель [название]" / "добавить цель" -> распознай действие create_goal
   - "удалить задачу [название]" -> распознай действие delete_task
   - "удалить цель [название]" -> распознай действие delete_goal

Текущие цели пользователя:
${JSON.stringify(goals, null, 2)}

Текущие задачи:
${JSON.stringify(tasks.map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, goalId: t.goalId, deadline: t.deadline })), null, 2)}

Отвечайте доброжелательно, по делу и профессионально на русском языке.
Если пользователь дает конкретную команду, верните в ответе структуру command.

Формат ответа ТОЛЬКО JSON:
{
  "reply": "Ваш ответ пользователю",
  "command": {
    "action": "propose_schedule" | "create_task" | "create_goal" | "delete_task" | "delete_goal" | "none",
    "params": {
      "title": "...",
      "durationMinutes": 45,
      "energyLevel": "high" | "medium" | "low",
      "priority": "P1" | "P2" | "P3",
      "weight": 8,
      "category": "business" | "career" | "health" | "finance" | "education" | "personal",
      "targetDate": "YYYY-MM-DD",
      "targetName": "..."
    }
  }
}
`;

    let replyData: any = null;

    if (isDeepSeek && deepseekKey) {
      try {
        const dsRes = await callDeepSeekAPI(
          `${systemPrompt}\n\nИстория диалога:\n${JSON.stringify(history.slice(-6))}\n\nСообщение пользователя: ${message}`,
          deepseekKey,
          selectedModel
        );
        replyData = dsRes.content;
      } catch (err: any) {
        console.warn('DeepSeek chat failed:', err.message);
      }
    }

    if (!replyData && process.env.GEMINI_API_KEY) {
      const geminiRes = await callGeminiWithFallback({
        prompt: `${systemPrompt}\n\nИстория диалога:\n${JSON.stringify(history.slice(-6))}\n\nСообщение пользователя: ${message}`,
        systemInstruction: 'Вы — ИИ-ассистент GoalFlow. Отвечайте только в JSON формате с полями reply и command.',
        responseMimeType: 'application/json',
        preferredModel: selectedModel.startsWith('gemini') ? selectedModel : 'gemini-3.8-flash',
      });
      if (geminiRes && geminiRes.content && geminiRes.content.reply) {
        replyData = geminiRes.content;
      }
    }

    // Fallback response with pattern-matching
    if (!replyData || !replyData.reply) {
      const lower = message.toLowerCase();
      if (lower.includes('расписан') || lower.includes('дедлайн') || lower.includes('план')) {
        replyData = {
          reply: 'Отличная идея! Я запускаю анализ ваших целей и подготовку умного расписания с оптимизированными дедлайнами. Сейчас откроется окно подтверждения плана.',
          command: { action: 'propose_schedule' },
        };
      } else if (lower.includes('добавь задач') || lower.includes('создай задач')) {
        const titleMatch = message.replace(/(добавь|создай)\s+задач[уае]\s*:?/i, '').trim();
        replyData = {
          reply: `Задача "${titleMatch || 'Новая задача'}" принята к созданию и привязке к приоритетным целям.`,
          command: {
            action: 'create_task',
            params: {
              title: titleMatch || 'Новая задача',
              durationMinutes: 45,
              energyLevel: 'medium',
              priority: 'P2',
            },
          },
        };
      } else if (lower.includes('добавь цель') || lower.includes('создай цель')) {
        const titleMatch = message.replace(/(добавь|создай)\s+цель\s*:?/i, '').trim();
        const d = new Date();
        d.setDate(d.getDate() + 30);
        replyData = {
          reply: `Создаю стратегическую цель "${titleMatch || 'Новая стратегическая цель'}".`,
          command: {
            action: 'create_goal',
            params: {
              title: titleMatch || 'Новая стратегическая цель',
              weight: 8,
              category: 'business',
              targetDate: d.toISOString().split('T')[0],
            },
          },
        };
      } else {
        replyData = {
          reply: `Я готов помочь! Ваши ключевые цели (${goals.length} шт.) требуют четкого фокуса. Вы можете попросить меня составить умное расписание с дедлайнами ("Составь расписание"), добавить задачу или цель.`,
          command: { action: 'none' },
        };
      }
    }

    res.json(replyData);
  } catch (error: any) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Ошибка чата' });
  }
});

// API: Check AI status and keys
app.get('/api/ai/status', (req, res) => {
  res.json({
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    deepseekAvailable: !!process.env.DEEPSEEK_API_KEY,
    status: 'online',
    defaultModel: 'gemini-3.8-flash',
  });
});

async function startServer() {
  // Vite middleware in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GoalFlow AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
