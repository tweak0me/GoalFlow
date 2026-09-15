import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { GoalsView } from './components/GoalsView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { AIThinkingView } from './components/AIThinkingView';
import { SettingsModal } from './components/SettingsModal';
import { AIChatView } from './components/AIChatView';
import { ScheduleProposalModal } from './components/ScheduleProposalModal';
import {
  Goal,
  Task,
  AIModelType,
  UserScheduleConfig,
  CalendarEvent,
  PrioritizationResult,
  ScheduleProposal,
  ProposedTaskSchedule,
  ChatMessage,
} from './types';
import { INITIAL_GOALS, INITIAL_TASKS, DEFAULT_SCHEDULE_CONFIG } from './data/initialData';
import { autoDistributeTasksToCalendar, generateICalFile, downloadFile } from './utils/calendarUtils';
import { generateHeuristicScheduleProposal } from './utils/aiScheduler';
import { Sparkles, CheckCircle, AlertCircle, Bot, CalendarClock, MessageSquare, CheckSquare, Calendar, Target, BrainCircuit } from 'lucide-react';

const STORAGE_KEYS = {
  GOALS: 'goalflow_goals_v1',
  TASKS: 'goalflow_tasks_v1',
  CONFIG: 'goalflow_config_v1',
  DEEPSEEK_KEY: 'goalflow_deepseek_key_v1',
  MODEL: 'goalflow_model_v1',
  CHAT: 'goalflow_chat_history_v1',
  THEME: 'goalflow_theme_v1',
};

