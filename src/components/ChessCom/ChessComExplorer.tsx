import React, { useState, useEffect } from 'react';
import {
  fetchChessComRecentGames,
  ChessComPlayer,
  ChessComGame,
} from '../../utils/chessComApi';
import { Search, Loader2, ExternalLink, Play, AlertCircle, RefreshCw, Trophy, Swords, FileText } from 'lucide-react';

interface ChessComExplorerProps {
  onSelectGame: (pgn: string) => void;
  onOpenReport?: (games: ChessComGame[], player: ChessComPlayer | null, username: string) => void;
  initialUsername?: string;
}

const POPULAR_PLAYERS = ['hikaru', 'magnuscarlsen', 'gothamchess', 'dannyrench'];

export const ChessComExplorer: React.FC<ChessComExplorerProps> = ({
  onSelectGame,
  onOpenReport,
  initialUsername = '',
}) => {
  const [usernameInput, setUsernameInput] = useState(
    initialUsername || localStorage.getItem('chesscom_last_username') || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<ChessComPlayer | null>(null);
  const [games, setGames] = useState<ChessComGame[]>([]);
  const [searchedUser, setSearchedUser] = useState<string>('');

  const handleSearch = async (userToFetch?: string) => {
    const targetUser = (userToFetch || usernameInput).trim();
    if (!targetUser) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchChessComRecentGames(targetUser, 25);
      setPlayer(data.player);
      setGames(data.games);
      setSearchedUser(targetUser);
      localStorage.setItem('chesscom_last_username', targetUser);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve games from Chess.com');
      setPlayer(null);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUsername) {
      handleSearch(initialUsername);
    } else {
      const saved = localStorage.getItem('chesscom_last_username');
      if (saved) {
        handleSearch(saved);
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-md space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Chess.com username (e.g. hikaru)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !usernameInput.trim()}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching</span>
              </>
            ) : (
              <span>Search</span>
            )}
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Popular:</span>
          {POPULAR_PLAYERS.map((u) => (
            <button
              key={u}
              onClick={() => {
                setUsernameInput(u);
                handleSearch(u);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-950 border border-slate-800 text-slate-400 hover:text-sky-400 hover:border-slate-700 transition-colors cursor-pointer"
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-600/40 rounded-2xl flex items-start gap-3 text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Player Header Card */}
      {player && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.username}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-slate-300 shadow">
                {player.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                {player.title && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 font-mono">
                    {player.title}
                  </span>
                )}
                <span className="text-sm sm:text-base font-black text-slate-100 font-mono">
                  {player.username}
                </span>
                {player.name && (
                  <span className="text-xs text-slate-400 hidden sm:inline font-medium">
                    ({player.name})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Chess.com</span>
                {player.status && (
                  <span className="capitalize text-slate-500">· {player.status}</span>
                )}
              </div>
            </div>
          </div>

          {/* Player Ratings */}
          {player.stats && (
            <div className="flex flex-wrap items-center gap-2">
              {player.stats.rapid !== undefined && (
                <div className="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Rapid</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{player.stats.rapid}</span>
                </div>
              )}
              {player.stats.blitz !== undefined && (
                <div className="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Blitz</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{player.stats.blitz}</span>
                </div>
              )}
              {player.stats.bullet !== undefined && (
                <div className="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Bullet</span>
                  <span className="text-xs font-mono font-bold text-sky-400">{player.stats.bullet}</span>
                </div>
              )}
              {player.stats.puzzle !== undefined && (
                <div className="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Tactics</span>
                  <span className="text-xs font-mono font-bold text-purple-400">{player.stats.puzzle}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Games List */}
      {player && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                Recent Games ({games.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {onOpenReport && games.length > 0 && (
                <button
                  onClick={() => onOpenReport(games, player, searchedUser || usernameInput)}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Personal Report</span>
                </button>
              )}
              <button
                onClick={() => handleSearch(searchedUser)}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[460px] overflow-y-auto">
            {games.length === 0 && !loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No recent public games found in current archives.
              </div>
            ) : (
              games.map((g) => (
                <div
                  key={g.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase shrink-0 mt-0.5 ${
                        g.userResult === 'win'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : g.userResult === 'loss'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                      }`}
                    >
                      {g.userResult}
                    </span>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          vs {g.opponentName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({g.opponentRating || '?'})
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {g.userColor === 'white' ? 'White ♔' : 'Black ♚'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {g.openingName ? (
                          <span className="text-sky-400/90 mr-2">{g.openingName}</span>
                        ) : null}
                        <span>{g.timeControl}</span> · <span>{g.movesCount} moves</span> ·{' '}
                        <span>{g.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {g.url && (
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="View on Chess.com"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onSelectGame(g.pgn)}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Analysis</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
