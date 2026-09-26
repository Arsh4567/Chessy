import React from 'react';
import { Filter } from 'lucide-react';
import { ReportFilter } from '../../utils/chessReportEngine';

interface ReportFilterBarProps {
  filter: ReportFilter;
  setFilter: React.Dispatch<React.SetStateAction<ReportFilter>>;
  totalGamesFiltered: number;
  totalGamesImported: number;
  availableOpenings: string[];
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filter,
  setFilter,
  totalGamesFiltered,
  totalGamesImported,
  availableOpenings,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-md space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
        <Filter className="w-4 h-4 text-amber-400" />
        <span>Filters</span>
        <span className="text-[11px] text-slate-500 font-normal ml-auto">
          Showing {totalGamesFiltered} of {totalGamesImported} games
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Color Filter */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Side
          </label>
          <select
            value={filter.color}
            onChange={(e) => setFilter({ ...filter, color: e.target.value as any })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">All Colors</option>
            <option value="white">White ♔</option>
            <option value="black">Black ♚</option>
          </select>
        </div>

        {/* Time Class */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Time Control
          </label>
          <select
            value={filter.timeClass}
            onChange={(e) => setFilter({ ...filter, timeClass: e.target.value as any })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">All Controls</option>
            <option value="rapid">Rapid</option>
            <option value="blitz">Blitz</option>
            <option value="bullet">Bullet</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        {/* Time Period */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Time Period
          </label>
          <select
            value={filter.timePeriodDays}
            onChange={(e) => setFilter({ ...filter, timePeriodDays: Number(e.target.value) })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="0">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 1 Year</option>
          </select>
        </div>

        {/* Opening Filter */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Opening
          </label>
          <select
            value={filter.opening}
            onChange={(e) => setFilter({ ...filter, opening: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer truncate"
          >
            <option value="all">All Openings</option>
            {availableOpenings.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
