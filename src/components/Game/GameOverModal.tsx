import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Swords, RotateCcw, BarChart3, Plus } from 'lucide-react';
import { sound } from '../../utils/sound';
import { ChessyModal } from '../common/ChessyModal';
import { ChessyButton } from '../common/ChessyButton';

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
    <ChessyModal
      isOpen={isOpen}
      onClose={onNewGame}
      title={resultTitle}
      subtitle={reason}
      maxWidth="md"
      icon={
        result === 'win' ? (
          <Trophy className="w-5 h-5 text-emerald-400" />
        ) : result === 'loss' ? (
          <Swords className="w-5 h-5 text-rose-400" />
        ) : (
          <span className="text-sm font-bold font-mono text-amber-400">½-½</span>
        )
      }
      footer={
        <div className="w-full space-y-2.5">
          <ChessyButton
            variant="primary"
            size="md"
            onClick={onAnalyze}
            className="w-full"
            leftIcon={<BarChart3 className="w-4 h-4" />}
          >
            Review Game Analysis
          </ChessyButton>

          <div className="grid grid-cols-2 gap-2">
            <ChessyButton
              variant="secondary"
              size="sm"
              onClick={onRematch}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Rematch
            </ChessyButton>
            <ChessyButton
              variant="secondary"
              size="sm"
              onClick={onNewGame}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Game
            </ChessyButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Rating Delta Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Rating Update</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-100 tabular-nums">{newElo} Elo</span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                eloChange > 0 ? 'text-emerald-400' : eloChange < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              ({eloChange > 0 ? `+${eloChange}` : eloChange})
            </span>
          </div>
        </div>

        {/* Quick Accuracy Comparison */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Opening</span>
            <span className="font-medium text-slate-200 truncate max-w-[200px]">
              {openingName || 'Custom Opening Line'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800/80">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">White</span>
              <span className="text-sm font-mono font-bold text-slate-100 tabular-nums">{whiteAccuracy}%</span>
            </div>
            <div className="text-center border-l border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Black</span>
              <span className="text-sm font-mono font-bold text-slate-100 tabular-nums">{blackAccuracy}%</span>
            </div>
          </div>
        </div>
      </div>
    </ChessyModal>
  );
};
