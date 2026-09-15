import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Download,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { CalendarEvent, Goal, Task, UserScheduleConfig } from '../types';
import { getGoogleCalendarLink, downloadFile, generateICalFile } from '../utils/calendarUtils';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  goals: Goal[];
  config: UserScheduleConfig;
  onAutoSchedule: () => void;
  onProposeSchedule?: () => void;
  onExportICS: () => void;
  onScheduleSingleTask: (taskId: string, dateStr: string, hour: number) => void;
  onToggleComplete: (taskId: string) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  tasks,
  goals,
  config,
  onAutoSchedule,
  onProposeSchedule,
  onExportICS,
  onScheduleSingleTask,
  onToggleComplete,
}) => {
  const [viewType, setViewType] = useState<'week' | 'day'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const goalMap = new Map<string, Goal>(goals.map(g => [g.id, g]));

  // Get start of current week (Monday)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weekStart = getMonday(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewType === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const prevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (viewType === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const setToday = () => {
    setSelectedDate(new Date());
  };

  // Find events for a specific day and hour
  const getEventsForSlot = (dayDate: Date, hour: number) => {
    return events.filter(ev => {
      const evDate = new Date(ev.start);
      return (
        evDate.getFullYear() === dayDate.getFullYear() &&
        evDate.getMonth() === dayDate.getMonth() &&
        evDate.getDate() === dayDate.getDate() &&
        evDate.getHours() === hour
      );
    });
  };

  // Unscheduled tasks
  const unscheduledTasks = tasks.filter(t => !t.scheduledStart && t.status !== 'completed');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Calendar Header */}
      <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-0.5">
            <CalendarIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Умный Тайм-Блокинг</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {viewType === 'week'
              ? `${weekDays[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${weekDays[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Задачи с максимальной значимостью (P1) автоматически резервируют пиковые утренние часы продуктивности.
          </p>
        </div>

        {/* Calendar Nav & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full md:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setViewType('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                viewType === 'week'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewType('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                viewType === 'day'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              День
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={prevWeek}
              className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Назад"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={setToday}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg min-h-[38px] flex items-center justify-center"
            >
              Сегодня
            </button>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Вперед"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onProposeSchedule && (
            <button
              id="btn-cal-propose-schedule"
              onClick={onProposeSchedule}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs transition-all min-h-[40px]"
              title="ИИ рассчитывает дедлайны исходя из целей и составляет расписание (с подтверждением)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>ИИ-План</span>
            </button>
          )}

          <button
            id="btn-auto-distribute-cal"
            onClick={onAutoSchedule}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all min-h-[40px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Авто-слоты</span>
          </button>

          <button
            onClick={onExportICS}
            title="Экспортировать расписание в файл .ics"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Экспорт .ICS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar + Unscheduled Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8-9 cols on lg) */}
        <div className="lg:col-span-9 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
          {/* Peak Focus Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-amber-950/30 dark:to-indigo-950/30 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>
                <strong>Утренний пик фокуса:</strong> {config.focusPeakStart}:00 – {config.focusPeakEnd}:00 (Зарезервировано для P1)
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Рабочий день: {config.workStartHour}:00 – {config.workEndHour}:00</span>
          </div>

          {/* Table / Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Headers */}
              <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="p-3 text-center border-r border-slate-200/80 dark:border-slate-800/80 text-slate-400 dark:text-slate-500">
                  Время
                </div>
                {(viewType === 'week' ? weekDays : [selectedDate]).map((d, idx) => {
                  const isToday =
                    d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={idx}
                      className={`p-3 text-center border-r border-slate-200/80 dark:border-slate-800/80 ${
                        viewType === 'day' ? 'col-span-7' : ''
                      } ${isToday ? 'bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold' : ''}`}
                    >
                      <span className="block text-xs uppercase text-slate-500 dark:text-slate-400">
                        {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </span>
                      <span
                        className={`inline-block mt-0.5 text-sm ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xs'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hourly Slots */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {HOURS.map(hour => {
                  const isFocusHour = hour >= config.focusPeakStart && hour < config.focusPeakEnd;
                  const isLunchHour = hour === config.lunchStartHour;

                  return (
                    <div key={hour} className="grid grid-cols-8 min-h-[64px]">
                      {/* Hour label */}
                      <div className="p-2 text-right pr-3 text-xs font-mono text-slate-400 dark:text-slate-500 border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-start">
                        <span>{hour}:00</span>
                        {isLunchHour && <span className="text-[10px] text-slate-400 dark:text-slate-500">Обед</span>}
                      </div>

                      {/* Day Cells */}
                      {(viewType === 'week' ? weekDays : [selectedDate]).map((d, dayIdx) => {
                        const cellEvents = getEventsForSlot(d, hour);
                        return (
                          <div
                            key={dayIdx}
                            className={`p-1 border-r border-slate-100 dark:border-slate-800/70 relative group transition-colors ${
                              viewType === 'day' ? 'col-span-7' : ''
                            } ${isFocusHour ? 'bg-amber-50/15 dark:bg-amber-950/20' : ''} ${
                              isLunchHour ? 'bg-slate-50/40 dark:bg-slate-800/30' : ''
                            } hover:bg-slate-50/80 dark:hover:bg-slate-800/40`}
                          >
                            {cellEvents.map(ev => {
                              const isCompleted = ev.status === 'completed';
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  className="rounded-lg p-1.5 text-xs text-left shadow-2xs mb-1 cursor-pointer transition-all hover:scale-[1.02] border backdrop-blur-xs"
                                  style={{
                                    backgroundColor: `${ev.goalColor}20`,
                                    borderColor: `${ev.goalColor}50`,
                                    borderLeftWidth: '3px',
                                    borderLeftColor: ev.goalColor,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`font-bold text-[10px] px-1 rounded ${
                                        ev.priority === 'P1'
                                          ? 'bg-rose-500 text-white'
                                          : ev.priority === 'P2'
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-slate-700 text-white'
                                      }`}
                                    >
                                      {ev.priority}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                      {ev.durationMinutes}м
                                    </span>
                                  </div>
                                  <h5
                                    className={`font-semibold text-slate-900 dark:text-white line-clamp-2 mt-0.5 leading-tight ${
                                      isCompleted ? 'line-through opacity-60' : ''
                                    }`}
                                  >
                                    {ev.title}
                                  </h5>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                                    {ev.goalTitle}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Unscheduled Sidebar (3 cols on lg) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="backdrop-blur-md bg-white/85 dark:bg-slate-900/85 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                В очереди ({unscheduledTasks.length})
              </h3>
              <button
                onClick={onAutoSchedule}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                Разместить все
              </button>
            </div>

            {unscheduledTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                Все активные задачи распределены по календарным слотам!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {unscheduledTasks.map(t => {
                  const goal = t.goalId ? goalMap.get(t.goalId) : null;
                  return (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-600 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-xs transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            t.priority === 'P1'
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {t.priority} ({t.significanceScore}/100)
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                          {t.durationMinutes} мин
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                        {t.title}
                      </h4>

                      {goal && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          🎯 {goal.title}
                        </span>
                      )}

                      <button
                        onClick={() => {
                          const today = new Date();
                          onScheduleSingleTask(t.id, today.toISOString().split('T')[0], 10);
                        }}
                        className="w-full mt-1 py-1.5 rounded-lg text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors text-center min-h-[32px]"
                      >
                        Запланировать на сегодня (10:00)
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
                style={{
                  backgroundColor: `${selectedEvent.goalColor}20`,
                  color: selectedEvent.goalColor,
                }}
              >
                {selectedEvent.goalTitle}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                {selectedEvent.priority}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
              {selectedEvent.title}
            </h3>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span>Время:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {new Date(selectedEvent.start).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  {' '}({new Date(selectedEvent.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(selectedEvent.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Длительность:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedEvent.durationMinutes} мин</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Индекс значимости для целей:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedEvent.significanceScore}/100</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <a
                href={getGoogleCalendarLink(selectedEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors min-h-[40px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </a>

              <button
                onClick={() => {
                  onToggleComplete(selectedEvent.taskId);
                  setSelectedEvent(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors min-h-[40px]"
              >
                Завершить
              </button>

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px]"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
