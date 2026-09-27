import React, { useState } from 'react';
import { BotProfile, TimeControl } from '../../types/chess';
import { TIME_CONTROLS } from '../../utils/mockData';
import { tuneStockfishForElo } from '../../utils/engine';
import { Play, Swords } from 'lucide-react';

interface BotSelectionProps {
  onStartBotGame: (bot: BotProfile, timeControl: TimeControl, playerColor: 'w' | 'b' | 'random') => void;
}

const ELO_PRESETS = [
  { elo: 600, label: 'Beginner' },
  { elo: 1000, label: 'Casual' },
  { elo: 1400, label: 'Intermediate' },
  { elo: 1700, label: 'Advanced' },
  { elo: 2000, label: 'Expert' },
  { elo: 2400, label: 'Master' },
  { elo: 2800, label: 'Grandmaster' },
];

export const BotSelection: React.FC<BotSelectionProps> = ({ onStartBotGame }) => {
  const [selectedElo, setSelectedElo] = useState<number>(1400);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | 'random'>('w');

  const tuning = tuneStockfishForElo(selectedElo);

  const handleStart = () => {
    const personality: BotProfile['personality'] =
      selectedElo < 1000 ? 'novice' : selectedElo < 1800 ? 'tactical' : selectedElo < 2400 ? 'master' : 'grandmaster';

    const tunedBot: BotProfile = {
      id: `stockfish-${selectedElo}`,
      name: `Stockfish ${selectedElo}`,
      elo: selectedElo,
      title: selectedElo >= 2400 ? 'GM' : selectedElo >= 2000 ? 'NM' : undefined,
      avatarBg: 'bg-sky-950/70 border-sky-500/30 text-sky-400',
      avatarIcon: '🤖',
      description: tuning.description,
      tagline: `Tuned to ${selectedElo} Elo`,
      blunderRate: tuning.blunderRate,
      personality,
      depth: tuning.depth,
      favoriteOpening: 'Adaptive Opening Repertoire',
    };

    onStartBotGame(tunedBot, selectedTimeControl, playerColor);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-200 pb-20 md:pb-10">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400">
            <Swords className="w-4 h-4" />
            <span>AI Bot Arena</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
            Play Stockfish Engine
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Choose your target Elo rating. Stockfish dynamically adjusts its search depth, calculation speed, and positional play.
          </p>
        </div>

        {/* Selected Elo Display */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 shrink-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-2xl font-bold">
            🤖
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Target Strength</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">
              {selectedElo} <span className="text-xs text-sky-400 font-normal">Elo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Elo Tuning Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Rating Level Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bot Strength
            </span>
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-sky-400 tabular-nums">
                {selectedElo} <span className="text-base text-slate-400 font-sans font-medium">Elo</span>
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {selectedElo >= 2400 ? 'Grandmaster' : selectedElo >= 2000 ? 'National Master' : selectedElo >= 1700 ? 'Advanced Player' : selectedElo >= 1400 ? 'Club Player' : 'Casual / Novice'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            {tuning.description}
          </p>
        </div>

        {/* Elo Presets */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Rating Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {ELO_PRESETS.map((preset) => {
              const isSelected = selectedElo === preset.elo;
              return (
                <button
                  key={preset.elo}
                  onClick={() => setSelectedElo(preset.elo)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/15 text-white font-bold'
                      : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs text-slate-400">
                    {preset.label}
                  </span>
                  <span className="text-sm font-bold font-mono text-sky-400 tabular-nums">
                    {preset.elo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fine-Tuning Slider */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Fine-Tune Rating</span>
            <span className="font-mono text-sky-400 font-bold tabular-nums">{selectedElo} Elo</span>
          </div>
          <input
            type="range"
            min="400"
            max="2800"
            step="25"
            value={selectedElo}
            onChange={(e) => setSelectedElo(parseInt(e.target.value, 10))}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>400</span>
            <span>1200</span>
            <span>1800</span>
            <span>2400</span>
            <span>2800</span>
          </div>
        </div>
      </div>

      {/* Match Options: Color & Time */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Color Choice */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-2">Play As</span>
            <div className="flex gap-2 flex-1">
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
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    playerColor === c.id
                      ? 'bg-sky-500 text-slate-950 font-bold'
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
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-2">Time Control</span>
            <div className="flex gap-1.5">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => setSelectedTimeControl(tc)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedTimeControl.id === tc.id
                      ? 'bg-sky-500 text-slate-950 font-bold'
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
            className="w-full sm:w-auto px-8 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};
