import React from 'react';
import { Sparkles } from 'lucide-react';
import { LichessExplorerMove } from '../../utils/lichessExplorer';
import { StockfishEvaluation } from '../../utils/stockfishWorker';

interface LichessConsensusBannerProps {
  bestMoveDisplay: string | null;
  matchingMasterMove?: LichessExplorerMove;
  stockfishEval?: StockfishEvaluation;
}

export const LichessConsensusBanner: React.FC<LichessConsensusBannerProps> = ({
  bestMoveDisplay,
  matchingMasterMove,
  stockfishEval,
}) => {
  if (!bestMoveDisplay) return null;

  return (
    <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono shrink-0">
      {matchingMasterMove ? (
        <div className="flex items-center gap-1.5 text-emerald-300 font-semibold truncate">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>
            Engine Consensus: <strong className="text-white font-bold">{matchingMasterMove.san}</strong> is Stockfish's #1 pick ({matchingMasterMove.playPct}% of master games)
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-amber-300/90 font-medium truncate">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          <span>
            Engine Recommendation: <strong className="text-white font-bold">{bestMoveDisplay}</strong> (Novelty / Unorthodox Line)
          </span>
        </div>
      )}
      {stockfishEval && stockfishEval.depth > 0 && (
        <span className="text-slate-400 text-[9px] shrink-0">
          Depth {stockfishEval.depth}
        </span>
      )}
    </div>
  );
};
