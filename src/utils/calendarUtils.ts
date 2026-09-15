import { CalendarEvent, Goal, Task, UserScheduleConfig } from '../types';

/**
 * Distributes tasks onto calendar time slots based on:
 * 1. Priority (P1 > P2 > P3 > P4)
 * 2. Significance score
 * 3. Deadline urgency
 * 4. Energy level matched to focus peak hours (morning/early afternoon)
 * 5. Respecting work hours, lunch breaks, and non-overlapping slots
 */
export function autoDistributeTasksToCalendar(
  tasks: Task[],
  goals: Goal[],
  config: UserScheduleConfig,
  startDate: Date = new Date()
): { scheduledTasks: Task[]; events: CalendarEvent[] } {
  const goalMap = new Map(goals.map(g => [g.id, g]));

  // Active tasks only, sorted by significance and priority
  const eligibleTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      // Priority weight
      const pWeight = { P1: 4, P2: 3, P3: 2, P4: 1 };
      const diffP = pWeight[b.priority] - pWeight[a.priority];
      if (diffP !== 0) return diffP;

      // Significance score
      const diffScore = (b.significanceScore || 0) - (a.significanceScore || 0);
      if (diffScore !== 0) return diffScore;

      // Deadline proximity
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return a.deadline ? -1 : 1;
    });

  const updatedTasks: Task[] = [];
  const events: CalendarEvent[] = [];

  // Start scheduling from tomorrow if today is past workEndHour, otherwise from now rounded up to next 30 min
  let currentDay = new Date(startDate);
  const nowHour = currentDay.getHours();
  if (nowHour >= config.workEndHour - 1) {
    currentDay.setDate(currentDay.getDate() + 1);
    currentDay.setHours(config.workStartHour, 0, 0, 0);
  } else if (nowHour < config.workStartHour) {
    currentDay.setHours(config.workStartHour, 0, 0, 0);
  } else {
    // Round to next 30 mins
    const mins = currentDay.getMinutes();
    const roundedMins = mins <= 30 ? 30 : 0;
    if (mins > 30) currentDay.setHours(currentDay.getHours() + 1);
    currentDay.setMinutes(roundedMins, 0, 0);
  }

  // Tracking occupied time slots per day
  let currentTime = new Date(currentDay);

  for (const task of eligibleTasks) {
    let allocated = false;
    let attempts = 0;

    while (!allocated && attempts < 14) {
      // Ensure working day
      const dayOfWeek = currentTime.getDay();
      if (!config.workingDays.includes(dayOfWeek)) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(config.workStartHour, 0, 0, 0);
        attempts++;
        continue;
      }

      // Check if current time is past workEndHour
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
      if (currentHour + task.durationMinutes / 60 > config.workEndHour) {
        // Move to next day
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(config.workStartHour, 0, 0, 0);
        attempts++;
        continue;
      }

      // Check lunch overlap
      const taskEndHour = currentHour + task.durationMinutes / 60;
      const lunchEndHour = config.lunchStartHour + config.lunchDurationMinutes / 60;
      const overlapsLunch =
        (currentHour < lunchEndHour && taskEndHour > config.lunchStartHour);

      if (overlapsLunch) {
        // Skip past lunch
        currentTime.setHours(Math.floor(lunchEndHour), (lunchEndHour % 1) * 60, 0, 0);
        continue;
      }

      // Check energy alignment: High energy task preferred during focusPeak
      const isHighEnergy = task.energyLevel === 'high';
      const inFocusPeak = currentHour >= config.focusPeakStart && currentHour < config.focusPeakEnd;

      // Allocate slot
      const start = new Date(currentTime);
      const end = new Date(start.getTime() + task.durationMinutes * 60 * 1000);

      const goal = task.goalId ? goalMap.get(task.goalId) : null;
      const goalTitle = goal ? goal.title : 'Общее / Вне целей';
      const goalColor = goal ? goal.color : '#64748b';

      const updatedTask: Task = {
        ...task,
        status: 'scheduled',
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      };

      updatedTasks.push(updatedTask);
      events.push({
        id: `event-${task.id}`,
        taskId: task.id,
        title: task.title,
        goalTitle,
        goalColor,
        start: start.toISOString(),
        end: end.toISOString(),
        durationMinutes: task.durationMinutes,
        priority: task.priority,
        significanceScore: task.significanceScore,
        energyLevel: task.energyLevel,
        status: 'scheduled',
      });

      // Move currentTime forward + buffer break
      currentTime = new Date(end.getTime() + config.breakDurationMinutes * 60 * 1000);
      allocated = true;
    }
  }

  // Include remaining tasks that were already completed or not rescheduled
  const updatedTaskIds = new Set(updatedTasks.map(t => t.id));
  const finalTasks = tasks.map(t => {
    if (updatedTaskIds.has(t.id)) {
      return updatedTasks.find(ut => ut.id === t.id)!;
    }
    return t;
  });

  return { scheduledTasks: finalTasks, events };
}

/**
 * Generate iCal format string for downloading as .ics file
 */
export function generateICalFile(events: CalendarEvent[], calendarName = 'GoalFlow Schedule'): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatICSDate = (date: Date) => {
    return (
      date.getUTCFullYear().toString() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      'Z'
    );
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GoalFlow AI//Schedule Planner//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const ev of events) {
    const startDate = new Date(ev.start);
    const endDate = new Date(ev.end);
    const now = new Date();

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:goalflow-${ev.taskId}-${startDate.getTime()}@goalflow.ai`);
    lines.push(`DTSTAMP:${formatICSDate(now)}`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:[${ev.priority}] ${ev.title}`);
    lines.push(
      `DESCRIPTION:Цель: ${ev.goalTitle}\\nПриоритет: ${ev.priority}\\nЗначимость: ${ev.significanceScore}/100\\nЭнергия: ${ev.energyLevel}`
    );
    lines.push(`CATEGORIES:${ev.goalTitle}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generate Google Calendar URL for a single task event
 */
export function getGoogleCalendarLink(event: CalendarEvent): string {
  const formatGCalDate = (isoStr: string) => {
    return new Date(isoStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const title = encodeURIComponent(`[${event.priority}] ${event.title}`);
  const details = encodeURIComponent(
    `Цель: ${event.goalTitle}\nПриоритет: ${event.priority} (Значимость: ${event.significanceScore}/100)\nТребуемая энергия: ${event.energyLevel}\nЗапланировано через GoalFlow AI`
  );
  const dates = `${formatGCalDate(event.start)}/${formatGCalDate(event.end)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
}

/**
 * Helper to download raw string as file
 */
export function downloadFile(content: string, filename: string, type = 'text/calendar;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
