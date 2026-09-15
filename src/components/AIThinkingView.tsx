import React from 'react';
import {
  BrainCircuit,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { Goal, PrioritizationResult, Task } from '../types';

interface AIThinkingViewProps {
  result: PrioritizationResult | null;
  goals: Goal[];
  tasks: Task[];
  onTriggerAI: () => void;
  isPrioritizing: boolean;
}

export const AIThinkingView: React.FC<AIThinkingViewProps> = ({
  result,
  goals,
  tasks,
  onTriggerAI,
  isPrioritizing,
}) => {
  const goalMap = new Map(goals.map(g => [g.id, g]));

  // Calculate time distribution by goal
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);

  const goalStats = goals.map(goal => {
    const related = tasks.filter(t => t.goalId === goal.id);
    const completed = related.filter(t => t.status === 'completed');
    const mins = related.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const percent = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
    const avgScore =
      related.length > 0
        ? Math.round(related.reduce((sum, t) => sum + (t.significanceScore || 0), 0) / related.length)
        : 0;

    return {
      goal,
      taskCount: related.length,
      completedCount: completed.length,
      allocatedMinutes: mins,
      percentOfTotal: percent,
      avgSignificance: avgScore,
    };
  });

  const unassignedTasks = tasks.filter(t => !t.goalId);
  const unassignedMinutes = unassignedTasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  const unassignedPercent = totalMinutes > 0 ? Math.round((unassignedMinutes / totalMinutes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              DeepSeek & Gemini High Thinking Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Рассуждения ИИ и Анализ Баланса</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Прозрачная аналитика цепочки логических рассуждений (Chain of Thought): почему задачи получили именно такой приоритет и как распределено ваше время между ключевыми целями.
          </p>
        </div>

        <button
          onClick={onTriggerAI}
          disabled={isPrioritizing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isPrioritizing ? 'animate-spin' : ''}`} />
          <span>{isPrioritizing ? 'Анализ рассуждений...' : 'Обновить анализ'}</span>
        </button>
      </div>

      {/* Model & Thinking Chain Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Модель: {result?.modelUsed || 'DeepSeek Reasoner (R1) & Gemini 3.1 Pro Thinking'}
              </h3>
              <p className="text-xs text-slate-500">
                {result?.timestamp
                  ? `Последняя приоритизация: ${new Date(result.timestamp).toLocaleTimeString('ru-RU')}`
                  : 'Готово к запуску'}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Реальное время
          </span>
        </div>

        {/* AI Summary */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Стратегическое резюме
              </h4>
              <p className="text-sm text-slate-800 leading-relaxed">
                {result?.summary ||
                  'Задачи сбалансированы по матрице целей. Высокоприоритетные задачи P1 требуют пиковой утренней концентрации, а рутинные операции вынесены во вторую половину дня.'}
              </p>
            </div>
          </div>
        </div>

        {/* Chain of Thought */}
        {result?.thinkingProcess && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
              Цепочка логических рассуждений модели (Reasoning Trace)
            </h4>
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
              {result.thinkingProcess}
            </div>
          </div>
        )}

        {/* Strategic Advice Pills */}
        {result?.strategicAdvice && result.strategicAdvice.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Рекомендации по балансу и тайм-менеджменту
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.strategicAdvice.map((advice, i) => (
                <div
                  key={i}
                  className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/60 text-xs text-slate-800 flex items-start gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{advice}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goal Allocation Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Распределение времени по целям (Goal Time Allocation)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Проверьте, соответствует ли процент потраченного времени стратегическому весу ваших целей.
          </p>
        </div>

        {/* Goal Bars */}
        <div className="space-y-3">
          {goalStats.map(({ goal, taskCount, completedCount, allocatedMinutes, percentOfTotal, avgSignificance }) => (
            <div key={goal.id} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: goal.color }}
                  />
                  <span className="font-bold text-sm text-slate-900">{goal.title}</span>
                  <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                    Вес: {goal.weight}/10
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900">{percentOfTotal}% времени</span>
                  <span className="text-xs text-slate-400 ml-1.5">
                    ({Math.round((allocatedMinutes / 60) * 10) / 10} ч, {taskCount} задач)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentOfTotal}%`, backgroundColor: goal.color }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Выполнено: {completedCount} из {taskCount}</span>
                <span>Средний индекс значимости: <strong className="text-indigo-600">{avgSignificance}/100</strong></span>
              </div>
            </div>
          ))}

          {/* Unassigned row */}
          {unassignedTasks.length > 0 && (
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="font-bold text-sm text-slate-600">Вне стратегических целей (Операционка)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-700">{unassignedPercent}%</span>
                  <span className="text-xs text-slate-400 ml-1.5">
                    ({Math.round((unassignedMinutes / 60) * 10) / 10} ч, {unassignedTasks.length} задач)
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-400"
                  style={{ width: `${unassignedPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
