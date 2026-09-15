import React, { useState } from 'react';
import { Settings, Cpu, Clock, Key, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { AIModelType, UserScheduleConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: AIModelType;
  onModelChange: (model: AIModelType) => void;
  config: UserScheduleConfig;
  onUpdateConfig: (config: UserScheduleConfig) => void;
  customApiKey: string;
  onUpdateApiKey: (key: string) => void;
  onResetSampleData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onModelChange,
  config,
  onUpdateConfig,
  customApiKey,
  onUpdateApiKey,
  onResetSampleData,
}) => {
  if (!isOpen) return null;

  const [tempApiKey, setTempApiKey] = useState(customApiKey);
  const [localConfig, setLocalConfig] = useState<UserScheduleConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateApiKey(tempApiKey.trim());
    onUpdateConfig(localConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Настройки ИИ и Расписания</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
          {/* AI Model Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Движок ИИ-Приоритизации
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'gemini-3.8-flash' as AIModelType,
                  name: 'Gemini 3.8 Flash (Рекомендуемый)',
                  desc: 'Стратегический расчет, оптимизация дедлайнов и тайм-блокинг',
                },
                {
                  id: 'gemini-3.1-flash-lite' as AIModelType,
                  name: 'Gemini 3.1 Flash Lite',
                  desc: 'Сверхбыстрый расчет и планирование с минимальной задержкой',
                },
                {
                  id: 'deepseek-reasoner' as AIModelType,
                  name: 'DeepSeek Reasoner (R1)',
                  desc: 'Глубокая цепочка рассуждений (требуется ключ DeepSeek ниже)',
                },
                {
                  id: 'deepseek-chat' as AIModelType,
                  name: 'DeepSeek V3 (Chat)',
                  desc: 'Быстрая стратегическая калибровка (требуется ключ DeepSeek)',
                },
              ].map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => onModelChange(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedModel === m.id
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</span>
                    {selectedModel === m.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* DeepSeek API Key (Optional) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Пользовательский API-ключ DeepSeek (Опционально)
              </label>
            </div>
            <input
              type="password"
              value={tempApiKey}
              onChange={e => setTempApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Если ключ не указан, приложение использует ключ из секретов окружения или интеллектуальный алгоритм приоритизации.
            </p>
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Параметры рабочего дня и пиков фокуса
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Начало работы: {localConfig.workStartHour}:00
                </label>
                <input
                  type="range"
                  min="6"
                  max="11"
                  value={localConfig.workStartHour}
                  onChange={e =>
                    setLocalConfig({ ...localConfig, workStartHour: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Конец работы: {localConfig.workEndHour}:00
                </label>
                <input
                  type="range"
                  min="16"
                  max="22"
                  value={localConfig.workEndHour}
                  onChange={e =>
                    setLocalConfig({ ...localConfig, workEndHour: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Пик фокуса: с {localConfig.focusPeakStart}:00 до {localConfig.focusPeakEnd}:00
                </label>
                <div className="flex gap-2 items-center text-xs">
                  <input
                    type="number"
                    min="7"
                    max="14"
                    value={localConfig.focusPeakStart}
                    onChange={e =>
                      setLocalConfig({ ...localConfig, focusPeakStart: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                  <span className="text-slate-400">—</span>
                  <input
                    type="number"
                    min="10"
                    max="16"
                    value={localConfig.focusPeakEnd}
                    onChange={e =>
                      setLocalConfig({ ...localConfig, focusPeakEnd: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Буфер отдыха между задачами
                </label>
                <select
                  value={localConfig.breakDurationMinutes}
                  onChange={e =>
                    setLocalConfig({ ...localConfig, breakDurationMinutes: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={10}>10 мин</option>
                  <option value={15}>15 мин</option>
                  <option value={20}>20 мин</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            {!isConfirmingReset ? (
              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors py-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Восстановить примеры целей и задач</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-rose-600 dark:text-rose-400 font-semibold">Сбросить всё к демо-данным?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetSampleData();
                    setIsConfirmingReset(false);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium min-h-[36px]"
                >
                  Да, сбросить
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-2 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-h-[36px]"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl min-h-[40px]"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 min-h-[40px]"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? 'Сохранено!' : 'Сохранить настройки'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
