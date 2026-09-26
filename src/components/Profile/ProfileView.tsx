import React from 'react';
import { UserStats } from '../../utils/storage';
import { 
  Trophy, 
  Target, 
  Zap, 
  RotateCcw, 
  Search, 
  Clock, 
  Award, 
  ShieldCheck, 
  Sparkles,
  BarChart2,
  Trash2
} from 'lucide-react';

interface ProfileViewProps {
  stats: UserStats;
  onReviewGame: (pgn: string) => void;
  onResetStats: () => void;
  onNavigateToPlay: () => void;
  onNavigateToPuzzles: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  stats,
  onReviewGame,
  onResetStats,
  onNavigateToPlay,
  onNavigateToPuzzles,
}) => {
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const lossRate = stats.gamesPlayed > 0 ? Math.round((stats.losses / stats.gamesPlayed) * 100) : 0;
  const drawRate = stats.gamesPlayed > 0 ? Math.max(0, 100 - winRate - lossRate) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Profile Dossier Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/20 text-white font-bold">
            ♟️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-display text-white">Grandmaster Profile</h1>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-[10px] font-mono text-sky-300">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personal match history, tactical rating, and engine evaluation dossier.
            </p>
          </div>
        </div>

        <button
          onClick={onResetStats}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500/40 border border-slate-700/80 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Stats</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Tactics Rating</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {stats.puzzleRating} <span className="text-xs text-slate-500 font-normal">Elo</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">{stats.puzzlesSolved} puzzles solved</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Win Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {winRate}%
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">{stats.wins} victories</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Games Played</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {stats.gamesPlayed}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">{stats.losses} losses · {stats.draws} draws</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Bot Mastery</span>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {stats.wins} <span className="text-xs text-slate-500 font-normal">wins</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">vs Stockfish Engine</span>
        </div>
      </div>

      {/* Saved Match History List */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Local Match History ({stats.history?.length || 0})</span>
          </h2>
        </div>

        {stats.history && stats.history.length > 0 ? (
          <div className="space-y-2.5">
            {stats.history.map((match, idx) => (
              <div
                key={match.id || idx}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                      match.result === 'win'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : match.result === 'loss'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      vs {match.opponent || 'Stockfish'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {match.date ? new Date(match.date).toLocaleDateString() : 'Recent'} · {match.movesCount || 0} moves
                    </div>
                  </div>
                </div>

                {match.pgn && (
                  <button
                    onClick={() => onReviewGame(match.pgn!)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 self-end sm:self-center"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Deep Review</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <div>No saved matches recorded yet.</div>
            <button
              onClick={onNavigateToPlay}
              className="text-sky-400 hover:underline font-bold"
            >
              Play your first match vs Stockfish →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
