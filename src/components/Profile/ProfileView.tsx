import React, { useState, useMemo } from 'react';
import { UserStats } from '../../utils/storage';
import { getEloTier, INITIAL_RATING } from '../../utils/eloRating';
import { useAuth } from '../../context/AuthContext';
import { computeOpeningAnalytics } from '../../utils/openingAnalytics';
import { evaluateAchievements } from '../../utils/achievements';
import { HistoricalEloGraph } from './HistoricalEloGraph';
import { OpeningsPerformance } from './OpeningsPerformance';
import { AchievementsSection } from './AchievementsSection';
import { GameHistoryFilterSort } from './GameHistoryFilterSort';
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
  Minus,
  Cloud,
  LogIn,
  LogOut,
  UserCheck,
  BookOpen,
  Swords,
  ChevronRight,
  Flame,
  LayoutDashboard
} from 'lucide-react';

interface ProfileViewProps {
  stats: UserStats;
  onReviewGame: (pgn: string) => void;
  onResetStats: () => Promise<void> | void;
  onNavigateToPlay: () => void;
  onNavigateToPuzzles: () => void;
  onNavigateToMultiplayer?: () => void;
  isSyncing?: boolean;
}

export type ProfileTab = 'dashboard' | 'openings' | 'achievements' | 'history';

