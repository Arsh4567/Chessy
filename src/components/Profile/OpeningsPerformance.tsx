import React, { useState, useMemo } from 'react';
import { OpeningsAnalysisSummary, OpeningStat } from '../../utils/openingAnalytics';
import { BookOpen, Search, Trophy, Sparkles, Swords, ArrowUpDown, ChevronRight } from 'lucide-react';

interface OpeningsPerformanceProps {
  analytics: OpeningsAnalysisSummary;
  onExploreOpening?: (openingName: string) => void;
}

export const OpeningsPerformance: React.FC<OpeningsPerformanceProps> = ({
  analytics,
  onExploreOpening,
}) => {
  const [colorFilter, setColorFilter] = useState<'all' | 'w' | 'b'>('all');
  const [sortBy, setSortBy] = useState<'games' | 'winrate' | 'wins'>('games');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredAndSortedOpenings = useMemo(() => {
    let list = [...analytics.openings];

    // Filter by color participation if selected
    if (colorFilter === 'w') {
      list = list.filter((o) => o.whiteGames > 0);
    } else if (colorFilter === 'b') {
      list = list.filter((o) => o.blackGames > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.eco.toLowerCase().includes(q) ||
          o.moves.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'winrate') {
        const rateA = colorFilter === 'w' ? a.whiteWinRate : colorFilter === 'b' ? a.blackWinRate : a.winRate;
        const rateB = colorFilter === 'w' ? b.whiteWinRate : colorFilter === 'b' ? b.blackWinRate : b.winRate;
        if (rateB !== rateA) return rateB - rateA;
        return b.gamesPlayed - a.gamesPlayed;
      }
      if (sortBy === 'wins') {
        const winsA = colorFilter === 'w' ? a.whiteWins : colorFilter === 'b' ? a.blackWins : a.wins;
        const winsB = colorFilter === 'w' ? b.whiteWins : colorFilter === 'b' ? b.blackWins : b.wins;
        if (winsB !== winsA) return winsB - winsA;
        return b.gamesPlayed - a.gamesPlayed;
      }
      // default: games
      const gamesA = colorFilter === 'w' ? a.whiteGames : colorFilter === 'b' ? a.blackGames : a.gamesPlayed;
      const gamesB = colorFilter === 'w' ? b.whiteGames : colorFilter === 'b' ? b.blackGames : b.gamesPlayed;
      return gamesB - gamesA;
    });

    return list;
  }, [analytics.openings, colorFilter, sortBy, searchQuery]);

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Performance Analysis by Opening
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              {analytics.distinctOpeningsCount} Unique Openings Explored
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Repertoire mastery, win rates, and tactical tendencies automatically detected from your games.
          </p>
        </div>

        {/* Quick Side Balance */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">White Win Rate:</span>
            <span className="text-emerald-400 font-bold">{analytics.overallWhiteWinRate}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Black Win Rate:</span>
            <span className="text-emerald-400 font-bold">{analytics.overallBlackWinRate}%</span>
          </div>
        </div>
      </div>

      {/* Repertoire Spotlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {analytics.favoriteOpening ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950/60 to-slate-900/80 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-indigo-300 font-mono">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Most Played Repertoire</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-200 font-bold font-mono">
                {analytics.favoriteOpening.eco}
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {analytics.favoriteOpening.name}
            </div>
            <div className="flex items-baseline justify-between text-xs font-mono">
              <span className="text-slate-400">
                {analytics.favoriteOpening.gamesPlayed} games played
              </span>
              <span className="font-bold text-indigo-300">
                {analytics.favoriteOpening.winRate}% Win Rate
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-500 italic">
            Play games to reveal your favorite opening
          </div>
        )}

        {analytics.bestOpening ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-950/60 to-slate-900/80 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-emerald-300 font-mono">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Highest Win Rate Opening</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 font-bold font-mono">
                {analytics.bestOpening.eco}
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {analytics.bestOpening.name}
            </div>
            <div className="flex items-baseline justify-between text-xs font-mono">
              <span className="text-slate-400">
                {analytics.bestOpening.wins}W - {analytics.bestOpening.draws}D - {analytics.bestOpening.losses}L
              </span>
              <span className="font-bold text-emerald-400 text-sm">
                {analytics.bestOpening.winRate}% Win Rate
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-500 italic">
            Play games to benchmark your best opening
          </div>
        )}

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950/60 via-slate-950/40 to-slate-900/80 border border-slate-800 space-y-2 col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-slate-400" />
              <span>Theoretical Breadth</span>
            </span>
          </div>
          <div className="text-sm font-bold text-white">
            {analytics.distinctOpeningsCount} Unique Formations
          </div>
          <div className="text-xs text-slate-400 leading-snug">
            {analytics.totalGamesAnalyzed} total matches parsed for opening theory and variations.
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Side Filter, and Sorting */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opening or ECO (e.g. Sicilian, C50)..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Side Filter */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/70 border border-slate-800">
            {(['all', 'w', 'b'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setColorFilter(side)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  colorFilter === side
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {side === 'all' ? 'All Sides' : side === 'w' ? 'White ♙' : 'Black ♟'}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 font-mono text-xs focus:outline-none cursor-pointer pr-2"
            >
              <option value="games" className="bg-slate-900 text-white">Most Games</option>
              <option value="winrate" className="bg-slate-900 text-white">Highest Win Rate</option>
              <option value="wins" className="bg-slate-900 text-white">Most Wins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opening Cards List */}
      {filteredAndSortedOpenings.length > 0 ? (
        <div className="space-y-3">
          {filteredAndSortedOpenings.map((opening, idx) => {
            const displayGames = colorFilter === 'w' ? opening.whiteGames : colorFilter === 'b' ? opening.blackGames : opening.gamesPlayed;
            const displayWins = colorFilter === 'w' ? opening.whiteWins : colorFilter === 'b' ? opening.blackWins : opening.wins;
            const displayLosses = colorFilter === 'w' ? opening.whiteLosses : colorFilter === 'b' ? opening.blackLosses : opening.losses;
            const displayDraws = colorFilter === 'w' ? opening.whiteDraws : colorFilter === 'b' ? opening.blackDraws : opening.draws;
            const displayRate = colorFilter === 'w' ? opening.whiteWinRate : colorFilter === 'b' ? opening.blackWinRate : opening.winRate;

            const winPct = displayGames > 0 ? (displayWins / displayGames) * 100 : 0;
            const drawPct = displayGames > 0 ? (displayDraws / displayGames) * 100 : 0;
            const lossPct = displayGames > 0 ? (displayLosses / displayGames) * 100 : 0;

            return (
              <div
                key={`${opening.eco}_${opening.name}_${idx}`}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                      {opening.eco}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {opening.name}
                      </h4>
                      {opening.moves && (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Key Moves: <span className="text-slate-300">{opening.moves}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className={`text-base font-black font-mono ${
                          displayRate >= 60
                            ? 'text-emerald-400'
                            : displayRate <= 35
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}>
                          {displayRate}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Win Rate</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {displayWins}W · {displayDraws}D · {displayLosses}L ({displayGames} games)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segmented Win/Draw/Loss Visual Ratio Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800/80">
                    {winPct > 0 && (
                      <div
                        style={{ width: `${winPct}%` }}
                        className="bg-emerald-400 h-full transition-all"
                        title={`Wins: ${displayWins} (${Math.round(winPct)}%)`}
                      />
                    )}
                    {drawPct > 0 && (
                      <div
                        style={{ width: `${drawPct}%` }}
                        className="bg-slate-500 h-full transition-all"
                        title={`Draws: ${displayDraws} (${Math.round(drawPct)}%)`}
                      />
                    )}
                    {lossPct > 0 && (
                      <div
                        style={{ width: `${lossPct}%` }}
                        className="bg-rose-500 h-full transition-all"
                        title={`Losses: ${displayLosses} (${Math.round(lossPct)}%)`}
                      />
                    )}
                  </div>

                  {/* Detail Breakdown Badges */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                    <div className="flex items-center gap-3">
                      <span>White: {opening.whiteWins}W/{opening.whiteGames}G ({opening.whiteWinRate}%)</span>
                      <span>·</span>
                      <span>Black: {opening.blackWins}W/{opening.blackGames}G ({opening.blackWinRate}%)</span>
                    </div>
                    <span>Avg Length: {opening.avgMoves} moves</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
          <div className="text-slate-400 font-medium">No openings matched your current filter.</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Play more games or broaden your search criteria to populate comprehensive opening statistics.
          </p>
        </div>
      )}
    </div>
  );
};
