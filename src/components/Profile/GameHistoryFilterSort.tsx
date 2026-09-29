import React, { useState, useMemo } from 'react';
import { MultiplayerMatchRecord, SavedGame } from '../../utils/storage';
import { extractOpeningFromPgn } from '../../utils/openingAnalytics';
import { 
  Search, 
  ArrowUpDown, 
  Filter, 
  RotateCcw, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Swords, 
  Users, 
  Cpu, 
  Calendar,
  Clock
} from 'lucide-react';

export interface UnifiedMatchItem {
  id: string;
  source: 'multiplayer' | 'local';
  opponentName: string;
  opponentRating: number;
  result: 'win' | 'loss' | 'draw';
  playerColor: 'w' | 'b';
  movesCount: number;
  timeControl?: string;
  pgn: string;
  dateStr: string;
  timestamp: number;
  ratingBefore?: number;
  ratingAfter?: number;
  ratingDelta?: number;
  isProvisional?: boolean;
  roomId?: string;
  openingName: string;
  openingEco: string;
}

interface GameHistoryFilterSortProps {
  multiplayerHistory: MultiplayerMatchRecord[];
  localHistory: SavedGame[];
  onReviewGame: (pgn: string) => void;
  onNavigateToPlay?: () => void;
  onNavigateToMultiplayer?: () => void;
}

