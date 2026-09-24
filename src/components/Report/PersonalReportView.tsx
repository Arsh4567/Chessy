import React, { useState, useMemo } from 'react';
import { ChessComGame, ChessComPlayer } from '../../utils/chessComApi';
import {
  generatePersonalChessReport,
  ReportFilter,
  OpeningStats,
  MistakePattern,
  StrengthArea,
  ImprovementPlanItem,
} from '../../utils/chessReportEngine';
import {
  BarChart3,
  Trophy,
  Swords,
  Shield,
  Zap,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Filter,
  RefreshCw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Search,
  Sparkles,
} from 'lucide-react';

interface PersonalReportViewProps {
  games: ChessComGame[];
  player?: ChessComPlayer | null;
  username: string;
  onAnalyzeGame: (pgn: string) => void;
  onRefreshGames?: () => void;
  isLoading?: boolean;
}

export const PersonalReportView: React.FC<PersonalReportViewProps> = ({
  games,
  player,
  username,
  onAnalyzeGame,
  onRefreshGames,
  isLoading = false,
}) => {
  // Filters state
  const [filter, setFilter] = useState<ReportFilter>({
    color: 'all',
    timeClass: 'all',
    opening: 'all',
    timePeriodDays: 0,
  });

  // Extract distinct openings for filter dropdown
  const availableOpenings = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.openingName) set.add(g.openingName);
    });
    return Array.from(set).sort();
  }, [games]);

  // Generate Report with Engine
  const report = useMemo(() => {
    return generatePersonalChessReport(games, username || 'Player', filter);
  }, [games, username, filter]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {player?.avatar ? (
            <img
              src={player.avatar}
              alt={username}
              className="w-14 h-14 rounded-2xl object-cover border border-amber-500/40 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl font-black text-amber-400">
              ♟️
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-display tracking-tight">
                Personal Chess Report
              </h1>
              {player?.title && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 font-mono">
                  {player.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Player: <span className="text-amber-400 font-bold">{username || 'Unknown'}</span> ·{' '}
              {report.overview.gamesAnalyzed} games analyzed with Stockfish
            </p>
          </div>
        </div>

        {onRefreshGames && (
          <button
            onClick={onRefreshGames}
            disabled={isLoading}
            className="self-start md:self-center px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Games</span>
          </button>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>Filters</span>
          <span className="text-[11px] text-slate-500 font-normal ml-auto">
            Showing {report.totalGamesFiltered} of {report.totalGamesImported} games
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

      {/* 1. Overview Section */}
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
              {report.overview.gamesAnalyzed}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Traceable to imports
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
            <span className="text-xs text-slate-400 font-medium">Win Rate</span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              {report.overview.hasEnoughData ? `${report.overview.winRate}%` : 'Not enough data'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Score: {report.overview.wins}W / {report.overview.losses}L / {report.overview.draws}D
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
            <span className="text-xs text-slate-400 font-medium">By Color</span>
            <div className="text-lg font-black font-mono text-slate-200 mt-1">
              ♔ <span className="text-amber-400">{report.overview.whiteWinRate}%</span> · ♚{' '}
              <span className="text-sky-400">{report.overview.blackWinRate}%</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              White vs Black Win Rate
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
            <span className="text-xs text-slate-400 font-medium">Avg Game Length</span>
            <div className="text-2xl font-black font-mono text-slate-100 mt-1">
              {report.overview.avgGameLengthMoves > 0
                ? `${report.overview.avgGameLengthMoves} moves`
                : 'Not enough data'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Moves per encounter
            </span>
          </div>
        </div>
      </div>

      {/* 2 & 3. White & Black Openings Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 2. White Openings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">♔</span>
              <h3 className="text-sm font-bold text-slate-100">2. White Openings</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {report.whiteOpenings.length} Repertoire Lines
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
            {report.whiteOpenings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Not enough data for White games under current filter.
              </div>
            ) : (
              report.whiteOpenings.map((op, idx) => (
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
              {report.blackOpenings.length} Defense Lines
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
            {report.blackOpenings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Not enough data for Black games under current filter.
              </div>
            ) : (
              report.blackOpenings.map((op, idx) => (
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

      {/* 4. Common Mistakes Analyzed with Stockfish */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            4. Common Mistakes (Stockfish Analyzed)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.commonMistakes.map((m) => (
            <div
              key={m.id}
              className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-100">{m.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      m.occurrences > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m.occurrences > 0 ? `${m.occurrences}x found` : 'Clean'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Affected Games:</span>
                <span className="font-bold text-slate-300">
                  {m.hasEnoughData
                    ? `${m.affectedGamesCount} (${m.percentageOfGames}%)`
                    : 'Not enough data'}
                </span>
              </div>

              {m.exampleMoveSan && (
                <div className="text-[10px] font-mono bg-slate-900 p-1.5 rounded text-amber-300/90 truncate">
                  Ex: {m.exampleMoveSan} {m.exampleOpponent ? `vs ${m.exampleOpponent}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5 & 6. Strong Areas & Areas for Improvement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 5. Strong Areas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
              5. Strong Areas
            </h2>
          </div>

          <div className="space-y-3">
            {report.strongAreas.map((sa) => (
              <div
                key={sa.id}
                className="bg-slate-950/60 border border-slate-800/90 p-3.5 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{sa.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      sa.rating === 'elite'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : sa.rating === 'strong'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {sa.hasEnoughData ? sa.rating : 'Not enough data'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="text-slate-400">{sa.metric}</span>
                  <span className="font-bold text-emerald-400">
                    {sa.hasEnoughData ? `${sa.scorePercent}%` : '—'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  {sa.hasEnoughData ? sa.supportingData : 'Needs >= 2 test positions'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Areas for Improvement */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
              6. Areas for Improvement
            </h2>
          </div>

          <div className="space-y-3">
            {report.areasForImprovement.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Not enough data or no severe recurring weaknesses found in this sample.
              </div>
            ) : (
              report.areasForImprovement.slice(0, 4).map((weak) => (
                <div
                  key={weak.id}
                  className="bg-slate-950/60 border border-slate-800/90 p-3.5 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{weak.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {weak.occurrences} instances
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{weak.description}</p>

                  <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>Frequency: {weak.percentageOfGames}% of games</span>
                    {weak.exampleMoveSan && (
                      <span className="text-amber-400 truncate max-w-[150px]">
                        Ex: {weak.exampleMoveSan}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 7. Opening Theory Report */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            7. Opening Report & Theory Departure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-300">Primary White Weapon</span>
            {report.openingReport.whiteMainOpening ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-amber-400">
                  {report.openingReport.whiteMainOpening.name}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {report.openingReport.whiteMainOpening.gamesCount} games ·{' '}
                  <span className="text-emerald-400 font-bold">
                    {report.openingReport.whiteMainOpening.winRate}% Win
                  </span>{' '}
                  · Avg Eval M10: {report.openingReport.whiteMainOpening.avgEvalAfterOpening}
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Average theoretical departure: Move{' '}
                  <span className="font-mono font-bold text-slate-300">
                    {report.openingReport.whiteTheoryDivergence.hasEnoughData
                      ? report.openingReport.whiteTheoryDivergence.avgMove
                      : 'Not enough data'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Not enough data</div>
            )}
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-300">Primary Black Defense</span>
            {report.openingReport.blackMainOpening ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-sky-400">
                  {report.openingReport.blackMainOpening.name}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {report.openingReport.blackMainOpening.gamesCount} games ·{' '}
                  <span className="text-emerald-400 font-bold">
                    {report.openingReport.blackMainOpening.winRate}% Win
                  </span>{' '}
                  · Avg Eval M10: {report.openingReport.blackMainOpening.avgEvalAfterOpening}
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Average theoretical departure: Move{' '}
                  <span className="font-mono font-bold text-slate-300">
                    {report.openingReport.blackTheoryDivergence.hasEnoughData
                      ? report.openingReport.blackTheoryDivergence.avgMove
                      : 'Not enough data'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Not enough data</div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Data-Backed Improvement Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            8. Improvement Plan (Data-Backed)
          </h2>
        </div>

        <div className="space-y-3">
          {report.improvementPlan.map((plan, idx) => (
            <div
              key={plan.id}
              className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-200">{plan.area}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    plan.priority === 'high'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {plan.priority} priority
                </span>
              </div>

              <div className="text-xs text-slate-300 font-medium">
                <span className="text-slate-400">Finding:</span> {plan.finding}
              </div>

              <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                <span className="text-amber-400 font-semibold">Evidence:</span> {plan.evidence}
              </div>

              <div className="text-xs text-emerald-300 font-semibold flex items-start gap-1.5 pt-1">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Action Step: {plan.actionableStep}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
