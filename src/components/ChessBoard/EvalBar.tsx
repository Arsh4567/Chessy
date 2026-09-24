import React from 'react';
import { centipawnsToWinProb } from '../../utils/engine';

interface EvalBarProps {
  evalScore: number; // in pawns e.g. +1.5 or -3.2, or large for mate
  isFlipped?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ evalScore, isFlipped = false }) => {
  // Convert eval to centipawns
  const cp = evalScore * 100;
  const winProb = centipawnsToWinProb(cp); // 0 to 100 representing white advantage
  
  // Height calculation (if white advantage, white bar is larger)
  // When not flipped, Black is top (100 - winProb), White is bottom (winProb)
  const whiteHeightPercent = Math.min(97, Math.max(3, winProb));
  const displayEval = Math.abs(evalScore) >= 100 
    ? `M${Math.ceil(Math.abs(evalScore) - 100) || 1}`
    : `${evalScore > 0 ? '+' : ''}${evalScore.toFixed(1)}`;

  const isWhiteWinning = evalScore >= 0;

  return (
    <div className="relative w-6 sm:w-7 h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700/60 shadow-inner flex flex-col justify-end shrink-0 select-none">
      {/* Top Background (Black) */}
      <div 
        className="w-full bg-slate-900 transition-all duration-300 ease-out"
        style={{ height: `${100 - whiteHeightPercent}%` }}
      />
      
      {/* Bottom Background (White) */}
      <div 
        className="w-full bg-slate-100 transition-all duration-300 ease-out"
        style={{ height: `${whiteHeightPercent}%` }}
      />

      {/* Floating Eval Indicator Tag */}
      <div 
        className={`absolute left-0 right-0 z-10 text-center font-mono font-bold text-[10px] sm:text-xs py-1 tracking-tighter ${
          isWhiteWinning 
            ? 'bottom-1 text-slate-900' 
            : 'top-1 text-slate-100'
        }`}
      >
        {displayEval}
      </div>
    </div>
  );
};