export const GameHistoryFilterSort: React.FC<GameHistoryFilterSortProps> = ({
  multiplayerHistory = [],
  localHistory = [],
  onReviewGame,
  onNavigateToPlay,
  onNavigateToMultiplayer,
}) => {
  // Filter states
  const [sourceFilter, setSourceFilter] = useState<'all' | 'multiplayer' | 'local'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'w' | 'b'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'delta_desc' | 'delta_asc' | 'opp_desc' | 'opp_asc' | 'moves_desc' | 'moves_asc'
  >('date_desc');

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(20);

  // Normalize and combine all match records
  const allMatches: UnifiedMatchItem[] = useMemo(() => {
    const list: UnifiedMatchItem[] = [];

    // Map multiplayer matches
    multiplayerHistory.forEach((m, idx) => {
      const opening = extractOpeningFromPgn(m.pgn);
      let parsedTime = Date.now() - idx * 60000;
      if (m.createdAt) {
        const t = new Date(m.createdAt).getTime();
        if (!isNaN(t)) parsedTime = t;
      }

      list.push({
        id: m.id || `mp-${idx}`,
        source: 'multiplayer',
        opponentName: m.opponentName || 'Opponent',
        opponentRating: m.opponentRating || 800,
        result: m.result,
        playerColor: m.playerColor || 'w',
        movesCount: m.movesCount || 0,
        timeControl: m.timeControl || '5-0',
        pgn: m.pgn || '',
        dateStr: m.date || (m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Recent'),
        timestamp: parsedTime,
        ratingBefore: m.ratingBefore,
        ratingAfter: m.ratingAfter,
        ratingDelta: m.ratingDelta,
        isProvisional: m.isProvisional,
        roomId: m.roomId,
        openingName: opening.name,
        openingEco: opening.eco,
      });
    });

    // Map local / bot games
    localHistory.forEach((g, idx) => {
      const opening = extractOpeningFromPgn(g.pgn);
      let parsedTime = Date.now() - 1000000 - idx * 60000;
      if (g.date) {
        const t = new Date(g.date).getTime();
        if (!isNaN(t)) parsedTime = t;
      }

      list.push({
        id: g.id || `local-${idx}`,
        source: 'local',
        opponentName: g.opponent || 'Stockfish Bot',
        opponentRating: 1200,
        result: g.result,
        playerColor: 'w',
        movesCount: g.movesCount || 0,
        timeControl: g.timeControl || '5-0',
        pgn: g.pgn || '',
        dateStr: g.date || 'Recent',
        timestamp: parsedTime,
        openingName: opening.name,
        openingEco: opening.eco,
      });
    });

    return list;
  }, [multiplayerHistory, localHistory]);

  // Apply filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...allMatches];

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter((m) => m.source === sourceFilter);
    }

    // Result filter
    if (resultFilter !== 'all') {
      result = result.filter((m) => m.result === resultFilter);
    }

    // Side filter
    if (sideFilter !== 'all') {
      result = result.filter((m) => m.playerColor === sideFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.opponentName.toLowerCase().includes(q) ||
          m.openingName.toLowerCase().includes(q) ||
          m.openingEco.toLowerCase().includes(q) ||
          (m.roomId && m.roomId.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return a.timestamp - b.timestamp;
        case 'delta_desc':
          return (b.ratingDelta ?? 0) - (a.ratingDelta ?? 0);
        case 'delta_asc':
          return (a.ratingDelta ?? 0) - (b.ratingDelta ?? 0);
        case 'opp_desc':
          return b.opponentRating - a.opponentRating;
        case 'opp_asc':
          return a.opponentRating - b.opponentRating;
        case 'moves_desc':
          return b.movesCount - a.movesCount;
        case 'moves_asc':
          return a.movesCount - b.movesCount;
        case 'date_desc':
        default:
          return b.timestamp - a.timestamp;
      }
    });

    return result;
  }, [allMatches, sourceFilter, resultFilter, sideFilter, searchQuery, sortBy]);

  const displayedMatches = filteredAndSorted.slice(0, displayCount);

  const handleCopyPgn = (match: UnifiedMatchItem) => {
    if (!match.pgn) return;
    navigator.clipboard.writeText(match.pgn);
    setCopiedId(match.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClearFilters = () => {
    setSourceFilter('all');
    setResultFilter('all');
    setSideFilter('all');
    setSearchQuery('');
    setSortBy('date_desc');
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Game Archive & Match History
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300">
              {filteredAndSorted.length} of {allMatches.length} Games
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Filter, sort, and review your rated battles and bot matches with Stockfish deep engine analysis.
          </p>
        </div>

        {/* Source Pills Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/70 border border-slate-800 self-start sm:self-center">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => setSourceFilter('multiplayer')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'multiplayer'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Multiplayer ({multiplayerHistory.length})</span>
          </button>
          <button
            onClick={() => setSourceFilter('local')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'local'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>Bots & Local ({localHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Result, Side, and Sort */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opponent, room, opening..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Result Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            {(['all', 'win', 'loss', 'draw'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResultFilter(r)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer uppercase text-[11px] ${
                  resultFilter === r
                    ? r === 'win'
                      ? 'bg-emerald-500 text-slate-950'
                      : r === 'loss'
                      ? 'bg-rose-500 text-white'
                      : r === 'draw'
                      ? 'bg-slate-700 text-white'
                      : 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Side Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            {(['all', 'w', 'b'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                  sideFilter === s
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'all' ? 'Sides: All' : s === 'w' ? 'White ♙' : 'Black ♟'}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 font-mono text-xs focus:outline-none cursor-pointer pr-2"
            >
              <option value="date_desc" className="bg-slate-900 text-white">Date: Newest First</option>
              <option value="date_asc" className="bg-slate-900 text-white">Date: Oldest First</option>
              <option value="delta_desc" className="bg-slate-900 text-white">Rating Delta: Highest Gain</option>
              <option value="delta_asc" className="bg-slate-900 text-white">Rating Delta: Biggest Drop</option>
              <option value="opp_desc" className="bg-slate-900 text-white">Opponent: Highest Rated</option>
              <option value="opp_asc" className="bg-slate-900 text-white">Opponent: Lowest Rated</option>
              <option value="moves_desc" className="bg-slate-900 text-white">Game Length: Most Moves</option>
              <option value="moves_asc" className="bg-slate-900 text-white">Game Length: Fewest Moves</option>
            </select>
          </div>
        </div>
      </div>

      {/* Match Cards List */}
      {displayedMatches.length > 0 ? (
        <div className="space-y-3">
          {displayedMatches.map((match) => {
            const isExpanded = expandedMatchId === match.id;
            const hasDelta = match.ratingDelta !== undefined;
            const isPositiveDelta = (match.ratingDelta ?? 0) > 0;
            const isNegativeDelta = (match.ratingDelta ?? 0) < 0;

            return (
              <div
                key={match.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Result Badge, Opponent & Opening */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        match.result === 'win'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : match.result === 'loss'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {match.result === 'win' ? 'WIN' : match.result === 'loss' ? 'LOSS' : 'DRAW'}
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>vs {match.opponentName}</span>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          ({match.opponentRating} Elo)
                        </span>

                        {match.source === 'multiplayer' ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            match.isProvisional
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          }`}>
                            {match.isProvisional ? 'Placement Match' : 'Rated Live Match'}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            Engine Bot
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-indigo-300 font-semibold">{match.openingName}</span>
                        <span>·</span>
                        <span>Side: {match.playerColor === 'w' ? 'White ♙' : 'Black ♟'}</span>
                        <span>·</span>
                        <span>{match.movesCount} moves</span>
                        <span>·</span>
                        <span>{match.dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Rating Impact & Actions */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {/* Multiplayer Rating Delta Badge */}
                    {hasDelta && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg border ${
                            isPositiveDelta
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : isNegativeDelta
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}>
                            {isPositiveDelta ? `+${match.ratingDelta}` : match.ratingDelta}
                          </span>
                        </div>
                        {match.ratingAfter !== undefined && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            New: <span className="text-white font-bold">{match.ratingAfter}</span> Elo
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stockfish Engine Review */}
                    {match.pgn && (
                      <button
                        onClick={() => onReviewGame(match.pgn)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Analyze with Stockfish"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    )}

                    {/* Copy PGN Button */}
                    {match.pgn && (
                      <button
                        onClick={() => handleCopyPgn(match)}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                        title={copiedId === match.id ? 'PGN Copied to clipboard!' : 'Copy PGN notation'}
                      >
                        {copiedId === match.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Expand Details Toggle */}
                    {match.pgn && (
                      <button
                        onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                        className="p-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Toggle moves preview"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Move List Preview */}
                {isExpanded && match.pgn && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto select-all animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 border-b border-slate-800/80 pb-1">
                      <span>Full Match PGN String</span>
                      <span>{match.movesCount} total moves</span>
                    </div>
                    {match.pgn}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show More Pagination Button */}
          {filteredAndSorted.length > displayCount && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setDisplayCount((prev) => prev + 20)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Load More Matches ({filteredAndSorted.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs space-y-3">
          <Clock className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
          <div className="text-slate-400 font-medium">No matches found with current filter parameters.</div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleClearFilters}
              className="text-sky-400 hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
            {onNavigateToMultiplayer && (
              <>
                <span className="text-slate-600">·</span>
                <button
                  onClick={onNavigateToMultiplayer}
                  className="text-amber-400 hover:underline font-bold text-xs cursor-pointer"
                >
                  Play Rated Multiplayer Match →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
