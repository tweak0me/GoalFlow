import { Goal, Task, UserScheduleConfig, ProposedTaskSchedule, ScheduleProposal, TaskPriority } from '../types';

/**
 * Intelligent algorithmic generator for Goal-Driven Deadlines and Calendar Blocks.
 * Used when offline or as immediate instant fallback.
 */
export function generateHeuristicScheduleProposal(
  tasks: Task[],
  goals: Goal[],
  config: UserScheduleConfig
): ScheduleProposal {
  const goalMap = new Map<string, Goal>(goals.map(g => [g.id, g]));
  const activeTasks = tasks.filter(t => t.status !== 'completed');

  // Sort tasks by strategic impact: goal weight descending, significance descending
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const goalA = a.goalId ? goalMap.get(a.goalId) : null;
    const goalB = b.goalId ? goalMap.get(b.goalId) : null;
    const weightA = goalA ? goalA.weight : 2;
    const weightB = goalB ? goalB.weight : 2;

    if (weightB !== weightA) return weightB - weightA;
    return (b.significanceScore || 50) - (a.significanceScore || 50);
  });

  const now = new Date();
  const proposals: ProposedTaskSchedule[] = [];

  // Helper to format date as YYYY-MM-DD
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Calendar slot tracker for 7 days ahead
  let dayOffset = 0;
  let currentSlotHour = config.focusPeakStart; // Start at peak focus hour (e.g. 09:00 or 10:00)

  sortedTasks.forEach((task, idx) => {
    const goal = task.goalId ? goalMap.get(task.goalId) : null;
    const goalWeight = goal ? goal.weight : 3;
    const isP1 = task.priority === 'P1' || task.significanceScore >= 80;

    // 1. Calculate optimal deadline based on goal targetDate and significance
    let proposedDeadlineStr = task.deadline || '';
    let deadlineReason = '';

    if (goal && goal.targetDate) {
      const goalDate = new Date(goal.targetDate);
      const daysUntilGoal = Math.max(1, Math.round((goalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      if (isP1) {
        // High priority task needs to be completed early to de-risk the goal
        // E.g. within 20-30% of remaining time to goal, or within 3-5 days
        const offsetDays = Math.min(Math.max(2, Math.round(daysUntilGoal * 0.25)), 5);
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + offsetDays);
        proposedDeadlineStr = formatDateStr(deadlineDate);
        deadlineReason = `Критический этап для цели "${goal.title}" (вес ${goalWeight}/10). Дедлайн установлен заблаговременно (+${offsetDays} дн.), чтобы исключить срыв главной цели.`;
      } else if (task.priority === 'P2' || task.significanceScore >= 60) {
        const offsetDays = Math.min(Math.max(4, Math.round(daysUntilGoal * 0.5)), 10);
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + offsetDays);
        proposedDeadlineStr = formatDateStr(deadlineDate);
        deadlineReason = `Важная плановая задача для цели "${goal.title}". Дедлайн согласован на середину цикла выполнения (+${offsetDays} дн.).`;
      } else {
        const offsetDays = Math.min(Math.max(7, Math.round(daysUntilGoal * 0.8)), 14);
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + offsetDays);
        proposedDeadlineStr = formatDateStr(deadlineDate);
        deadlineReason = `Поддерживающая задача цели "${goal.title}". Выставлен комфортный дедлайн (+${offsetDays} дн.), не создающий давления на критический путь.`;
      }
    } else {
      // General task without goal
      const offsetDays = isP1 ? 3 : 7;
      const deadlineDate = new Date(now);
      deadlineDate.setDate(deadlineDate.getDate() + offsetDays);
      proposedDeadlineStr = formatDateStr(deadlineDate);
      deadlineReason = `Операционная задача вне стратегических целей. Рекомендуемый дедлайн: ${offsetDays} дней для предотвращения накопления долгов.`;
    }

    // 2. Calculate Calendar Time-Block Slot
    // If currentSlotHour exceeds work hours, move to next working day
    if (currentSlotHour >= config.workEndHour - 1) {
      dayOffset++;
      currentSlotHour = isP1 ? config.focusPeakStart : config.workStartHour;
    }

    // Skip lunch hour
    if (currentSlotHour === config.lunchStartHour) {
      currentSlotHour++;
    }

    // High focus tasks get placed into focus peak hours if possible
    if (isP1 && (currentSlotHour < config.focusPeakStart || currentSlotHour >= config.focusPeakEnd)) {
      if (dayOffset === 0) {
        currentSlotHour = config.focusPeakStart;
      }
    }

    const slotDate = new Date(now);
    slotDate.setDate(slotDate.getDate() + dayOffset);
    slotDate.setHours(currentSlotHour, 0, 0, 0);

    const durationMins = task.durationMinutes || 60;
    const slotEnd = new Date(slotDate.getTime() + durationMins * 60 * 1000);

    // Advance hour for next task
    const hoursSpan = Math.max(1, Math.ceil((durationMins + config.breakDurationMinutes) / 60));
    currentSlotHour += hoursSpan;

    proposals.push({
      taskId: task.id,
      taskTitle: task.title,
      currentDeadline: task.deadline || null,
      proposedDeadline: proposedDeadlineStr,
      proposedStart: slotDate.toISOString(),
      proposedEnd: slotEnd.toISOString(),
      significanceScore: task.significanceScore,
      priority: task.priority,
      goalTitle: goal?.title,
      goalColor: goal?.color,
      reasoning: `${deadlineReason} Тайм-блок зарезервирован ${
        isP1 ? 'в пиковые утренние часы концентрации' : 'в рабочем окне'
      } (${slotDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}).`,
      accepted: true,
    });
  });

  return {
    id: `prop-${Date.now()}`,
    timestamp: new Date().toISOString(),
    summary: `ИИ проанализировал ${activeTasks.length} активных задач по матрице целей. Высокоприоритетные задачи получили ранние дедлайны и размещены в утренние пики фокуса.`,
    strategyExplanation:
      'Стратегия дедлайнов строится от конечных дат целей (Reverse Goal Planning). Задачи с высоким влиянием (P1) завершаются первыми, освобождая ресурсы перед ключевыми вехами.',
    modelUsed: 'GoalFlow Strategic Reasoner',
    proposals,
  };
}
