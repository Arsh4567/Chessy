import React, { useState } from 'react';
import { UserStats, SavedGame } from '../../utils/storage';
import { Trophy, Swords, Zap, RotateCcw, Play, Globe } from 'lucide-react';
import { ChessComExplorer } from '../ChessCom/ChessComExplorer';
import { ChessComGame, ChessComPlayer } from '../../utils/chessComApi';

interface StatsViewProps {
  stats: UserStats;
  onReviewGame: (pgn: string) => void;
  onResetStats: () => void;
  onOpenReport?: (games: ChessComGame[], player: ChessComPlayer | null, username: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  onReviewGame,
  onResetStats,
  onOpenReport,
}) => {
  const [activeSource, setActiveSource] = useState<'local' | 'chesscom'>('local');
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
      {/* View Switcher: Local vs Chess.com */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSource('local')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSource === 'local'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setActiveSource('chesscom')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSource === 'chesscom'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Chess.com</span>
          </button>
        </div>
      </div>

      {activeSource === 'chesscom' ? (
        <ChessComExplorer onSelectGame={onReviewGame} onOpenReport={onOpenReport} />
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Games</span>
              <div className="text-2xl font-black font-mono text-slate-100">{stats.gamesPlayed}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Win Rate</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{winRate}%</div>
            </div>

            <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Record</span>
              <div className="text-lg font-black font-mono text-slate-200">
                <span className="text-emerald-400">{stats.wins}</span> / <span className="text-rose-400">{stats.losses}</span> / <span className="text-slate-400">{stats.draws}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Puzzles</span>
              <div className="text-2xl font-black font-mono text-amber-400">{stats.puzzleRating}</div>
            </div>
          </div>

          {/* History */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Games</h3>
              </div>
              {stats.history.length > 0 && (
                <button
                  onClick={onResetStats}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
              {stats.history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No games recorded.
                </div>
              ) : (
                stats.history.map((g) => (
                  <div
                    key={g.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          g.result === 'win'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : g.result === 'loss'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                        }`}
                      >
                        {g.result}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{g.opponent}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {g.movesCount} moves · {g.timeControl} · {g.date}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onReviewGame(g.pgn)}
                      className="px-3 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Analysis
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
