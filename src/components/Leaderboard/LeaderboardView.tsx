import React, { useState, useEffect } from 'react';
import { INITIAL_BOTS } from '../../utils/mockData';
import { UserStats } from '../../utils/storage';
import { BotProfile } from '../../types/chess';
import { ELO_TIERS, getEloTier, INITIAL_RATING } from '../../utils/eloRating';
import { subscribeToPublicLeaderboard, LeaderboardEntry } from '../../firebase/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { 
  Trophy, 
  Bot, 
  Zap, 
  Play, 
  Crown,
  Medal,
  Users,
  Sparkles,
  Cloud,
  ArrowUpRight
} from 'lucide-react';

interface LeaderboardViewProps {
  stats: UserStats;
  onPlayBot: (bot: BotProfile) => void;
  onSolvePuzzle: () => void;
  onPlayMultiplayer?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  stats,
  onPlayBot,
  onSolvePuzzle,
  onPlayMultiplayer,
}) => {
  const [activeTab, setActiveTab] = useState<'multiplayer' | 'bots' | 'puzzles'>('multiplayer');
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLb, setIsLoadingLb] = useState<boolean>(true);
  const { user } = useAuth();

  const mpRating = stats.multiplayerRating ?? INITIAL_RATING;
  const mpGames = stats.multiplayerGamesPlayed ?? 0;
  const currentTier = getEloTier(mpRating);

  useEffect(() => {
    const unsubscribe = subscribeToPublicLeaderboard(
      (entries) => {
        setLeaderboardList(entries);
        setIsLoadingLb(false);
      },
      (_err) => {
        setIsLoadingLb(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const puzzleTiers = [
    { title: 'Grandmaster Tactics', minRating: 2400, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', icon: '👑' },
    { title: 'Master Tactics', minRating: 2100, color: 'text-purple-400 border-purple-500/40 bg-purple-500/10', icon: '💎' },
    { title: 'Expert Tactics', minRating: 1800, color: 'text-sky-400 border-sky-500/40 bg-sky-500/10', icon: '⚔️' },
    { title: 'Club Player', minRating: 1500, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', icon: '🛡️' },
    { title: 'Tactical Novice', minRating: 1200, color: 'text-slate-400 border-slate-700 bg-slate-800/40', icon: '♟️' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>Grandmaster Ratings, Firebase Cloud Ranks & Elo Tiers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
            Leaderboard & Tiers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Climb the live Firebase multiplayer competitive ladder starting at 800 Elo, conquer tactical puzzle tiers, or challenge tuned Stockfish bots.
          </p>
        </div>

        {/* User Rank Dual Card */}
        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 shrink-0 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xl font-bold">
              {currentTier.icon}
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Multiplayer Elo</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {mpRating} <span className="text-xs text-amber-400 font-normal">Elo</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 shrink-0 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-xl font-bold text-sky-400">
              ⚡
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Tactics Rating</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {stats.puzzleRating} <span className="text-xs text-sky-400 font-normal">Elo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('multiplayer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'multiplayer'
              ? 'bg-sky-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Multiplayer Cloud Ladder</span>
        </button>

        <button
          onClick={() => setActiveTab('bots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'bots'
              ? 'bg-sky-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Stockfish Bots ({INITIAL_BOTS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('puzzles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'puzzles'
              ? 'bg-sky-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Tactics Milestones</span>
        </button>
      </div>

      {/* Tab 1: Multiplayer Elo Tiers & Cloud Ladder */}
      {activeTab === 'multiplayer' ? (
        <div className="space-y-6">
          {/* Rules Explanation Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Multiplayer Rating Calibration Rules</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-amber-400 font-bold block">1. Initial Rating: 800 Elo</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Every player starts at 800 Elo on their first multiplayer match.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-amber-400 font-bold block">2. First 7 Matches (Placement)</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Drastic volatility: <strong>around +100 for win</strong>, <strong>around -100 for loss</strong>, and <strong>0 for draw</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-sky-400 font-bold block">3. Matches 8+ (Established)</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Stable progression: <strong>+7 to +8 for win</strong>, <strong>-7 to -8 for loss</strong>, and <strong>0 for draw</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Firebase Leaderboard Table */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Live Firebase Cloud Leaderboard</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {leaderboardList.length} Registered Players
              </span>
            </div>

            {isLoadingLb ? (
              <div className="py-8 text-center text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                Loading Cloud Leaderboard from Firebase Firestore...
              </div>
            ) : leaderboardList.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-slate-400 text-sm">No other players recorded yet on this cloud database.</div>
                <div className="text-xs text-slate-500 font-mono">
                  Play your first multiplayer match or sign in with Google to establish your rank!
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Player</th>
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-3 text-right">Rating</th>
                      <th className="py-2.5 px-3 text-right">Matches</th>
                      <th className="py-2.5 px-3 text-right">Record (W-L-D)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {leaderboardList.map((entry, idx) => {
                      const isMe = user?.uid === entry.userId;
                      const tier = getEloTier(entry.multiplayerRating);
                      return (
                        <tr
                          key={entry.userId}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isMe ? 'bg-sky-500/10 text-white font-bold' : 'text-slate-300'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold">
                            {idx === 0 ? (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Crown className="w-3.5 h-3.5 fill-amber-400" /> #1
                              </span>
                            ) : idx === 1 ? (
                              <span className="text-slate-300 flex items-center gap-1">
                                <Medal className="w-3.5 h-3.5 text-slate-300" /> #2
                              </span>
                            ) : idx === 2 ? (
                              <span className="text-amber-600 flex items-center gap-1">
                                <Medal className="w-3.5 h-3.5 text-amber-600" /> #3
                              </span>
                            ) : (
                              <span>#{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {entry.photoURL ? (
                                <img src={entry.photoURL} alt="" className="w-5 h-5 rounded-full" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">
                                  {entry.displayName?.charAt(0) || 'P'}
                                </div>
                              )}
                              <span>{entry.displayName}</span>
                              {isMe && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  YOU
                                </span>
                              )}
                              {entry.multiplayerGamesPlayed < 7 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Placement Volatility active (Drastic ±100)">
                                  Placement {entry.multiplayerGamesPlayed}/7
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="flex items-center gap-1">
                              <span>{tier.icon}</span>
                              <span className="text-[11px] text-slate-400">{tier.name}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                            {entry.multiplayerRating} <span className="text-[10px] text-slate-500">Elo</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            {entry.multiplayerGamesPlayed}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            <span className="text-emerald-400">{entry.multiplayerWins}</span>-
                            <span className="text-rose-400">{entry.multiplayerLosses}</span>-
                            <span className="text-slate-400">{entry.multiplayerDraws}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Elo Tiers Hierarchy */}
          <div className="space-y-3 max-w-4xl mx-auto">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Competitive Elo Tiers
            </h2>
            {ELO_TIERS.map((tier) => {
              const isCurrent = currentTier.name === tier.name;
              const isAchieved = mpRating >= tier.minRating;
              return (
                <div
                  key={tier.name}
                  className={`p-5 rounded-3xl border transition-all flex items-center justify-between gap-4 ${
                    isCurrent
                      ? `${tier.badgeColor} ring-2 ring-sky-500/40 shadow-xl`
                      : isAchieved
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-950/40 border-slate-850 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{tier.icon}</span>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{tier.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-500 text-slate-950 font-black">
                            Your Current Tier
                          </span>
                        )}
                        {!isCurrent && isAchieved && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                            Achieved
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        Rating Requirement: {tier.minRating}+ Elo
                      </span>
                    </div>
                  </div>

                  {onPlayMultiplayer && (
                    <button
                      onClick={onPlayMultiplayer}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>Play Match</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'bots' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INITIAL_BOTS.map((bot, index) => {
            return (
              <div
                key={bot.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-750 transition-all flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                      {bot.avatarIcon || '🤖'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{bot.name}</span>
                        {bot.elo >= 2200 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      </h3>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {bot.elo} Elo
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Rank #{index + 1}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {bot.description}
                </p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    Depth {bot.depth} • {bot.personality}
                  </span>

                  <button
                    onClick={() => onPlayBot(bot)}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Challenge</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl mx-auto">
          {puzzleTiers.map((tier) => {
            const isUnlocked = stats.puzzleRating >= tier.minRating;
            return (
              <div
                key={tier.title}
                className={`p-5 rounded-3xl border transition-all flex items-center justify-between gap-4 ${
                  isUnlocked
                    ? `${tier.color} shadow-lg`
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{tier.icon}</span>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{tier.title}</span>
                      {isUnlocked ? (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-500 font-mono">
                          Locked
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Requirement: {tier.minRating}+ Rating
                    </span>
                  </div>
                </div>

                <button
                  onClick={onSolvePuzzle}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Train</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