export default function App() {
  // Theme state: default to dark as requested by user
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  // Sync theme with DOM documentElement for Tailwind dark mode
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.warn('Theme storage error:', err);
    }
  }, [theme]);

  // State initialization with localStorage fallback
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
      return saved ? JSON.parse(saved) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [config, setConfig] = useState<UserScheduleConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE_CONFIG;
    } catch {
      return DEFAULT_SCHEDULE_CONFIG;
    }
  });

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.DEEPSEEK_KEY) || '';
    } catch {
      return '';
    }
  });

  const [selectedModel, setSelectedModel] = useState<AIModelType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODEL) as AIModelType;
      if (saved && saved !== 'gemini-3.1-pro-preview') {
        return saved;
      }
      return 'gemini-3.8-flash';
    } catch {
      return 'gemini-3.8-flash';
    }
  });

  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'goals' | 'analytics' | 'chat'>('tasks');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [preselectedGoalId, setPreselectedGoalId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const [prioritizationResult, setPrioritizationResult] = useState<PrioritizationResult | null>(null);

  // AI Schedule Proposal States
  const [scheduleProposal, setScheduleProposal] = useState<ScheduleProposal | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isApplyingSchedule, setIsApplyingSchedule] = useState(false);

  // Chat States & Persistence
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHAT);
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: 'Здравствуйте! Я ваш персональный ИИ-ассистент по планированию. Я могу составить расписание исходя из ваших целей, скорректировать дедлайны для задач или создать новые цели и задачи по вашей команде.',
          timestamp: new Date().toISOString(),
        },
      ];
    } catch {
      return [];
    }
  });
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEEPSEEK_KEY, customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Derived Calendar Events from tasks
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const goalMap = new Map<string, Goal>(goals.map(g => [g.id, g]));
    return tasks
      .filter(t => t.scheduledStart && t.scheduledEnd)
      .map(t => {
        const goal = t.goalId ? goalMap.get(t.goalId) : null;
        return {
          id: `ev-${t.id}`,
          taskId: t.id,
          title: t.title,
          goalTitle: goal ? goal.title : 'Общее',
          goalColor: goal ? goal.color : '#64748b',
          start: t.scheduledStart!,
          end: t.scheduledEnd!,
          durationMinutes: t.durationMinutes,
          priority: t.priority,
          significanceScore: t.significanceScore,
          energyLevel: t.energyLevel,
          status: t.status,
        };
      });
  }, [tasks, goals]);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Real-time AI Prioritization function
  const handleTriggerAI = async () => {
    setIsPrioritizing(true);
    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          goals,
          selectedModel,
          customApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data: PrioritizationResult = await response.json();
      if (data.updatedTasks && Array.isArray(data.updatedTasks)) {
        setTasks(data.updatedTasks);
        setPrioritizationResult(data);
        showNotification(
          `Приоритизация ИИ (${data.modelUsed}) завершена! Значимость задач пересчитана.`,
          'success'
        );
      }
    } catch (err: any) {
      console.warn('AI Prioritization error, using local heuristics:', err.message);
      // Local fallback distribution
      const goalMap = new Map<string, Goal>(goals.map(g => [g.id, g]));
      const recalculated = tasks.map(task => {
        const goal = task.goalId ? goalMap.get(task.goalId) : null;
        const gWeight = goal ? goal.weight : 3;
        const score = Math.min(100, Math.round((gWeight / 10) * 75 + (task.energyLevel === 'high' ? 20 : 10)));
        return {
          ...task,
          significanceScore: score,
          priority: score >= 85 ? ('P1' as const) : score >= 70 ? ('P2' as const) : ('P3' as const),
          aiReasoning: goal
            ? `Связано с целью "${goal.title}" (вес ${gWeight}/10). Приоритет рассчитан локальным движком GoalFlow.`
            : 'Операционная задача без привязки к ключевым целям.',
        };
      });
      setTasks(recalculated);
      showNotification('Приоритеты обновлены локальным эвристическим движком.', 'info');
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Auto-distribute tasks onto calendar slots
  const handleAutoSchedule = () => {
    const { scheduledTasks, events } = autoDistributeTasksToCalendar(tasks, goals, config);
    setTasks(scheduledTasks);
    showNotification(
      `Умное авто-распределение: ${events.length} задач запланировано в календарь с учетом утреннего пика фокуса!`,
      'success'
    );
  };

  // Request AI-Driven Schedule & Goal-Based Deadlines (Proposal with user confirmation)
  const handleRequestScheduleProposal = async () => {
    setIsGeneratingSchedule(true);
    try {
      const response = await fetch('/api/ai/propose-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          goals,
          config,
          selectedModel,
          customApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const proposalData: ScheduleProposal = await response.json();
      setScheduleProposal(proposalData);
      setIsScheduleModalOpen(true);
    } catch (err: any) {
      console.warn('AI schedule API error, generating heuristic proposal:', err.message);
      const fallbackProposal = generateHeuristicScheduleProposal(tasks, goals, config);
      setScheduleProposal(fallbackProposal);
      setIsScheduleModalOpen(true);
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // User confirmed the AI schedule proposal!
  const handleConfirmScheduleProposal = (acceptedProposals: ProposedTaskSchedule[]) => {
    setIsApplyingSchedule(true);
    try {
      const proposalMap = new Map<string, ProposedTaskSchedule>(
        acceptedProposals.map(p => [p.taskId, p])
      );

      const updated = tasks.map(task => {
        const p = proposalMap.get(task.id);
        if (!p) return task;
        return {
          ...task,
          deadline: p.proposedDeadline,
          scheduledStart: p.proposedStart,
          scheduledEnd: p.proposedEnd,
          status: 'scheduled' as const,
          significanceScore: p.significanceScore || task.significanceScore,
          aiReasoning: p.reasoning || task.aiReasoning,
        };
      });

      setTasks(updated);
      setIsScheduleModalOpen(false);
      showNotification(
        `План утвержден! Обновлены дедлайны и расписание для ${acceptedProposals.length} задач.`,
        'success'
      );
    } catch (err: any) {
      showNotification('Ошибка при сохранении расписания', 'error');
    } finally {
      setIsApplyingSchedule(false);
    }
  };

  // AI Chat message sender
  const handleSendMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: chatMessages,
          tasks,
          goals,
          selectedModel,
          customApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat error ${response.status}`);
      }

      const resData = await response.json();
      let actionResultDetails: { type: any; details: string } | undefined;

      // Handle executed actions from AI
      if (resData.command?.action === 'propose_schedule') {
        handleRequestScheduleProposal();
        actionResultDetails = {
          type: 'schedule_proposed',
          details: 'Подготовлен проект расписания и дедлайнов (открыто окно подтверждения)',
        };
      } else if (resData.command?.action === 'create_task' && resData.command.params?.title) {
        const p = resData.command.params;
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: p.title,
          durationMinutes: p.durationMinutes || 45,
          energyLevel: p.energyLevel || 'medium',
          priority: p.priority || 'P2',
          status: 'todo',
          goalId: p.goalId || goals[0]?.id || null,
          significanceScore: 75,
          goalAlignmentPercent: 80,
          eisenhowerQuadrant: 'schedule',
          createdAt: new Date().toISOString(),
        };
        setTasks(prev => [newTask, ...prev]);
        actionResultDetails = {
          type: 'task_created',
          details: `Создана задача: "${newTask.title}" (${newTask.durationMinutes} мин)`,
        };
      } else if (resData.command?.action === 'create_goal' && resData.command.params?.title) {
        const p = resData.command.params;
        const newGoal: Goal = {
          id: `goal-${Date.now()}`,
          title: p.title,
          description: p.description || 'Создано через диалог с ИИ',
          category: p.category || 'business',
          targetDate: p.targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          weight: p.weight || 8,
          color: '#4f46e5',
          progress: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        setGoals(prev => [...prev, newGoal]);
        actionResultDetails = {
          type: 'goal_created',
          details: `Создана цель: "${newGoal.title}" (Вес ${newGoal.weight}/10)`,
        };
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: resData.reply || 'Действие выполнено.',
        timestamp: new Date().toISOString(),
        actionResult: actionResultDetails,
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: 'Я готов помочь вам с планированием расписания и дедлайнов. Нажмите "Составить расписание и дедлайны", чтобы запустить расчет.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleClearChatHistory = () => {
    localStorage.removeItem(STORAGE_KEYS.CHAT);
    setChatMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        text: 'История очищена. Чем я могу помочь вам сейчас?',
        timestamp: new Date().toISOString(),
      },
    ]);
    showNotification('История чата очищена', 'info');
  };

  // Schedule single task
  const handleScheduleSingleTask = (taskId: string, dateStr: string, hour: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const start = new Date(`${dateStr}T${hour < 10 ? `0${hour}` : hour}:00:00`);
    const end = new Date(start.getTime() + task.durationMinutes * 60 * 1000);

    const updated = tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: 'scheduled' as const,
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
          }
        : t
    );
    setTasks(updated);
    showNotification(`Задача "${task.title}" поставлена в календарь на ${hour}:00`, 'success');
  };

  // Export to .ics
  const handleExportICS = () => {
    if (calendarEvents.length === 0) {
      showNotification('Сначала распределите задачи в календарь перед экспортом', 'info');
      return;
    }
    const icsContent = generateICalFile(calendarEvents, 'GoalFlow AI Schedule');
    downloadFile(icsContent, `goalflow-schedule-${new Date().toISOString().split('T')[0]}.ics`);
    showNotification('Файл .ICS успешно скачан! Вы можете импортировать его в Google / Apple Calendar', 'success');
  };

  // Task Handlers
  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
    showNotification(`Задача "${newTask.title}" создана`, 'success');
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    showNotification('Задача обновлена', 'success');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    showNotification('Задача удалена', 'info');
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const isNowCompleted = t.status !== 'completed';
        return {
          ...t,
          status: isNowCompleted ? ('completed' as const) : ('todo' as const),
        };
      })
    );
  };

  // Goal Handlers
  const handleAddGoal = (newGoalData: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...newGoalData,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setGoals(prev => [...prev, newGoal]);
    showNotification(`Цель "${newGoal.title}" создана (Стратегический вес: ${newGoal.weight})`, 'success');
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(g => (g.id === updatedGoal.id ? updatedGoal : g)));
    showNotification('Цель обновлена', 'success');
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    // Remove link from tasks
    setTasks(prev => prev.map(t => (t.goalId === goalId ? { ...t, goalId: null } : t)));
    showNotification('Цель удалена, связанные задачи переведены в операционные', 'info');
  };

  const handleQuickAddTaskForGoal = (goalId: string) => {
    setPreselectedGoalId(goalId);
    setActiveTab('tasks');
  };

  const handleResetSampleData = () => {
    setGoals(INITIAL_GOALS);
    setTasks(INITIAL_TASKS);
    setConfig(DEFAULT_SCHEDULE_CONFIG);
    setPrioritizationResult(null);
    showNotification('Демонстрационные цели и задачи восстановлены!', 'success');
  };

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      } flex flex-col selection:bg-indigo-500 selection:text-white pb-20 md:pb-6 transition-colors duration-200`}
    >
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onPrioritize={handleTriggerAI}
        onProposeSchedule={handleRequestScheduleProposal}
        onAutoSchedule={handleAutoSchedule}
        onExportICS={handleExportICS}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isPrioritizing={isPrioritizing}
        isGeneratingSchedule={isGeneratingSchedule}
        tasksCount={tasks.length}
        goalsCount={goals.length}
        chatMessagesCount={chatMessages.length}
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-xl border border-slate-800 dark:border-slate-700 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Floating Quick AI Chat Button (desktop only, since mobile has chat in bottom bar) */}
      {activeTab !== 'chat' && (
        <button
          id="btn-quick-open-chat"
          onClick={() => setActiveTab('chat')}
          title="Открыть диалог с ИИ"
          className="hidden md:flex fixed bottom-6 left-6 z-40 items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-105 border border-indigo-500 min-h-[44px]"
        >
          <Bot className="w-4 h-4" />
          <span>Чат с ИИ</span>
          {chatMessages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            goals={goals}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onTriggerAI={handleTriggerAI}
            onProposeSchedule={handleRequestScheduleProposal}
            isPrioritizing={isPrioritizing}
            preselectedGoalId={preselectedGoalId}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            events={calendarEvents}
            tasks={tasks}
            goals={goals}
            config={config}
            onAutoSchedule={handleAutoSchedule}
            onProposeSchedule={handleRequestScheduleProposal}
            onExportICS={handleExportICS}
            onScheduleSingleTask={handleScheduleSingleTask}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            goals={goals}
            tasks={tasks}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onQuickAddTaskForGoal={handleQuickAddTaskForGoal}
          />
        )}

        {activeTab === 'chat' && (
          <AIChatView
            messages={chatMessages}
            isSending={isSendingChat}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearChatHistory}
            onRequestScheduleProposal={handleRequestScheduleProposal}
            tasks={tasks}
            goals={goals}
            selectedModel={selectedModel}
            onQuickAddTask={(title, duration, goalId) => {
              handleAddTask({
                title,
                durationMinutes: duration,
                goalId: goalId || null,
                energyLevel: 'medium',
                status: 'todo',
                priority: 'P2',
                significanceScore: 70,
                deadline: null,
                eisenhowerQuadrant: 'schedule',
                goalAlignmentPercent: 70,
                aiReasoning: 'Добавлено через чат с ИИ GoalFlow',
              });
            }}
            onQuickAddGoal={(title, weight, targetDate) => {
              handleAddGoal({
                title,
                description: 'Создано через диалог с ИИ GoalFlow',
                category: 'business',
                weight,
                targetDate,
                color: '#6366f1',
                progress: 0,
                status: 'active',
              });
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AIThinkingView
            result={prioritizationResult}
            goals={goals}
            tasks={tasks}
            onTriggerAI={handleTriggerAI}
            isPrioritizing={isPrioritizing}
          />
        )}
      </main>

      {/* Mobile Glass Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/85 dark:bg-slate-950/85 border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl px-1.5 py-1 flex items-center justify-around pb-safe transition-colors"
      >
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] min-h-[44px] ${
            activeTab === 'tasks'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5" />
            {tasks.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold leading-tight">
                {tasks.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Задачи</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] min-h-[44px] ${
            activeTab === 'calendar'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Календарь</span>
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] min-h-[44px] ${
            activeTab === 'goals'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Target className="w-5 h-5" />
            {goals.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold leading-tight">
                {goals.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Цели</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] min-h-[44px] relative ${
            activeTab === 'chat'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Чат ИИ</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] min-h-[44px] ${
            activeTab === 'analytics'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Мышление</span>
        </button>
      </nav>

      {/* Schedule Proposal Modal with User Confirmation */}
      <ScheduleProposalModal
        isOpen={isScheduleModalOpen}
        proposal={scheduleProposal}
        tasks={tasks}
        goals={goals}
        onClose={() => setIsScheduleModalOpen(false)}
        onConfirm={handleConfirmScheduleProposal}
        isApplying={isApplyingSchedule}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        config={config}
        onUpdateConfig={setConfig}
        customApiKey={customApiKey}
        onUpdateApiKey={setCustomApiKey}
        onResetSampleData={handleResetSampleData}
      />
    </div>
  );

}
