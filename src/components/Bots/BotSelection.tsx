import React, { useState } from 'react';
import { BotProfile, TimeControl, TimeControlCategory } from '../../types/chess';
import { INITIAL_BOTS, TIME_CONTROLS } from '../../utils/mockData';
import { Bot, Play, Zap, Shield, Sparkles, Sliders } from 'lucide-react';

interface BotSelectionProps {
  onStartBotGame: (bot: BotProfile, timeControl: TimeControl, playerColor: 'w' | 'b' | 'random') => void;
}

export const BotSelection: React.FC<BotSelectionProps> = ({ onStartBotGame }) => {
  const [selectedBot, setSelectedBot] = useState<BotProfile>(INITIAL_BOTS[1]); // Nelson default
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0 Blitz
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | 'random'>('w');
  const [customElo, setCustomElo] = useState<number>(1500);
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const handleStart = () => {
    let finalBot = selectedBot;
    if (isCustom) {
      finalBot = {
        id: 'bot-custom',
        name: `Custom Engine (${customElo})`,
        elo: customElo,
        avatarBg: 'bg-indigo-950/70 border-indigo-500/30 text-indigo-400',
        avatarIcon: '⚙️',
        description: `Custom calibrated Stockfish engine set to Elo ${customElo}.`,
        personality: customElo < 1000 ? 'novice' : customElo < 1800 ? 'tactical' : 'grandmaster',
        depth: customElo < 1000 ? 1 : customElo < 1800 ? 2 : 3,
        blunderRate: Math.max(0, (2500 - customElo) / 3000),
        favoriteOpening: 'Dynamic Lines',
        tagline: `Calibrated to Elo ${customElo}`
      };
    }
    onStartBotGame(finalBot, selectedTimeControl, playerColor);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-400" />
            <span>Select Your Bot Opponent</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose from distinct personalities, queen rushers, international masters, or super-grandmaster engines
          </p>
        </div>

        <button
          onClick={() => setIsCustom(!isCustom)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isCustom
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isCustom ? 'Using Custom Elo' : 'Custom Elo Engine'}</span>
        </button>
      </div>

      {/* Custom Elo Slider if enabled */}
      {isCustom && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-200">Adjust Custom Engine Rating</span>
            <span className="text-xl font-mono font-black text-amber-400">{customElo} Elo</span>
          </div>
          <input
            type="range"
            min="400"
            max="2800"
            step="50"
            value={customElo}
            onChange={(e) => setCustomElo(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>400 (Beginner)</span>
            <span>1500 (Intermediate)</span>
            <span>2000 (Expert)</span>
            <span>2800 (Super GM)</span>
          </div>
        </div>
      )}

      {/* Bot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {INITIAL_BOTS.map((bot) => {
          const isSelected = !isCustom && selectedBot.id === bot.id;

          return (
            <div
              key={bot.id}
              onClick={() => {
                setSelectedBot(bot);
                setIsCustom(false);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl shadow-inner ${bot.avatarBg}`}>
                    {bot.avatarIcon}
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                    {bot.elo} Elo
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {bot.title && (
                    <span className="px-1 py-0.2 text-[9px] font-black bg-amber-500 text-slate-950 rounded font-mono">
                      {bot.title}
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-slate-100">{bot.name}</h3>
                </div>

                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {bot.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 italic block truncate">
                  "{bot.tagline}"
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Configuration Bar: Time Control, Color & Start Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Time Control Options */}
        <div className="space-y-2 w-full lg:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Time Control
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.id}
                onClick={() => setSelectedTimeControl(tc)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  selectedTimeControl.id === tc.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-2 w-full lg:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Play As
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPlayerColor('w')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                playerColor === 'w'
                  ? 'bg-white text-slate-950 border-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span>♔</span>
              <span>White</span>
            </button>
            <button
              onClick={() => setPlayerColor('random')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                playerColor === 'random'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span>☯</span>
              <span>Random</span>
            </button>
            <button
              onClick={() => setPlayerColor('b')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                playerColor === 'b'
                  ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span>♚</span>
              <span>Black</span>
            </button>
          </div>
        </div>

        {/* Start Game CTA */}
        <button
          onClick={handleStart}
          className="w-full lg:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Challenge Bot</span>
        </button>
      </div>
    </div>
  );
};
