import React from 'react';
import { AnalyzedMove } from '../../types/chess';
import { MoveMark } from '../ChessBoard/MoveMark';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MoveInspectorProps {
  currentMove: AnalyzedMove | null;
  currentMoveIdx: number;
  totalMoves: number;
  isProgressivelyAnalyzing: boolean;
  onPrevMove: () => void;
  onNextMove: () => void;
}

export const MoveInspector: React.FC<MoveInspectorProps> = ({
  currentMove,
  currentMoveIdx,
  totalMoves,
  isProgressivelyAnalyzing,
  onPrevMove,
  onNextMove,
}) => {
  if (!currentMove) return null;

  return (
    <div className="w-full max-w-[480px] bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl space-y-2.5 shadow-xl animate-in fade-in duration-150">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400">
            Move {Math.floor(currentMoveIdx / 2) + 1}
            {currentMove.color === 'w' ? '.' : '...'}
          </span>
          <span className="text-sm font-black font-mono text-slate-100 px-2 py-0.5 rounded-lg bg-slate-800">
            {currentMove.san}
          </span>

          {currentMove.classification ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 shadow-sm">
              <MoveMark classification={currentMove.classification} size={20} showGlow />
              <span className="font-sans font-bold text-[11px] text-slate-200 capitalize">
                {currentMove.classification}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-amber-300 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{isProgressivelyAnalyzing ? 'Analyzing...' : 'Ready'}</span>
            </div>
          )}

          {currentMove.isBookMove && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
              <span>📚</span>
              <span className="truncate max-w-[160px] sm:max-w-[220px]">
                {currentMove.openingName || 'Theory'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentMove.evalBefore !== undefined && (
            <div className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              <span className={currentMove.evalBefore >= 0 ? 'text-slate-200' : 'text-slate-400'}>
                {currentMove.evalBefore >= 0 ? `+${currentMove.evalBefore.toFixed(2)}` : currentMove.evalBefore.toFixed(2)}
              </span>
              <span className="text-slate-500 mx-1">→</span>
              <span className={currentMove.eval >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {currentMove.eval >= 0 ? `+${currentMove.eval.toFixed(2)}` : currentMove.eval.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMove}
              disabled={currentMoveIdx <= 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
              title="Previous move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextMove}
              disabled={currentMoveIdx >= totalMoves - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
              title="Next move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
        <p>{currentMove.commentary || 'Stockfish positional calculation.'}</p>
        {currentMove.bestMoveSan && currentMove.bestMoveSan !== currentMove.san && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-bold">Best engine line:</span>
            <span className="font-mono font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
              {currentMove.bestMoveSan}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
