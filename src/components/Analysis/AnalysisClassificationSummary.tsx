import React from 'react';
import { AnalyzedGame, MoveClassification } from '../../types/chess';
import { MoveMark } from '../ChessBoard/MoveMark';
import { EvalGraph } from './EvalGraph';

interface AnalysisClassificationSummaryProps {
  analyzedData: AnalyzedGame;
  currentMoveIdx: number;
  onJumpToMove: (idx: number) => void;
}

export const AnalysisClassificationSummary: React.FC<AnalysisClassificationSummaryProps> = ({
  analyzedData,
  currentMoveIdx,
  onJumpToMove,
}) => {
  const jumpToClassification = (classification: MoveClassification) => {
    const idx = analyzedData.analyzedMoves.findIndex(
      (m, i) => i > currentMoveIdx && m.classification === classification
    );
    if (idx !== -1) {
      onJumpToMove(idx);
    } else {
      const firstIdx = analyzedData.analyzedMoves.findIndex(
        (m) => m.classification === classification
      );
      if (firstIdx !== -1) onJumpToMove(firstIdx);
    }
  };

  return (
    <div className="space-y-3">
      {/* Accuracy & Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-md">
        <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">White Accuracy</div>
          <div className="text-xl font-mono font-black text-slate-100 tabular-nums">
            {analyzedData.whiteAccuracy}%
          </div>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Black Accuracy</div>
          <div className="text-xl font-mono font-black text-slate-100 tabular-nums">
            {analyzedData.blackAccuracy}%
          </div>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-cyan-400 uppercase font-semibold flex items-center justify-center gap-1.5">
            <MoveMark classification="brilliant" size={16} />
            <span>Brilliant Moves</span>
          </div>
          <div className="text-xl font-mono font-black text-cyan-400 mt-0.5 tabular-nums">
            {analyzedData.whiteBrilliants + analyzedData.blackBrilliants}
          </div>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-rose-400 uppercase font-semibold flex items-center justify-center gap-1.5">
            <MoveMark classification="blunder" size={16} />
            <span>Blunders</span>
          </div>
          <div className="text-xl font-mono font-black text-rose-400 mt-0.5 tabular-nums">
            {analyzedData.whiteBlunders + analyzedData.blackBlunders}
          </div>
        </div>
      </div>

      {/* Evaluation Trajectory Graph */}
      <EvalGraph
        moves={analyzedData.analyzedMoves}
        currentMoveIndex={currentMoveIdx}
        onSelectMove={onJumpToMove}
        height={84}
      />

      {/* Move Quality Jump Filters */}
      <div className="flex items-center gap-2 flex-wrap bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-2xl text-xs">
        <span className="text-[11px] font-bold text-slate-400 px-1">Move Markers:</span>

        {/* Brilliant !! */}
        <button
          onClick={() => jumpToClassification('brilliant')}
          className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MoveMark classification="brilliant" size={18} />
          <span className="font-semibold">Brilliant</span>
          <span className="font-mono bg-cyan-950 px-1.5 py-0.2 rounded text-[10px] text-cyan-300 tabular-nums">
            {analyzedData.whiteBrilliants + analyzedData.blackBrilliants}
          </span>
        </button>

        {/* Best ! */}
        <button
          onClick={() => jumpToClassification('best')}
          className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MoveMark classification="best" size={18} />
          <span className="font-semibold">Best</span>
          <span className="font-mono bg-emerald-950 px-1.5 py-0.2 rounded text-[10px] text-emerald-300 tabular-nums">
            {analyzedData.whiteBests + analyzedData.blackBests}
          </span>
        </button>

        {/* Excellent ★ */}
        <button
          onClick={() => jumpToClassification('excellent')}
          className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MoveMark classification="excellent" size={18} />
          <span className="font-semibold">Excellent</span>
          <span className="font-mono bg-emerald-950 px-1.5 py-0.2 rounded text-[10px] text-emerald-400 tabular-nums">
            {analyzedData.whiteExcellents + analyzedData.blackExcellents}
          </span>
        </button>

        {/* Inaccuracy ?! */}
        <button
          onClick={() => jumpToClassification('inaccuracy')}
          className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MoveMark classification="inaccuracy" size={18} />
          <span className="font-semibold">Inaccuracy</span>
          <span className="font-mono bg-yellow-950 px-1.5 py-0.2 rounded text-[10px] text-yellow-300 tabular-nums">
            {analyzedData.whiteInaccuracies + analyzedData.blackInaccuracies}
          </span>
        </button>

        {/* Mistake ? */}
        <button
          onClick={() => jumpToClassification('mistake')}
          className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-amber-500/30 text-amber-300 hover:bg-amber-500/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MoveMark classification="mistake" size={18} />
          <span className="font-semibold">Mistake</span>
          <span className="font-mono bg-amber-950 px-1.5 py-0.2 rounded text-[10px] text-amber-300 tabular-nums">
            {analyzedData.whiteMistakes + analyzedData.blackMistakes}
          </span>
        </button>

        {/* Blunder ?? */}
        <button
          onClick={() => jumpToClassification('blunder')}
          className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-rose-500/30 text-rose-300 hover:bg-rose-500/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MoveMark classification="blunder" size={18} />
          <span className="font-semibold">Blunder</span>
          <span className="font-mono bg-rose-950 px-1.5 py-0.2 rounded text-[10px] text-rose-300 tabular-nums">
            {analyzedData.whiteBlunders + analyzedData.blackBlunders}
          </span>
        </button>
      </div>
    </div>
  );
};
