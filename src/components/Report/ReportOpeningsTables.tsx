import React from 'react';
import { OpeningStats } from '../../utils/chessReportEngine';

interface ReportOpeningsTablesProps {
  whiteOpenings: OpeningStats[];
  blackOpenings: OpeningStats[];
}

export const ReportOpeningsTables: React.FC<ReportOpeningsTablesProps> = ({
  whiteOpenings,
  blackOpenings,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 2. White Openings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">♔</span>
            <h3 className="text-sm font-bold text-slate-100">2. White Openings</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {whiteOpenings.length} Repertoire Lines
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
          {whiteOpenings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Not enough data for White games under current filter.
            </div>
          ) : (
            whiteOpenings.map((op, idx) => (
              <div key={idx} className="p-3.5 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{op.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {op.gamesCount} game(s) · {op.wins}W / {op.losses}L / {op.draws}D
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {op.winRate}% Win
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Eval at M10:{' '}
                      <span
                        className={`font-bold ${
                          op.avgEvalAfterOpening > 0
                            ? 'text-emerald-400'
                            : op.avgEvalAfterOpening < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {op.avgEvalAfterOpening > 0
                          ? `+${op.avgEvalAfterOpening}`
                          : op.avgEvalAfterOpening}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Black Openings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">♚</span>
            <h3 className="text-sm font-bold text-slate-100">3. Black Openings</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {blackOpenings.length} Defense Lines
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
          {blackOpenings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Not enough data for Black games under current filter.
            </div>
          ) : (
            blackOpenings.map((op, idx) => (
              <div key={idx} className="p-3.5 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{op.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {op.gamesCount} game(s) · {op.wins}W / {op.losses}L / {op.draws}D
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {op.winRate}% Win
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Eval at M10:{' '}
                      <span
                        className={`font-bold ${
                          op.avgEvalAfterOpening > 0
                            ? 'text-emerald-400'
                            : op.avgEvalAfterOpening < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {op.avgEvalAfterOpening > 0
                          ? `+${op.avgEvalAfterOpening}`
                          : op.avgEvalAfterOpening}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
