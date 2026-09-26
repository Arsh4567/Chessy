import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PersonalChessReport } from '../../utils/chessReportEngine';

interface ReportOverviewCardsProps {
  overview: PersonalChessReport['overview'];
}

export const ReportOverviewCards: React.FC<ReportOverviewCardsProps> = ({
  overview,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
          1. Overview
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-xs text-slate-400 font-medium">Games Analyzed</span>
          <div className="text-2xl font-black font-mono text-slate-100 mt-1">
            {overview.gamesAnalyzed}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Traceable to imports
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-xs text-slate-400 font-medium">Win Rate</span>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
            {overview.hasEnoughData ? `${overview.winRate}%` : 'Not enough data'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Score: {overview.wins}W / {overview.losses}L / {overview.draws}D
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-xs text-slate-400 font-medium">By Color</span>
          <div className="text-lg font-black font-mono text-slate-200 mt-1">
            ♔ <span className="text-amber-400">{overview.whiteWinRate}%</span> · ♚{' '}
            <span className="text-sky-400">{overview.blackWinRate}%</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            White vs Black Win Rate
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-xs text-slate-400 font-medium">Avg Game Length</span>
          <div className="text-2xl font-black font-mono text-slate-100 mt-1">
            {overview.avgGameLengthMoves > 0
              ? `${overview.avgGameLengthMoves} moves`
              : 'Not enough data'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Moves per encounter
          </span>
        </div>
      </div>
    </div>
  );
};
