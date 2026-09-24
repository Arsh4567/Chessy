import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Swords, RotateCcw, BarChart3, Plus, Share2 } from 'lucide-react';
import { sound } from '../../utils/sound';

interface GameOverModalProps {
  isOpen: boolean;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  eloChange: number;
  newElo: number;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  openingName?: string;
  onAnalyze: () => void;
  onRematch: () => void;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  result,
  reason,
  eloChange,
  newElo,
  whiteAccuracy = 85.4,
  blackAccuracy = 81.2,
  openingName,
  onAnalyze,
  onRematch,
  onNewGame,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (result === 'win') {
        sound.playCheckmate();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#10b981', '#38bdf8', '#fbbf24']
          });
        } catch {}
      }
    }
  }, [isOpen, result]);

  if (!isOpen) return null;

  const resultTitle =
    result === 'win' ? 'Victory!' : result === 'loss' ? 'Defeat' : 'Draw';
  const titleColor =
    result === 'win' ? 'text-emerald-400' : result === 'loss' ? 'text-rose-400' : 'text-amber-400';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="flex justify-center mb-3">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
              result === 'win'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                : result === 'loss'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-400'
                : 'bg-amber-950/80 border-amber-500/40 text-amber-400'
            }`}
          >
            {result === 'win' ? (
              <Trophy className="w-8 h-8" />
            ) : result === 'loss' ? (
              <Swords className="w-8 h-8" />
            ) : (
              <span className="text-2xl font-bold font-mono">½-½</span>
            )}
          </div>
        </div>

        {/* Title & Reason */}
        <div className="text-center mb-5">
          <h2 className={`text-2xl font-extrabold font-display tracking-tight ${titleColor}`}>
            {resultTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {reason}
          </p>

          {/* Rating Delta */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 mt-3">
            <span className="text-xs text-slate-400">Rating</span>
            <span className="text-xs font-mono font-bold text-slate-200">{newElo}</span>
            <span
              className={`text-xs font-mono font-bold ${
                eloChange > 0 ? 'text-emerald-400' : eloChange < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              ({eloChange > 0 ? `+${eloChange}` : eloChange})
            </span>
          </div>
        </div>

        {/* Quick Accuracy Comparison */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Opening</span>
            <span className="font-medium text-slate-200 truncate max-w-[200px]">
              {openingName || 'Custom Line'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">White Accuracy</span>
              <span className="text-base font-mono font-bold text-slate-100">{whiteAccuracy}%</span>
            </div>
            <div className="text-center border-l border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Black Accuracy</span>
              <span className="text-base font-mono font-bold text-slate-100">{blackAccuracy}%</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onAnalyze}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Full Game Engine Review</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRematch}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>
            <button
              onClick={onNewGame}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
