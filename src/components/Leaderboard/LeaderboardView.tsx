import React, { useState } from 'react';
import { INITIAL_BOTS } from '../../utils/mockData';
import { UserStats } from '../../utils/storage';
import { BotProfile } from '../../types/chess';
import { 
  Trophy, 
  Bot, 
  Zap, 
  Award, 
  ShieldCheck, 
  Play, 
  ChevronRight, 
  Flame, 
  Crown,
  Medal,
  Star
} from 'lucide-react';

interface LeaderboardViewProps {
  stats: UserStats;
  onPlayBot: (bot: BotProfile) => void;
  onSolvePuzzle: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  stats,
  onPlayBot,
  onSolvePuzzle,
}) => {
  const [activeTab, setActiveTab] = useState<'bots' | 'puzzles'>('bots');

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
            <span>Grandmaster Ratings & Bot Ranks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
            Leaderboard & Tiers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Test your skills against the full hierarchy of tuned Stockfish bots or advance your tactical rating milestone tiers.
          </p>
        </div>

        {/* User Rank Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 shrink-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 text-xl font-bold">
            🏆
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Your Puzzle Rating</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {stats.puzzleRating} <span className="text-xs text-amber-400 font-normal">Elo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('bots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'bots'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Stockfish Engine Bots ({INITIAL_BOTS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('puzzles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'puzzles'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Tactics Milestones</span>
        </button>
      </div>

      {activeTab === 'bots' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INITIAL_BOTS.map((bot, index) => {
            const isHighest = index === 0 || bot.elo >= 2600;
            return (
              <div
                key={bot.id}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl hover:shadow-sky-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{bot.avatarIcon}</span>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{bot.name}</span>
                        {isHighest && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      </h3>
                      <span className="text-xs text-sky-400 font-mono font-bold">
                        {bot.elo} Elo
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Rank #{index + 1}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {bot.description}
                </p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Depth {bot.depth} · {bot.personality}
                  </span>
                  <button
                    onClick={() => onPlayBot(bot)}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
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
