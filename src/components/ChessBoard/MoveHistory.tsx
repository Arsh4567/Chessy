import React, { useRef, useEffect, useMemo } from 'react';
import { AnalyzedMove, MoveClassification } from '../../types/chess';
import { BookOpen } from 'lucide-react';
import { MOVE_QUALITY_SIGNS } from '../../utils/moveClassification';
import { MoveMark } from './MoveMark';

interface MoveHistoryProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  openingName?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = React.memo(({
  moves,
  currentMoveIndex,
  onSelectMove,
  openingName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current move
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length, currentMoveIndex]);

  // Group into turns efficiently
  const turnRows = useMemo(() => {
    const rows: { moveNum: number; white: AnalyzedMove; whiteIdx: number; black?: AnalyzedMove; blackIdx?: number }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      rows.push({
        moveNum: Math.floor(i / 2) + 1,
        white: moves[i],
        whiteIdx: i,
        black: moves[i + 1],
        blackIdx: i + 1 < moves.length ? i + 1 : undefined,
      });
    }
    return rows;
  }, [moves]);

  const renderBadge = (move: AnalyzedMove) => {
    // If Stockfish has evaluated the move:
    if (move.classification) {
      return (
        <div className="flex items-center gap-1 shrink-0 ml-1.5">
          {move.isBookMove && (
            <span
              className="text-[10px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              title={`Book Move / Opening Theory${move.openingName ? `: ${move.openingName}` : ''}`}
            >
              📖
            </span>
          )}
          <MoveMark classification={move.classification} size={22} className="shrink-0" />
        </div>
      );
    }

    // When Stockfish analysis is pending: Display Analyzing... instead of Book Move!
    return (
      <span className="text-[9px] font-mono text-slate-500 italic ml-1.5 shrink-0 flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-amber-400/80 animate-ping inline-block" />
        <span>Analyzing...</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header with Opening */}
      <div className="px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate">
            {openingName || 'Opening'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          {moves.length} moves
        </span>
      </div>

      {/* Move List */}
      <div ref={containerRef} className="flex-1 p-2 overflow-y-auto font-mono text-xs space-y-0.5">
        {turnRows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-8">
            White to move.
          </div>
        ) : (
          turnRows.map((row) => (
            <div
              key={row.moveNum}
              className="grid grid-cols-12 items-center py-1 px-2 rounded hover:bg-slate-800/60 transition-colors"
            >
              {/* Turn Number */}
              <span className="col-span-2 text-slate-400 font-bold">
                {row.moveNum}.
              </span>

              {/* White Move */}
              <button
                onClick={() => onSelectMove(row.whiteIdx)}
                className={`col-span-5 flex items-center justify-between px-2 py-0.5 rounded text-left transition-colors ${
                  currentMoveIndex === row.whiteIdx
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <span>{row.white.san}</span>
                {renderBadge(row.white)}
              </button>

              {/* Black Move */}
              {row.black && row.blackIdx !== undefined ? (
                <button
                  onClick={() => onSelectMove(row.blackIdx!)}
                  className={`col-span-5 flex items-center justify-between px-2 py-0.5 rounded text-left transition-colors ${
                    currentMoveIndex === row.blackIdx
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  <span>{row.black.san}</span>
                  {renderBadge(row.black)}
                </button>
              ) : (
                <div className="col-span-5" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="p-2 bg-slate-950/60 border-t border-slate-800 flex items-center justify-center gap-1">
        <button
          onClick={() => onSelectMove(-1)}
          disabled={currentMoveIndex < 0}
          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
          title="First Move"
        >
          ⏮
        </button>
        <button
          onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex < 0}
          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
          title="Previous Move"
        >
          ◀
        </button>
        <button
          onClick={() => onSelectMove(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= moves.length - 1}
          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
          title="Next Move"
        >
          ▶
        </button>
        <button
          onClick={() => onSelectMove(moves.length - 1)}
          disabled={currentMoveIndex >= moves.length - 1}
          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
          title="Current Move"
        >
          ⏭
        </button>
      </div>
    </div>
  );
});