export const ProfileView: React.FC<ProfileViewProps> = ({
  stats,
  onReviewGame,
  onResetStats,
  onNavigateToPlay,
  onNavigateToPuzzles,
  onNavigateToMultiplayer,
  isSyncing = false,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('dashboard');
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const { user, isAnonymous, openAuthModal, signOutUser } = useAuth();

  const handleExecuteReset = async () => {
    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      await onResetStats();
      setIsConfirmingReset(false);
      setResetSuccess('All statistics, match records, and rating progressions have been reset.');
      setTimeout(() => setResetSuccess(null), 4000);
    } catch (err: any) {
      setResetError(err?.message || 'Failed to reset cloud statistics. Please check your network connection.');
    } finally {
      setIsResetting(false);
    }
  };

  // Computations
  const openingAnalytics = useMemo(() => {
    return computeOpeningAnalytics(stats.multiplayerHistory || [], stats.history || []);
  }, [stats.multiplayerHistory, stats.history]);

  const achievementSummary = useMemo(() => {
    return evaluateAchievements(stats);
  }, [stats]);

  // Multiplayer metrics
  const mpGames = stats.multiplayerGamesPlayed ?? 0;
  const mpWins = stats.multiplayerWins ?? 0;
  const mpLosses = stats.multiplayerLosses ?? 0;
  const mpDraws = stats.multiplayerDraws ?? 0;
  const mpWinRate = mpGames > 0 ? Math.round((mpWins / mpGames) * 100) : 0;
  const mpRating = stats.multiplayerRating ?? INITIAL_RATING;
  const mpPeak = stats.multiplayerPeakRating ?? mpRating;
  const isPlacement = mpGames < 7;
  const tier = getEloTier(mpRating);

  // Bot & Local metrics
  const botGames = stats.gamesPlayed ?? 0;
  const botWins = stats.wins ?? 0;
  const botLosses = stats.losses ?? 0;
  const botDraws = stats.draws ?? 0;
  const botWinRate = botGames > 0 ? Math.round((botWins / botGames) * 100) : 0;

  // Combined totals
  const totalGames = mpGames + botGames;
  const totalWins = mpWins + botWins;
  const totalLosses = mpLosses + botLosses;
  const totalDraws = mpDraws + botDraws;
  const totalWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  // Recent form (last 5 multiplayer matches)
  const recentForm = useMemo(() => {
    return (stats.multiplayerHistory || []).slice(0, 5).map((m) => m.result);
  }, [stats.multiplayerHistory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Profile Header & Account Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'Avatar'} 
              className="w-14 h-14 rounded-2xl border border-slate-700/80 shadow-sm object-cover shrink-0" 
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-2xl shadow-sm text-sky-400 font-bold shrink-0">
              {tier.icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
                {user?.displayName || (isAnonymous ? 'Guest Player' : 'Player Profile')}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tier.badgeColor}`}>
                {tier.name}
              </span>
              {user && !isAnonymous && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span>Firebase Synced</span>
                </span>
              )}
              {isAnonymous && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-300 flex items-center gap-1">
                  <span>Guest Session</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {user?.email ? (
                <span>Connected as <strong className="text-slate-200">{user.email}</strong> · Cloud Synced</span>
              ) : isAnonymous ? (
                <span>Playing as guest. Upgrade to a registered account to preserve your rating and matches.</span>
              ) : (
                <span>Sign in to enable cloud persistence and real-time multiplayer leaderboard rankings.</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
          {user ? (
            <>
              {isAnonymous && (
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Create an account to save your progress"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Save Progress</span>
                </button>
              )}
              <button
                onClick={() => signOutUser()}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Sign out of Firebase"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
              title="Sign in or register to sync stats across devices in Firebase Firestore"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          {isConfirmingReset ? (
            <div className="flex items-center gap-1.5 p-1 bg-rose-950/70 border border-rose-500/50 rounded-xl">
              <span className="text-[11px] font-bold text-rose-300 px-2">Reset all data?</span>
              <button
                disabled={isResetting}
                onClick={handleExecuteReset}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {isResetting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Confirm</span>
              </button>
              <button
                disabled={isResetting}
                onClick={() => { setIsConfirmingReset(false); setResetError(null); }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingReset(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500/40 border border-slate-700/80 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Stats</span>
            </button>
          )}
        </div>
      </div>

      {resetError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <span>⚠️ {resetError}</span>
          <button onClick={() => setResetError(null)} className="text-rose-400 hover:text-white font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {resetSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <span>✓ {resetSuccess}</span>
          <button onClick={() => setResetSuccess(null)} className="text-emerald-400 hover:text-white font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {isSyncing && (
        <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-300 text-xs flex items-center gap-2 animate-pulse">
          <span className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Syncing latest stats from Firebase Firestore...</span>
        </div>
      )}

      {/* Primary Dashboard Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0c1424] border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('openings')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'openings'
              ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Opening Repertoire</span>
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'achievements'
              ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Achievements</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'history'
              ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Game History</span>
        </button>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics: Elo Rating & Placement Progression Hero */}
          <div className="p-6 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-400">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Multiplayer Rating & Progression System</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-bold font-mono text-white tabular-nums">
                    {mpRating}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Elo</span>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    (Peak: {mpPeak} Elo)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shadow-sm ${tier.badgeColor}`}>
                  <span>{tier.icon}</span>
                  <span>{tier.name} Tier</span>
                </span>
              </div>
            </div>

            {/* 7-Match Placement Progression Tracker */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  {isPlacement ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300">Placement Phase: {mpGames} of 7 Matches Completed</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Established Tournament Rating ({mpGames} matches played)</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {isPlacement ? 'Placement Volatility (±100 Elo)' : 'Stable Adjustments (±7 to ±8 Elo)'}
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
                      className={`flex-1 h-1.5 rounded-full transition-all ${
                        isCurrent
                          ? 'bg-amber-400 ring-2 ring-amber-400/20'
                          : isDone
                          ? 'bg-emerald-400'
                          : 'bg-slate-800'
                      }`}
                      title={`Placement Match ${num} of 7`}
                    />
                  );
                })}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {isPlacement
                  ? 'Every player starts at 800 Elo. During your first 7 matches, performance affects your rating drastically (±100 for win/loss, 0 for draw). After match 7, your rating stabilizes to standard competitive increments.'
                  : 'Placement phase complete! Your rating now adjusts stably with standard competitive precision (±7 to ±8 for win/loss, 0 for draw).'}
              </p>
            </div>

            {/* Quick Multiplayer Record Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Multiplayer Games</span>
                <div className="text-lg font-bold font-mono text-white mt-0.5 tabular-nums">{mpGames}</div>
                <span className="text-[11px] text-slate-500">Live online battles</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Win Rate</span>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">{mpWinRate}%</div>
                <span className="text-[11px] text-slate-500">{mpWins} wins</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Losses / Draws</span>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5 tabular-nums">
                  {mpLosses} <span className="text-xs text-slate-400 font-normal">/ {mpDraws}D</span>
                </div>
                <span className="text-[11px] text-slate-500">{mpLosses} losses recorded</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Tactics Rating</span>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5 tabular-nums">{stats.puzzleRating}</div>
                <span className="text-[11px] text-slate-500">{stats.puzzlesSolved} puzzles solved</span>
              </div>
            </div>
          </div>

          {/* Historical Elo Graph */}
          <HistoricalEloGraph
            history={stats.multiplayerHistory || []}
            currentRating={mpRating}
            peakRating={mpPeak}
            onSelectMatchPgn={onReviewGame}
          />

          {/* Win / Loss / Draw Record Cards & Ratio Visualizer */}
          <div className="p-6 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-400" />
                  <span>Win / Loss / Draw Performance Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed outcomes across competitive multiplayer and offline engine matches.
                </p>
              </div>

              {/* Recent Form Badge Strip */}
              {recentForm.length > 0 && (
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className="text-[11px] font-mono text-slate-400 mr-1">Recent Form:</span>
                  {recentForm.map((res, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-black ${
                        res === 'win'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : res === 'loss'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                      title={res.toUpperCase()}
                    >
                      {res === 'win' ? 'W' : res === 'loss' ? 'L' : 'D'}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Split Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Multiplayer Record Card */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Multiplayer Rated</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-400">{mpGames} Matches</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-300 uppercase block">Wins</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{mpWins}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/40">
                    <span className="text-[10px] text-slate-400 uppercase block">Draws</span>
                    <span className="text-lg font-black font-mono text-slate-300">{mpDraws}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20">
                    <span className="text-[10px] text-rose-300 uppercase block">Losses</span>
                    <span className="text-lg font-black font-mono text-rose-400">{mpLosses}</span>
                  </div>
                </div>

                {/* Ratio Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
                    {mpGames > 0 ? (
                      <>
                        <div style={{ width: `${(mpWins / mpGames) * 100}%` }} className="bg-emerald-400 h-full" title={`Wins: ${mpWins}`} />
                        <div style={{ width: `${(mpDraws / mpGames) * 100}%` }} className="bg-slate-500 h-full" title={`Draws: ${mpDraws}`} />
                        <div style={{ width: `${(mpLosses / mpGames) * 100}%` }} className="bg-rose-500 h-full" title={`Losses: ${mpLosses}`} />
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-800" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Win Rate: <strong className="text-emerald-400">{mpWinRate}%</strong></span>
                    <span>Loss Rate: <strong className="text-rose-400">{mpGames > 0 ? Math.round((mpLosses / mpGames) * 100) : 0}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Bot & Local Record Card */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Bot & Engine Matches</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">{botGames} Matches</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-300 uppercase block">Wins</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{botWins}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/40">
                    <span className="text-[10px] text-slate-400 uppercase block">Draws</span>
                    <span className="text-lg font-black font-mono text-slate-300">{botDraws}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20">
                    <span className="text-[10px] text-rose-300 uppercase block">Losses</span>
                    <span className="text-lg font-black font-mono text-rose-400">{botLosses}</span>
                  </div>
                </div>

                {/* Ratio Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
                    {botGames > 0 ? (
                      <>
                        <div style={{ width: `${(botWins / botGames) * 100}%` }} className="bg-emerald-400 h-full" title={`Wins: ${botWins}`} />
                        <div style={{ width: `${(botDraws / botGames) * 100}%` }} className="bg-slate-500 h-full" title={`Draws: ${botDraws}`} />
                        <div style={{ width: `${(botLosses / botGames) * 100}%` }} className="bg-rose-500 h-full" title={`Losses: ${botLosses}`} />
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-800" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Win Rate: <strong className="text-emerald-400">{botWinRate}%</strong></span>
                    <span>Loss Rate: <strong className="text-rose-400">{botGames > 0 ? Math.round((botLosses / botGames) * 100) : 0}%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Navigation Teasers to Openings & Achievements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setActiveTab('openings')}
                className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/60 transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Explore Opening Analysis
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {openingAnalytics.distinctOpeningsCount} openings detected · White {openingAnalytics.overallWhiteWinRate}% / Black {openingAnalytics.overallBlackWinRate}%
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => setActiveTab('achievements')}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 hover:border-amber-400/60 transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Career Achievements
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {achievementSummary.totalUnlocked} of {achievementSummary.totalAchievements} Badges Unlocked ({achievementSummary.completionPercent}%)
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. OPENING ANALYSIS */}
      {activeTab === 'openings' && (
        <OpeningsPerformance analytics={openingAnalytics} />
      )}

      {/* TAB CONTENT: 3. EARNED ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <AchievementsSection summary={achievementSummary} />
      )}

      {/* TAB CONTENT: 4. GAME ARCHIVE & FILTER/SORT */}
      {activeTab === 'history' && (
        <GameHistoryFilterSort
          multiplayerHistory={stats.multiplayerHistory || []}
          localHistory={stats.history || []}
          onReviewGame={onReviewGame}
          onNavigateToPlay={onNavigateToPlay}
          onNavigateToMultiplayer={onNavigateToMultiplayer}
        />
      )}
    </div>
  );
};
