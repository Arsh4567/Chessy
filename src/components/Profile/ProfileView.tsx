import React, { useState } from 'react';
import { UserStats } from '../../utils/storage';
import { getEloTier, INITIAL_RATING } from '../../utils/eloRating';
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
  Trash2,
  Users,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface ProfileViewProps {
  stats: UserStats;
  onReviewGame: (pgn: string) => void;
  onResetStats: () => void;
  onNavigateToPlay: () => void;
  onNavigateToPuzzles: () => void;
  onNavigateToMultiplayer?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  stats,
  onReviewGame,
  onResetStats,
  onNavigateToPlay,
  onNavigateToPuzzles,
  onNavigateToMultiplayer,
}) => {
  const [historyTab, setHistoryTab] = useState<'multiplayer' | 'local'>('multiplayer');

  const botWinRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  
  const mpGames = stats.multiplayerGamesPlayed ?? 0;
  const mpWins = stats.multiplayerWins ?? 0;
  const mpLosses = stats.multiplayerLosses ?? 0;
  const mpDraws = stats.multiplayerDraws ?? 0;
  const mpWinRate = mpGames > 0 ? Math.round((mpWins / mpGames) * 100) : 0;
  const mpRating = stats.multiplayerRating ?? INITIAL_RATING;
  const mpPeak = stats.multiplayerPeakRating ?? mpRating;
  const isPlacement = mpGames < 7;
  const tier = getEloTier(mpRating);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Profile Dossier Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/20 text-white font-bold shrink-0">
            {tier.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black font-display text-white">Grandmaster Profile</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tier.badgeColor}`}>
                {tier.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-[10px] font-mono text-sky-300">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multiplayer Elo rating dossier, tactical puzzle rating, and engine evaluation history.
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

      {/* Multiplayer Elo Rating Hero Section */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-[#0b1220] border border-amber-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
              <Trophy className="w-4 h-4" />
              <span>Multiplayer Rating & Progression System</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                {mpRating}
              </span>
              <span className="text-sm font-bold text-slate-400">Elo</span>
              <span className="text-xs font-mono text-slate-500">
                (Peak: {mpPeak} Elo)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm ${tier.badgeColor}`}>
              <span className="text-base">{tier.icon}</span>
              <span>{tier.name} Tier</span>
            </span>
          </div>
        </div>

        {/* 7-Match Placement Progression Tracker */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5">
              {isPlacement ? (
                <>
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">Placement Phase: {mpGames} of 7 Matches Completed</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Established Tournament Rating ({mpGames} matches played)</span>
                </>
              )}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {isPlacement ? 'High Performance Volatility (±100 Elo)' : 'Stable Adjustments (±7 to ±8 Elo)'}
            </span>
          </div>

          {/* 7-Pip Step Progress Bar */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const isDone = num <= mpGames;
              const isCurrent = num === mpGames + 1;
              return (
                <div
                  key={num}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-amber-400 ring-2 ring-amber-400/30'
                      : isDone
                      ? 'bg-emerald-400'
                      : 'bg-slate-800'
                  }`}
                  title={`Placement Match ${num} of 7`}
                />
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isPlacement
              ? 'Every player starts at 800 Elo. During your first 7 matches, performance affects your rating drastically (±100 for win/loss, 0 for draw). After match 7, your rating stabilizes to ±7 or ±8.'
              : 'Placement phase complete! Your rating now adjusts stably with standard competitive precision (±7 to ±8 for win/loss, 0 for draw).'}
          </p>
        </div>

        {/* Quick Multiplayer Record Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400">Multiplayer Games</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{mpGames}</div>
            <span className="text-[10px] text-slate-500">Live online matches</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400">Win Rate</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{mpWinRate}%</div>
            <span className="text-[10px] text-slate-500">{mpWins} wins</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400">Losses</span>
            <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">{mpLosses}</div>
            <span className="text-[10px] text-slate-500">{mpDraws} draws</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400">Peak Rating</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{mpPeak}</div>
            <span className="text-[10px] text-slate-500">All-time high</span>
          </div>
        </div>
      </div>

      {/* Other Metrics Row (Tactics & Bot Play) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Tactics Rating</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {stats.puzzleRating} <span className="text-xs text-slate-500 font-normal">Elo</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">{stats.puzzlesSolved} puzzles solved</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Bot Win Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {botWinRate}%
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">{stats.wins} victories</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Bot Games</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {stats.gamesPlayed}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">{stats.losses} losses · {stats.draws} draws</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400">Engine Mastery</span>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {stats.wins} <span className="text-xs text-slate-500 font-normal">wins</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">vs Stockfish Engine</span>
        </div>
      </div>

      {/* Match History Tabs */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryTab('multiplayer')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                historyTab === 'multiplayer'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Multiplayer Rated Games ({stats.multiplayerHistory?.length || 0})</span>
            </button>

            <button
              onClick={() => setHistoryTab('local')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                historyTab === 'local'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Bot & Local Games ({stats.history?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Multiplayer Match History */}
        {historyTab === 'multiplayer' ? (
          stats.multiplayerHistory && stats.multiplayerHistory.length > 0 ? (
            <div className="space-y-2.5">
              {stats.multiplayerHistory.map((match, idx) => (
                <div
                  key={match.id || idx}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
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
                      <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>vs {match.opponentName || 'Opponent'}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({match.opponentRating || 800} Elo)
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          match.isProvisional
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        }`}>
                          {match.isProvisional ? 'Placement Match' : 'Established Match'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {match.date} · Room: {match.roomId} · {match.movesCount || 0} moves
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Rating Delta Badge */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg border ${
                          match.ratingDelta > 0
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : match.ratingDelta < 0
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        New: <span className="text-white font-bold">{match.ratingAfter}</span> Elo
                      </div>
                    </div>

                    {match.pgn && (
                      <button
                        onClick={() => onReviewGame(match.pgn)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Review with Stockfish Analyzer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <div>No multiplayer matches recorded yet.</div>
              {onNavigateToMultiplayer && (
                <button
                  onClick={onNavigateToMultiplayer}
                  className="text-sky-400 hover:underline font-bold"
                >
                  Create or join a live multiplayer match room →
                </button>
              )}
            </div>
          )
        ) : (
          /* Bot / Local History */
          stats.history && stats.history.length > 0 ? (
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
              <div>No saved bot matches recorded yet.</div>
              <button
                onClick={onNavigateToPlay}
                className="text-sky-400 hover:underline font-bold"
              >
                Play your first match vs Stockfish →
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
