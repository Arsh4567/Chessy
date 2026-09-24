import React, { useState } from 'react';
import { BotProfile, TimeControl } from '../../types/chess';
import { INITIAL_BOTS, TIME_CONTROLS } from '../../utils/mockData';
import { Bot, Play, Zap, Sliders, Check } from 'lucide-react';

interface BotSelectionProps {
  onStartBotGame: (bot: BotProfile, timeControl: TimeControl, playerColor: 'w' | 'b' | 'random') => void;
}

export const BotSelection: React.FC<BotSelectionProps> = ({ onStartBotGame }) => {
  const [selectedBot, setSelectedBot] = useState<BotProfile>(INITIAL_BOTS[1]);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | 'random'>('w');
  const [customElo, setCustomElo] = useState<number>(1500);
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const handleStart = () => {
    let finalBot = selectedBot;
    if (isCustom) {
      finalBot = {
        id: 'bot-custom',
        name: `Stockfish (${customElo})`,
        elo: customElo,
        avatarBg: 'bg-indigo-950/70 border-indigo-500/30 text-indigo-400',
        avatarIcon: '🤖',
        description: `Calibrated to Elo ${customElo}`,
        tagline: `Engine Elo ${customElo}`,
        blunderRate: Math.max(0, (2600 - customElo) / 3000),
        personality: customElo < 1200 ? 'novice' : customElo < 2000 ? 'tactical' : 'grandmaster',
        depth: Math.max(1, Math.round((customElo / 2800) * 8)),
        favoriteOpening: 'Stockfish Book',
      };
    }
    onStartBotGame(finalBot, selectedTimeControl, playerColor);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Bot Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {INITIAL_BOTS.map((bot) => {
          const isSelected = !isCustom && selectedBot.id === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => {
                setSelectedBot(bot);
                setIsCustom(false);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/5 scale-[1.02]'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{bot.avatarIcon}</span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                  {bot.elo}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold text-slate-100 flex items-center gap-1">
                  <span>{bot.name}</span>
                  {bot.title && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1 rounded font-mono font-bold">
                      {bot.title}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                  {bot.personality}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Elo Switch */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={() => setIsCustom(!isCustom)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
            isCustom
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isCustom ? 'Custom Stockfish Active' : 'Custom Rating Slider'}</span>
        </button>

        {isCustom && (
          <div className="flex items-center gap-4 w-full sm:w-auto flex-1 max-w-md">
            <input
              type="range"
              min="400"
              max="2800"
              step="50"
              value={customElo}
              onChange={(e) => setCustomElo(parseInt(e.target.value, 10))}
              className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <span className="text-sm font-mono font-bold text-amber-400 shrink-0">
              {customElo} Elo
            </span>
          </div>
        )}
      </div>

      {/* Match Options: Color & Time */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Color Choice */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Color</span>
            <div className="flex gap-1.5 flex-1">
              {(
                [
                  { id: 'w', label: 'White', icon: '♔' },
                  { id: 'random', label: 'Random', icon: '☯' },
                  { id: 'b', label: 'Black', icon: '♚' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPlayerColor(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    playerColor === c.id
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="text-base leading-none">{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Choice */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Time</span>
            <div className="flex gap-1.5">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => setSelectedTimeControl(tc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedTimeControl.id === tc.id
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {tc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start CTA */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play</span>
          </button>
        </div>
      </div>
    </div>
  );
};
