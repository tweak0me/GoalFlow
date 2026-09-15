import React from 'react';
import {
  Target,
  Sparkles,
  Calendar,
  CheckSquare,
  BrainCircuit,
  Download,
  Settings,
  Bot,
  CalendarClock,
  Sun,
  Moon,
} from 'lucide-react';
import { AIModelType } from '../types';

interface NavbarProps {
  activeTab: 'tasks' | 'calendar' | 'goals' | 'analytics' | 'chat';
  setActiveTab: (tab: 'tasks' | 'calendar' | 'goals' | 'analytics' | 'chat') => void;
  selectedModel: AIModelType;
  onModelChange: (model: AIModelType) => void;
  onPrioritize: () => void;
  onProposeSchedule: () => void;
  onAutoSchedule: () => void;
  onExportICS: () => void;
  onOpenSettings: () => void;
  isPrioritizing: boolean;
  isGeneratingSchedule?: boolean;
  tasksCount: number;
  goalsCount: number;
  chatMessagesCount?: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedModel,
  onModelChange,
  onPrioritize,
  onProposeSchedule,
  onAutoSchedule,
  onExportICS,
  onOpenSettings,
  isPrioritizing,
  isGeneratingSchedule = false,
  tasksCount,
  goalsCount,
  chatMessagesCount = 0,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
                  GoalFlow AI
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  <BrainCircuit className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">DeepSeek & Gemini</span>
                  <span className="sm:hidden">AI</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Авто-приоритизация по целям и тайм-блокинг
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (hidden on mobile, mobile uses bottom glass bar) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xs">
            <button
              id="nav-tab-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Задачи</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                {tasksCount}
              </span>
            </button>

            <button
              id="nav-tab-calendar"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Календарь</span>
            </button>

            <button
              id="nav-tab-goals"
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'goals'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Цели</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                {goalsCount}
              </span>
            </button>

            <button
              id="nav-tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Чат</span>
              {chatMessagesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                  {chatMessagesCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Мышление</span>
            </button>
          </nav>

          {/* Action Buttons & Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Plan Trigger */}
            <button
              id="btn-trigger-schedule-proposal"
              onClick={onProposeSchedule}
              disabled={isGeneratingSchedule}
              title="ИИ рассчитывает расписание и дедлайны исходя из целей"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800/70 disabled:opacity-50 transition-all shadow-2xs min-h-[40px]"
            >
              <CalendarClock className={`w-4 h-4 shrink-0 ${isGeneratingSchedule ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isGeneratingSchedule ? 'Расчет...' : 'ИИ-План'}
              </span>
              <span className="sm:hidden text-[11px]">План</span>
            </button>

            {/* AI Prioritize Trigger */}
            <button
              id="btn-trigger-ai-prioritize"
              onClick={onPrioritize}
              disabled={isPrioritizing}
              title="Пересчитать приоритеты задач"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs hover:shadow-indigo-500/25 min-h-[40px]"
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isPrioritizing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isPrioritizing ? 'Рассуждает...' : 'Приоритеты'}
              </span>
              <span className="sm:hidden text-[11px]">{isPrioritizing ? '...' : 'ИИ'}</span>
            </button>

            {/* ICS Export (desktop only) */}
            <button
              id="btn-export-calendar-ics"
              onClick={onExportICS}
              title="Экспорт в .ics"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-all min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.ICS</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              aria-label="Переключить тему"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Settings Button */}
            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              title="Настройки ИИ и рабочего расписания"
              aria-label="Настройки"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
