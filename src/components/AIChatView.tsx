import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Zap,
  HelpCircle,
  PlusCircle,
  Layers,
} from 'lucide-react';
import { ChatMessage, Goal, Task, AIModelType, UserScheduleConfig } from '../types';

interface AIChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (userText: string) => Promise<void>;
  onClearHistory: () => void;
  isSending: boolean;
  selectedModel: AIModelType;
  goals: Goal[];
  tasks: Task[];
  onRequestScheduleProposal: () => void;
  onQuickAddTask: (title: string, durationMinutes: number, goalId?: string) => void;
  onQuickAddGoal: (title: string, weight: number, targetDate: string) => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  messages,
  onSendMessage,
  onClearHistory,
  isSending,
  selectedModel,
  goals,
  tasks,
  onRequestScheduleProposal,
  onQuickAddTask,
  onQuickAddGoal,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(text);
  };

  const handlePromptChip = (chipText: string) => {
    setInputText(chipText);
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const p1Count = activeTasks.filter(t => t.priority === 'P1').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <Bot className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Интерактивный ИИ-Ассистент
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Чат и Команды для ИИ</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Управляйте целями, задачами и расписанием на естественном языке. ИИ умеет создавать задачи и цели, пересчитывать дедлайны и составлять план дня с учетом утреннего пика фокуса.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 block">Текущая модель</span>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/60">
              {selectedModel}
            </span>
          </div>

          <button
            type="button"
            onClick={onClearHistory}
            title="Очистить историю переписки"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700/80 transition-colors min-h-[38px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить историю</span>
          </button>
        </div>
      </div>

      {/* Main Chat Interface Container */}
      <div className="backdrop-blur-md bg-white/85 dark:bg-slate-900/85 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col h-[550px] sm:h-[650px] overflow-hidden transition-colors">
        {/* Chat Status Subbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>Целей: <strong className="text-slate-800 dark:text-slate-200">{goals.length}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Задач: <strong className="text-slate-800 dark:text-slate-200">{activeTasks.length}</strong></span>
            </span>
            {p1Count > 0 && (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <Flame className="w-3.5 h-3.5" />
                <span>P1: {p1Count}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:inline">
            История сохраняется локально
          </span>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10 sm:py-12 px-4 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm border border-indigo-100 dark:border-indigo-800/60">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Чем помочь вам сегодня?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Вы можете давать боту команды для создания целей, задач, корректировки дедлайнов или запросить умное планирование расписания.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-left">
                <button
                  type="button"
                  onClick={() => handlePromptChip('Составь мне расписание на неделю исходя из целей и поставь дедлайны')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between"
                >
                  <span>📅 Составить расписание и скорректировать дедлайны</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptChip('Какие задачи имеют наивысший приоритет P1 и почему?')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between"
                >
                  <span>⚡ Проанализировать приоритеты и риски</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptChip('Добавь задачу: Завершить дизайн презентации на 45 минут с высоким фокусом')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between"
                >
                  <span>➕ Добавить новую задачу на естественном языке</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
            </div>
          ) : (
            messages.map(msg => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5`}>
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
                          : 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Action Result pill */}
                      {msg.actionResult && (
                        <div
                          className={`mt-3 pt-2.5 border-t text-xs flex items-center gap-2 ${
                            isAssistant
                              ? 'border-slate-200/80 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 font-semibold'
                              : 'border-indigo-500/80 text-indigo-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{msg.actionResult.details || 'Действие выполнено'}</span>
                        </div>
                      )}
                    </div>

                    <span
                      className={`block text-[10px] text-slate-400 dark:text-slate-500 px-1 ${
                        isAssistant ? 'text-left' : 'text-right'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl rounded-tl-xs p-3.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                  ИИ формулирует ответ и выполняет команды...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 sm:px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={onRequestScheduleProposal}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold transition-colors min-h-[34px]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Составить расписание и дедлайны</span>
          </button>
          <button
            type="button"
            onClick={() => handlePromptChip('Создай цель: Повысить конверсию сайта на 15%, вес 8, дедлайн через 30 дней')}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs transition-colors min-h-[34px]"
          >
            <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>+ Создать цель</span>
          </button>
          <button
            type="button"
            onClick={() => handlePromptChip('Добавь задачу: Анализ конкурентов на 60 минут с высоким фокусом')}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs transition-colors min-h-[34px]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>+ Добавить задачу</span>
          </button>
          <button
            type="button"
            onClick={() => handlePromptChip('Сделай краткий аудит: не перегружен ли я неважными задачами?')}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs transition-colors min-h-[34px]"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Аудит нагрузки</span>
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Команда для ИИ (например: 'Составь расписание с дедлайнами' или 'Создай задачу...')"
            disabled={isSending}
            className="flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 sm:p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

