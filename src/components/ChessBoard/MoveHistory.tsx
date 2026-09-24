import React, { useRef, useEffect } from 'react';
import { AnalyzedMove } from '../../types/chess';
import { Sparkles, Star, AlertTriangle, XCircle, HelpCircle, BookOpen } from 'lucide-react';

interface MoveHistoryProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  openingName?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
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

  // Group into turns: [{ moveNum: 1, white: AnalyzedMove, black?: AnalyzedMove }, ...]
  const turnRows: { moveNum: number; white: AnalyzedMove; whiteIdx: number; black?: AnalyzedMove; blackIdx?: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    turnRows.push({
      moveNum: Math.floor(i / 2) + 1,
      white: moves[i],
      whiteIdx: i,
      black: moves[i + 1],
      blackIdx: i + 1 < moves.length ? i + 1 : undefined,
    });
  }

  const renderBadge = (classification?: string) => {
    if (!classification) return null;
    switch (classification) {
      case 'brilliant':
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400 inline ml-1 shrink-0" />;
      case 'best':
        return <Star className="w-3.5 h-3.5 text-emerald-400 inline ml-1 shrink-0" />;
      case 'blunder':
        return <XCircle className="w-3.5 h-3.5 text-rose-500 inline ml-1 shrink-0" />;
      case 'mistake':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1 shrink-0" />;
      case 'inaccuracy':
        return <HelpCircle className="w-3.5 h-3.5 text-yellow-400/80 inline ml-1 shrink-0" />;
      case 'book':
        return <BookOpen className="w-3.5 h-3.5 text-blue-400 inline ml-1 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header with Opening */}
      <div className="px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate">
            {openingName || 'Standard Opening'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          {moves.length} ply
        </span>
      </div>

      {/* Move List */}
      <div ref={containerRef} className="flex-1 p-2 overflow-y-auto font-mono text-xs space-y-0.5">
        {turnRows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-8">
            Game started. White to move.
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
                {renderBadge(row.white.classification)}
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
                  {renderBadge(row.black.classification)}
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
};
