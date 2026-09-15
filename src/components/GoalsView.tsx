import React, { useState } from 'react';
import { Target, Plus, Calendar, Clock, BarChart3, Edit3, Trash2, CheckCircle2, Flame, Award } from 'lucide-react';
import { Goal, GoalCategory, Task } from '../types';

interface GoalsViewProps {
  goals: Goal[];
  tasks: Task[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onQuickAddTaskForGoal: (goalId: string) => void;
}

const CATEGORY_NAMES: Record<GoalCategory, string> = {
  business: 'Бизнес & Продукт',
  career: 'Карьера',
  health: 'Здоровье & Спорт',
  finance: 'Финансы',
  education: 'Обучение & Навыки',
  personal: 'Личное развитие',
};

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  tasks,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onQuickAddTaskForGoal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('business');
  const [weight, setWeight] = useState(8);
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [progress, setProgress] = useState(0);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('business');
    setWeight(8);
    // Default 30 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setTargetDate(d.toISOString().split('T')[0]);
    setColor('#4f46e5');
    setProgress(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description);
    setCategory(goal.category);
    setWeight(goal.weight);
    setTargetDate(goal.targetDate);
    setColor(goal.color);
    setProgress(goal.progress);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingGoal) {
      onUpdateGoal({
        ...editingGoal,
        title: title.trim(),
        description: description.trim(),
        category,
        weight,
        targetDate,
        color,
        progress,
      });
    } else {
      onAddGoal({
        title: title.trim(),
        description: description.trim(),
        category,
        weight,
        targetDate: targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        color,
        progress,
        status: 'active',
      });
    }
    setIsModalOpen(false);
  };

  // Stats calculation
  const totalTasks = tasks.length;
  const tasksWithGoals = tasks.filter(t => t.goalId).length;
  const alignmentRate = totalTasks > 0 ? Math.round((tasksWithGoals / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <Target className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Стратегический компас</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Ключевые Цели и Веса Значимости</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            ИИ автоматически распределяет значимость ваших ежедневных задач и планирует их в календарь, основываясь на стратегическом весе (1-10) каждой цели.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-slate-50/80 dark:bg-slate-800/80 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 border border-slate-200/80 dark:border-slate-700/80 text-center">
            <span className="block text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Связность задач</span>
            <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">{alignmentRate}%</span>
          </div>
          <button
            id="btn-add-goal"
            onClick={handleOpenAdd}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-sm transition-all min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Создать цель</span>
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {goals.map(goal => {
          const linkedTasks = tasks.filter(t => t.goalId === goal.id);
          const completedTasks = linkedTasks.filter(t => t.status === 'completed');
          const totalHours = Math.round(
            (linkedTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) / 60) * 10
          ) / 10;
          const avgScore =
            linkedTasks.length > 0
              ? Math.round(
                  linkedTasks.reduce((acc, t) => acc + (t.significanceScore || 0), 0) / linkedTasks.length
                )
              : 0;

          // Days remaining calculation
          const target = new Date(goal.targetDate);
          const now = new Date();
          const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          return (
            <div
              key={goal.id}
              id={`goal-card-${goal.id}`}
              className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-800"
                      style={{ backgroundColor: goal.color }}
                    />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {CATEGORY_NAMES[goal.category] || goal.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      title="Стратегический вес цели (влияет на расчет приоритетов ИИ)"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
                    >
                      <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Вес: {goal.weight}/10
                    </span>

                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="p-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Редактировать цель"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoalToDelete(goal)}
                        className="p-1.5 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Удалить цель"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug mb-1">{goal.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">{goal.description}</p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-medium">Прогресс цели</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/80 dark:bg-slate-800/70 rounded-xl p-3 border border-slate-100 dark:border-slate-700/60 mb-4 text-center">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] sm:text-xs block">Задач</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {completedTasks.length}/{linkedTasks.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] sm:text-xs block">Времени</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">{totalHours} ч</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] sm:text-xs block">ИИ-значимость</span>
                    <span className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">{avgScore}/100</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="text-[11px] sm:text-xs">
                    Срок: {new Date(goal.targetDate).toLocaleDateString('ru-RU')} ({diffDays > 0 ? `${diffDays} дн.` : 'просрочено'})
                  </span>
                </div>

                <button
                  onClick={() => onQuickAddTaskForGoal(goal.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors p-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить задачу</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
              {editingGoal ? 'Редактировать стратегическую цель' : 'Создать новую цель'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Название цели *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Например: Запуск нового продукта или Регулярный спорт"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Описание и критерии успеха
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Что конкретно считается достижением цели?"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as GoalCategory)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="business">Бизнес & Продукт</option>
                    <option value="career">Карьера</option>
                    <option value="health">Здоровье & Спорт</option>
                    <option value="finance">Финансы</option>
                    <option value="education">Обучение & Навыки</option>
                    <option value="personal">Личное</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Срок достижения
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Strategic Weight Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Стратегический вес цели: {weight}/10
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {weight >= 9 ? 'Критический фокус' : weight >= 7 ? 'Высокая важность' : 'Базовый приоритет'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={weight}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  ИИ распределяет приоритеты задач прямо пропорционально этому весу.
                </p>
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Текущий прогресс: {progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={e => setProgress(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Цветная метка цели
                </label>
                <div className="flex items-center gap-2">
                  {['#4f46e5', '#059669', '#ea580c', '#0284c7', '#d946ef', '#f59e0b'].map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        color === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[40px]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all min-h-[40px]"
                >
                  {editingGoal ? 'Сохранить изменения' : 'Создать цель'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* In-app Goal Deletion Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center border border-rose-100 dark:border-rose-900/60">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Удалить цель?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Действие нельзя отменить</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              Вы собираетесь удалить стратегическую цель <strong className="text-slate-900 dark:text-white font-semibold">«{goalToDelete.title}»</strong>.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/60 rounded-xl p-3 border border-amber-200/70 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 mb-5">
              Связанные с этой целью задачи <strong>не будут удалены</strong> — они автоматически останутся в списке как общие операционные задачи.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[40px]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteGoal(goalToDelete.id);
                  setGoalToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors min-h-[40px]"
              >
                Удалить цель
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
