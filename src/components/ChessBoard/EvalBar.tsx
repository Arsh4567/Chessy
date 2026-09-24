import React from 'react';
import { centipawnsToWinProb } from '../../utils/engine';

interface EvalBarProps {
  evalScore: number; // in pawns e.g. +1.5 or -3.2, or large for mate (from White perspective)
  rawScore?: string; // raw Stockfish UCI score e.g. "cp +17" or "mate 1"
  displayEval?: string; // preformatted eval string e.g. "+0.17" or "M1"
  depth?: number;
  isFlipped?: boolean;
  isEvaluating?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = React.memo(({
  evalScore,
  rawScore,
  displayEval: customDisplayEval,
  depth,
  isFlipped = false,
  isEvaluating = false,
}) => {
  // Convert eval in pawns to centipawns
  const cp = evalScore * 100;
  const winProb = centipawnsToWinProb(cp); // 0 to 100 representing White winning chance
  
  // Height calculation for White segment (clamped between 3% and 97% for visual clarity)
  const whiteHeightPercent = Math.min(97, Math.max(3, winProb));
  const isWhiteWinning = evalScore >= 0;

  // Format display text
  let displayEval = customDisplayEval;
  if (!displayEval) {
    if (Math.abs(evalScore) >= 90) {
      displayEval = evalScore > 0 ? 'M1' : '-M1';
    } else {
      displayEval = `${evalScore > 0 ? '+' : ''}${evalScore.toFixed(1)}`;
      if (displayEval === '+0.0' || displayEval === '-0.0') {
        displayEval = '0.0';
      }
    }
  }

  // Determine tag positioning based on winning side and board orientation
  // When not flipped: Top is Black, Bottom is White
  // When flipped: Top is White, Bottom is Black
  const isTagAtTop = isFlipped ? isWhiteWinning : !isWhiteWinning;
  const isTagOnWhite = isWhiteWinning;

  const tooltipText = `Evaluation: ${displayEval}`;

  return (
    <div
      title={tooltipText}
      className="relative w-6 sm:w-7 h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700/80 shadow-md flex flex-col shrink-0 select-none cursor-help group transition-all"
    >
      {/* 50% Equilibrium Center Reference Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-amber-400/30 z-20 pointer-events-none" />

      {/* Evaluating pulse indicator */}
      {isEvaluating && (
        <div className="absolute top-1 right-1 z-30 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping pointer-events-none" />
      )}

      {isFlipped ? (
        // Flipped orientation: White at top, Black at bottom
        <>
          <div
            className="w-full bg-slate-100 transition-all duration-300 ease-out"
            style={{ height: `${whiteHeightPercent}%` }}
          />
          <div
            className="w-full bg-slate-900 transition-all duration-300 ease-out"
            style={{ height: `${100 - whiteHeightPercent}%` }}
          />
        </>
      ) : (
        // Standard orientation: Black at top, White at bottom
        <>
          <div
            className="w-full bg-slate-900 transition-all duration-300 ease-out"
            style={{ height: `${100 - whiteHeightPercent}%` }}
          />
          <div
            className="w-full bg-slate-100 transition-all duration-300 ease-out"
            style={{ height: `${whiteHeightPercent}%` }}
          />
        </>
      )}

      {/* Floating Eval Indicator Tag */}
      <div
        className={`absolute left-0 right-0 z-10 text-center font-mono font-black text-[10px] sm:text-xs py-1 tracking-tighter transition-all duration-200 ${
          isTagAtTop ? 'top-1' : 'bottom-1'
        } ${isTagOnWhite ? 'text-slate-950 font-bold' : 'text-slate-100 font-bold'}`}
      >
        {displayEval}
      </div>
    </div>
  );
});
