import React from 'react';
import { UserPreferences } from '../../utils/storage';
import { X, Volume2, VolumeX, Eye, Check, Sliders, Palette, Zap, Clock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    onUpdatePreferences({ ...preferences, [key]: value });
  };

  const themes: { id: UserPreferences['boardTheme']; name: string; light: string; dark: string }[] = [
    { id: 'emerald', name: 'Emerald', light: '#ECEED2', dark: '#769656' },
    { id: 'wood', name: 'Walnut', light: '#F0D9B5', dark: '#B58863' },
    { id: 'midnight', name: 'Midnight', light: '#334155', dark: '#0F172A' },
    { id: 'cyber', name: 'Cyber', light: '#67E8F9', dark: '#0E7490' },
    { id: 'marble', name: 'Marble', light: '#F1F5F9', dark: '#64748B' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Board Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Board Theme</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update('boardTheme', t.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                    preferences.boardTheme === t.id
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 shadow">
                    <div style={{ backgroundColor: t.light }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.light }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stockfish Engine Skill Level */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Stockfish 19 Engine Strength</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                Level {preferences.stockfishLevel} / 20
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={preferences.stockfishLevel}
              onChange={(e) => update('stockfishLevel', parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Novice (~600)</span>
              <span>Club (~1500)</span>
              <span>Master (~2200)</span>
              <span>Stockfish GM (2800+)</span>
            </div>
          </div>

          {/* Stockfish Engine Analysis Time (7 - 10s) */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Engine Analysis Time</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {preferences.engineThinkingSeconds || 8} seconds
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[7, 8, 9, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => update('engineThinkingSeconds', sec)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    (preferences.engineThinkingSeconds || 8) === sec
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Gives Stockfish 7–10 seconds to analyze millions of candidate moves and calculate the highest-accuracy grandmaster lines.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-3 divide-y divide-slate-800">
            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                {preferences.soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span className="text-xs font-medium text-slate-200">Sound Effects</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => update('soundEnabled', e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-200">Board Coordinates</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.showCoordinates}
                onChange={(e) => update('showCoordinates', e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🟢</span>
                <span className="text-xs font-medium text-slate-200">Legal Move Dots</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.showLegalMoves}
                onChange={(e) => update('showLegalMoves', e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <span className="text-base">♛</span>
                <span className="text-xs font-medium text-slate-200">Auto-Promote to Queen</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoQueen}
                onChange={(e) => update('autoQueen', e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
