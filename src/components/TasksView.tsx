import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Flame,
  Zap,
  Coffee,
  Calendar,
  Clock,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import { EnergyLevel, Goal, Task, TaskPriority, EisenhowerQuadrant } from '../types';
import { getGoogleCalendarLink } from '../utils/calendarUtils';

interface TasksViewProps {
  tasks: Task[];
  goals: Goal[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onTriggerAI: () => void;
  onProposeSchedule?: () => void;
  isPrioritizing: boolean;
  preselectedGoalId?: string | null;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  goals,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onTriggerAI,
  onProposeSchedule,
  isPrioritizing,
  preselectedGoalId,
}) => {
  // Filters
  const [selectedGoalId, setSelectedGoalId] = useState<string>(preselectedGoalId || 'all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [expandedReasoningIds, setExpandedReasoningIds] = useState<Set<string>>(new Set());

  // Add Task form state
  const [newTitle, setNewTitle] = useState('');
  const [newGoalId, setNewGoalId] = useState<string>(goals[0]?.id || '');
  const [newDuration, setNewDuration] = useState<number>(60);
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Edit Task modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const goalMap = new Map<string, Goal>(goals.map(g => [g.id, g]));

  const toggleReasoning = (taskId: string) => {
    setExpandedReasoningIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const goal = newGoalId ? goalMap.get(newGoalId) : null;
    const goalWeight = goal ? goal.weight : 4;
    const estimatedSig = Math.min(100, Math.round((goalWeight / 10) * 70 + (newEnergy === 'high' ? 20 : 10)));

    onAddTask({
      title: newTitle.trim(),
      goalId: newGoalId || null,
      durationMinutes: newDuration,
      deadline: newDeadline || null,
      energyLevel: newEnergy,
      status: 'todo',
      priority: estimatedSig >= 85 ? 'P1' : estimatedSig >= 70 ? 'P2' : estimatedSig >= 50 ? 'P3' : 'P4',
      significanceScore: estimatedSig,
      eisenhowerQuadrant: estimatedSig >= 75 ? 'do_first' : 'schedule',
      goalAlignmentPercent: goal ? Math.round((goalWeight / 10) * 90) : 20,
      aiReasoning: goal
        ? `Связано с целью "${goal.title}" (вес ${goalWeight}/10). Нажмите "Приоритизация ИИ" для точного перерасчета.`
        : 'Задача вне стратегических целей.',
    });

    setNewTitle('');
    setNewDeadline('');
    setIsQuickAddOpen(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (selectedGoalId !== 'all') {
      if (selectedGoalId === 'none' && task.goalId !== null) return false;
      if (selectedGoalId !== 'none' && task.goalId !== selectedGoalId) return false;
    }
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const goal = task.goalId ? goalMap.get(task.goalId) : null;
      const matchGoal = goal?.title.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchGoal) return false;
    }
    return true;
  });

  // Sort by significance score descending
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return (b.significanceScore || 0) - (a.significanceScore || 0);
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'P1':
        return { label: 'P1 Критический', bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' };
      case 'P2':
        return { label: 'P2 Высокий', bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60' };
      case 'P3':
        return { label: 'P3 Средний', bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' };
      case 'P4':
        return { label: 'P4 Низкий', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
    }
  };

  const getEnergyIcon = (energy: EnergyLevel) => {
    switch (energy) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium" title="Высокая концентрация">
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Фокус</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium" title="Средняя нагрузка">
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Норма</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium" title="Низкая нагрузка / рутина">
            <Coffee className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Рутина</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Action & Quick Add Bar */}
      <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-0.5">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Динамический реестр</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Задачи и Индекс Значимости
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              id="btn-toggle-quick-add"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Новая задача</span>
            </button>

            {onProposeSchedule && (
              <button
                id="btn-tasks-propose-schedule"
                onClick={onProposeSchedule}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition-all min-h-[42px]"
                title="ИИ рассчитает дедлайны задач и расписание исходя из целей"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">ИИ-Дедлайны и план</span>
                <span className="sm:hidden">План</span>
              </button>
            )}

            <button
              id="btn-recalculate-priorities"
              onClick={onTriggerAI}
              disabled={isPrioritizing}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all min-h-[42px]"
            >
              <Sparkles className={`w-4 h-4 ${isPrioritizing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span>{isPrioritizing ? 'ИИ рассуждает...' : 'Приоритеты'}</span>
            </button>
          </div>
        </div>

        {/* Quick Add Form Drawer */}
        {isQuickAddOpen && (
          <form onSubmit={handleCreateTask} className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
              <div className="sm:col-span-2 md:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Название задачи *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Что необходимо сделать?"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Связанная цель
                </label>
                <select
                  value={newGoalId}
                  onChange={e => setNewGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Без цели (Операционная рутина)</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} (Вес: {g.weight})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Длительность
                </label>
                <select
                  value={newDuration}
                  onChange={e => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={15}>15 мин</option>
                  <option value={30}>30 мин</option>
                  <option value={45}>45 мин</option>
                  <option value={60}>1 час</option>
                  <option value={90}>1.5 часа</option>
                  <option value={120}>2 часа</option>
                  <option value={180}>3 часа</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Дедлайн
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Фокус:</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {(['high', 'medium', 'low'] as EnergyLevel[]).map(lvl => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setNewEnergy(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all min-h-[36px] ${
                        newEnergy === lvl
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {lvl === 'high' ? '🔥 Фокус' : lvl === 'medium' ? '⚡ Норма' : '☕ Рутина'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[38px]"
                >
                  Свернуть
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs min-h-[38px]"
                >
                  Добавить
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Filter and View Toggles Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по задачам, целям или тегам..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Goal Filter */}
          <select
            value={selectedGoalId}
            onChange={e => setSelectedGoalId(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none min-h-[40px]"
          >
            <option value="all">Все цели ({goals.length})</option>
            <option value="none">Без цели</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>
                🎯 {g.title}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none min-h-[40px]"
          >
            <option value="all">Все приоритеты</option>
            <option value="P1">P1 Критический</option>
            <option value="P2">P2 Высокий</option>
            <option value="P3">P3 Средний</option>
            <option value="P4">P4 Низкий</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              title="Список с расчетом значимости"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              title="Матрица Эйзенхауэра 2x2"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>


      {/* MATRIX VIEW (Eisenhower) */}
      {viewMode === 'matrix' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1: Do First */}
          <div className="backdrop-blur-md bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl p-4 border border-rose-200/70 dark:border-rose-900/50 flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                <h3 className="font-bold text-slate-900 dark:text-rose-200 text-sm">Сделать в первую очередь (P1)</h3>
              </div>
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md bg-rose-100/70 dark:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/60">
                Срочно & Критично
              </span>
            </div>
            <div className="space-y-2.5 flex-1">
              {sortedTasks
                .filter(t => t.eisenhowerQuadrant === 'do_first' || t.priority === 'P1')
                .map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    goal={t.goalId ? goalMap.get(t.goalId) : null}
                    isExpanded={expandedReasoningIds.has(t.id)}
                    onToggleReasoning={() => toggleReasoning(t.id)}
                    onToggleComplete={() => onToggleComplete(t.id)}
                    onEdit={() => setEditingTask(t)}
                    onDelete={() => onDeleteTask(t.id)}
                  />
                ))}
            </div>
          </div>

          {/* Q2: Schedule */}
          <div className="backdrop-blur-md bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-200/70 dark:border-indigo-900/50 flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
                <h3 className="font-bold text-slate-900 dark:text-indigo-200 text-sm">Запланировать в календарь (P2)</h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60">
                Важно & Стратегично
              </span>
            </div>
            <div className="space-y-2.5 flex-1">
              {sortedTasks
                .filter(t => t.eisenhowerQuadrant === 'schedule' && t.priority !== 'P1')
                .map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    goal={t.goalId ? goalMap.get(t.goalId) : null}
                    isExpanded={expandedReasoningIds.has(t.id)}
                    onToggleReasoning={() => toggleReasoning(t.id)}
                    onToggleComplete={() => onToggleComplete(t.id)}
                    onEdit={() => setEditingTask(t)}
                    onDelete={() => onDeleteTask(t.id)}
                  />
                ))}
            </div>
          </div>

          {/* Q3: Delegate */}
          <div className="backdrop-blur-md bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/70 dark:border-amber-900/50 flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                <h3 className="font-bold text-slate-900 dark:text-amber-200 text-sm">Делегировать / Оптимизировать (P3)</h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/60">
                Срочно, но рутинно
              </span>
            </div>
            <div className="space-y-2.5 flex-1">
              {sortedTasks
                .filter(t => t.eisenhowerQuadrant === 'delegate')
                .map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    goal={t.goalId ? goalMap.get(t.goalId) : null}
                    isExpanded={expandedReasoningIds.has(t.id)}
                    onToggleReasoning={() => toggleReasoning(t.id)}
                    onToggleComplete={() => onToggleComplete(t.id)}
                    onEdit={() => setEditingTask(t)}
                    onDelete={() => onDeleteTask(t.id)}
                  />
                ))}
            </div>
          </div>

          {/* Q4: Eliminate / Routine */}
          <div className="backdrop-blur-md bg-slate-100/60 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 shadow-xs" />
                <h3 className="font-bold text-slate-900 dark:text-slate-300 text-sm">Минимизировать / Позже (P4)</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700/60">
                Низкий приоритет
              </span>
            </div>
            <div className="space-y-2.5 flex-1">
              {sortedTasks
                .filter(t => t.eisenhowerQuadrant === 'eliminate' || t.priority === 'P4')
                .map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    goal={t.goalId ? goalMap.get(t.goalId) : null}
                    isExpanded={expandedReasoningIds.has(t.id)}
                    onToggleReasoning={() => toggleReasoning(t.id)}
                    onToggleComplete={() => onToggleComplete(t.id)}
                    onEdit={() => setEditingTask(t)}
                    onDelete={() => onDeleteTask(t.id)}
                  />
                ))}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2.5 sm:space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl p-10 sm:p-12 text-center border border-slate-200/80 dark:border-slate-800/80 transition-colors">
              <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Задачи не найдены</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                Попробуйте изменить фильтры или добавьте новую задачу для приоритизации ИИ.
              </p>
            </div>
          ) : (
            sortedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                goal={task.goalId ? goalMap.get(task.goalId) : null}
                isExpanded={expandedReasoningIds.has(task.id)}
                onToggleReasoning={() => toggleReasoning(task.id)}
                onToggleComplete={() => onToggleComplete(task.id)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
              Редактировать задачу
            </h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                onUpdateTask(editingTask);
                setEditingTask(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Название задачи
                </label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Связанная цель
                </label>
                <select
                  value={editingTask.goalId || ''}
                  onChange={e => setEditingTask({ ...editingTask, goalId: e.target.value || null })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Без цели</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} (Вес: {g.weight})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Длительность (мин)
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={editingTask.durationMinutes}
                    onChange={e =>
                      setEditingTask({ ...editingTask, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Дедлайн
                  </label>
                  <input
                    type="date"
                    value={editingTask.deadline ? editingTask.deadline.split('T')[0] : ''}
                    onChange={e => setEditingTask({ ...editingTask, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl min-h-[42px]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs min-h-[42px]"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Extracted Sub-Component for Clean Card Rendering with Glassmorphism & Dark Mode
interface TaskCardProps {
  task: Task;
  goal: Goal | null | undefined;
  isExpanded: boolean;
  onToggleReasoning: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  goal,
  isExpanded,
  onToggleReasoning,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const isCompleted = task.status === 'completed';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'from-rose-500 to-indigo-600 text-white shadow-rose-500/20';
    if (score >= 70) return 'from-indigo-500 to-indigo-700 text-white shadow-indigo-500/20';
    if (score >= 50) return 'from-amber-500 to-amber-600 text-white shadow-amber-500/20';
    return 'from-slate-400 to-slate-500 text-white';
  };

  const getPriorityStyle = (p: TaskPriority) => {
    switch (p) {
      case 'P1':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80';
      case 'P2':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80';
      case 'P3':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80';
      case 'P4':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80';
    }
  };

  return (
    <div
      id={`task-card-${task.id}`}
      className={`backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border transition-all ${
        isCompleted
          ? 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'
          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500/70 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Checkbox + Content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleComplete}
            title={isCompleted ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
            className="mt-0.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 p-1 -m-1"
          >
            {isCompleted ? (
              <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            {/* Title & Goal Tag */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4
                className={`text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug break-words ${
                  isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                }`}
              >
                {task.title}
              </h4>

              {goal && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${goal.color}20`,
                    color: goal.color,
                    borderColor: `${goal.color}40`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: goal.color }}
                  />
                  <span className="truncate max-w-[140px]">{goal.title}</span>
                </span>
              )}
            </div>

            {/* Description if present */}
            {task.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                {task.description}
              </p>
            )}

            {/* Metadata pills */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-2">
              {/* Priority badge */}
              <span
                className={`px-2 py-0.5 rounded-md font-semibold border ${getPriorityStyle(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>

              {/* Duration */}
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{task.durationMinutes} мин</span>
              </span>

              {/* Deadline */}
              {task.deadline && (
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>до {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
                </span>
              )}

              {/* Scheduled time block if scheduled */}
              {task.scheduledStart && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200/60 dark:border-emerald-800/60">
                  <span>
                    В календаре: {new Date(task.scheduledStart).toLocaleDateString('ru-RU', { weekday: 'short' })}{' '}
                    {new Date(task.scheduledStart).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              )}

              {/* Google Calendar Link */}
              {task.scheduledStart && (
                <a
                  href={getGoogleCalendarLink({
                    id: task.id,
                    taskId: task.id,
                    title: task.title,
                    goalTitle: goal?.title || 'Общее',
                    goalColor: goal?.color || '#6366f1',
                    start: task.scheduledStart,
                    end: task.scheduledEnd || task.scheduledStart,
                    durationMinutes: task.durationMinutes,
                    priority: task.priority,
                    significanceScore: task.significanceScore,
                    energyLevel: task.energyLevel,
                    status: task.status,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                  title="Открыть в Google Calendar"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Google Cal</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Significance Score Badge & Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Significance Gauge */}
          <div
            title={`Индекс значимости для целей: ${task.significanceScore}/100. Согласованность: ${task.goalAlignmentPercent}%`}
            className={`px-3 py-1.5 rounded-xl bg-gradient-to-br ${getScoreColor(
              task.significanceScore
            )} shadow-xs text-center flex flex-col items-center justify-center min-w-[58px]`}
          >
            <span className="text-[10px] uppercase font-bold opacity-80 leading-none">Индекс</span>
            <span className="text-sm sm:text-base font-extrabold leading-tight">
              {task.significanceScore}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <button
              onClick={onEdit}
              className="p-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
              title="Редактировать"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Reasoning Accordion */}
      {task.aiReasoning && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={onToggleReasoning}
            className="w-full flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium py-1"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Обоснование приоритизации ИИ</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100/80 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-200 space-y-1.5">
              <p>{task.aiReasoning}</p>
              <div className="flex items-center gap-3 pt-1 text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                <span>Согласованность с целями: {task.goalAlignmentPercent}%</span>
                <span>•</span>
                <span>Квадрант: {task.eisenhowerQuadrant}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

