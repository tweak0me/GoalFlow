import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Check,
  X,
  ArrowRight,
  Flame,
  Target,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Filter,
} from 'lucide-react';
import { ScheduleProposal, ProposedTaskSchedule } from '../types';

interface ScheduleProposalModalProps {
  proposal: ScheduleProposal | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (acceptedProposals: ProposedTaskSchedule[]) => void;
  isApplying?: boolean;
}

export const ScheduleProposalModal: React.FC<ScheduleProposalModalProps> = ({
  proposal,
  isOpen,
  onClose,
  onConfirm,
  isApplying = false,
}) => {
  if (!isOpen || !proposal) return null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(proposal.proposals.map(p => p.taskId));
  });

  const toggleTask = (taskId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(proposal.proposals.map(p => p.taskId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    const accepted = proposal.proposals.filter(p => selectedIds.has(p.taskId));
    onConfirm(accepted);
  };

  const acceptedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl max-w-3xl w-full my-4 sm:my-8 p-4 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 sm:pb-5">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none shrink-0">
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/60">
                  План утверждения
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{proposal.modelUsed}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ИИ-План Расписания и Дедлайнов
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                ИИ рассчитал оптимальные дедлайны для задач исходя из веса целей и зарезервировал слоты в календаре.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strategy Summary Box */}
        <div className="bg-gradient-to-r from-indigo-50/80 to-amber-50/60 dark:from-indigo-950/50 dark:to-amber-950/40 rounded-2xl p-3.5 sm:p-4 my-3 sm:my-4 border border-indigo-100/80 dark:border-indigo-800/60">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">
                Обоснование ИИ-стратегии
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {proposal.summary}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                {proposal.strategyExplanation}
              </p>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Выбрано: {acceptedCount} из {proposal.proposals.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
            >
              Выбрать все
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
            >
              Снять все
            </button>
          </div>
        </div>

        {/* Scrollable Proposals List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[200px]">
          {proposal.proposals.map(item => {
            const isSelected = selectedIds.has(item.taskId);
            const slotDate = new Date(item.proposedStart);
            const slotEndDate = new Date(item.proposedEnd);

            return (
              <div
                key={item.taskId}
                onClick={() => toggleTask(item.taskId)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500/80 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTask(item.taskId)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 accent-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 shrink-0"
                  />

                  <div className="flex-1 space-y-2">
                    {/* Top Row: Priority & Goal */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            item.priority === 'P1'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : item.priority === 'P2'
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.priority} (Значимость {item.significanceScore}/100)
                        </span>

                        {item.goalTitle && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${item.goalColor || '#4f46e5'}20`,
                              color: item.goalColor || '#4f46e5',
                            }}
                          >
                            <Target className="w-3 h-3" />
                            <span>{item.goalTitle}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Title */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.taskTitle}
                    </h3>

                    {/* Deadline Comparison & Calendar Slot Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {/* Deadline Change */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Дедлайн:</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className={item.currentDeadline ? 'text-slate-400 line-through' : 'text-slate-400 dark:text-slate-500'}>
                            {item.currentDeadline ? new Date(item.currentDeadline).toLocaleDateString('ru-RU') : 'не задан'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-indigo-500" />
                          <span className="text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/60 font-bold">
                            {new Date(item.proposedDeadline).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>

                      {/* Time slot in Calendar */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          <span>Слот:</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {slotDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {', '}
                          {slotDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {slotEndDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* AI Reasoning Quote */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                      💡 {item.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11px] sm:text-xs">Дедлайны и тайм-блоки будут обновлены только после утверждения.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[40px]"
            >
              Отклонить
            </button>

            <button
              type="button"
              disabled={acceptedCount === 0 || isApplying}
              onClick={handleApply}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[40px]"
            >
              <Check className="w-4 h-4" />
              <span>
                {isApplying
                  ? 'Применение...'
                  : `Применить расписание (${acceptedCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
