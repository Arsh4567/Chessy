import React from 'react';
import { AnalyzedGame } from '../../types/chess';
import { MoveMark } from '../ChessBoard/MoveMark';

interface GameAnalysisReportTabProps {
  analyzedData: AnalyzedGame | null;
}

export const GameAnalysisReportTab: React.FC<GameAnalysisReportTabProps> = ({
  analyzedData,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 text-slate-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
          Game Report & Analysis Breakdown
        </span>
        <span className="text-[10px] font-mono text-sky-400">
          {analyzedData?.analyzedMoves.length || 0} moves
        </span>
      </div>

      {analyzedData ? (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-bold text-slate-300">Overall Accuracy</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-slate-400 text-[10px]">White ({analyzedData.whiteAccuracy}%)</div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-sky-400 h-full rounded-full"
                    style={{ width: `${analyzedData.whiteAccuracy}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">Black ({analyzedData.blackAccuracy}%)</div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-sky-400 h-full rounded-full"
                    style={{ width: `${analyzedData.blackAccuracy}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-300">Move Quality Distribution</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between">
                <span className="text-cyan-400 flex items-center gap-1">
                  <MoveMark classification="brilliant" size={14} /> Brilliant
                </span>
                <span>{analyzedData.whiteBrilliants + analyzedData.blackBrilliants}</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between">
                <span className="text-emerald-400 flex items-center gap-1">
                  <MoveMark classification="best" size={14} /> Best
                </span>
                <span>{analyzedData.whiteBests + analyzedData.blackBests}</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between">
                <span className="text-emerald-400 flex items-center gap-1">
                  <MoveMark classification="excellent" size={14} /> Excellent
                </span>
                <span>{analyzedData.whiteExcellents + analyzedData.blackExcellents}</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between">
                <span className="text-blue-400 flex items-center gap-1">
                  <MoveMark classification="good" size={14} /> Good
                </span>
                <span>{analyzedData.whiteGoods + analyzedData.blackGoods}</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between">
                <span className="text-yellow-400 flex items-center gap-1">
                  <MoveMark classification="inaccuracy" size={14} /> Inaccuracy
                </span>
                <span>{analyzedData.whiteInaccuracies + analyzedData.blackInaccuracies}</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between">
                <span className="text-amber-400 flex items-center gap-1">
                  <MoveMark classification="mistake" size={14} /> Mistake
                </span>
                <span>{analyzedData.whiteMistakes + analyzedData.blackMistakes}</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg flex items-center justify-between col-span-2">
                <span className="text-rose-400 flex items-center gap-1">
                  <MoveMark classification="blunder" size={14} /> Blunder
                </span>
                <span>{analyzedData.whiteBlunders + analyzedData.blackBlunders}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-xs text-slate-400">
          No game analyzed yet. Play moves or load a PGN.
        </div>
      )}
    </div>
  );
};
