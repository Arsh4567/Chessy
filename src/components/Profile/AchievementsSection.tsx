import React, { useState, useMemo } from 'react';
import { AchievementSummary, AchievementCategory, AchievementTier } from '../../utils/achievements';
import { Award, CheckCircle2, Lock, Sparkles, Trophy, Swords, Zap, BookOpen } from 'lucide-react';

interface AchievementsSectionProps {
  summary: AchievementSummary;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({ summary }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AchievementCategory>('all');

  const filteredAchievements = useMemo(() => {
    return summary.achievements.filter((item) => {
      if (statusFilter === 'unlocked' && !item.isUnlocked) return false;
      if (statusFilter === 'locked' && item.isUnlocked) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [summary.achievements, statusFilter, categoryFilter]);

  const getTierStyles = (tier: AchievementTier, isUnlocked: boolean) => {
    if (!isUnlocked) {
      return {
        badge: 'text-slate-500 bg-slate-900 border-slate-800',
        border: 'border-slate-800/80 bg-slate-950/40 opacity-75',
        glow: '',
      };
    }
    switch (tier) {
      case 'diamond':
        return {
          badge: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
          border: 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 via-slate-950/70 to-slate-900/90 shadow-lg shadow-cyan-500/5',
          glow: 'text-cyan-400',
        };
      case 'gold':
        return {
          badge: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
          border: 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-950/70 to-slate-900/90 shadow-lg shadow-amber-500/5',
          glow: 'text-amber-400',
        };
      case 'silver':
        return {
          badge: 'text-slate-200 bg-slate-500/15 border-slate-400/40',
          border: 'border-slate-700 bg-gradient-to-br from-slate-900/60 via-slate-950/70 to-slate-900/90',
          glow: 'text-slate-300',
        };
      case 'bronze':
      default:
        return {
          badge: 'text-orange-300 bg-orange-500/15 border-orange-400/40',
          border: 'border-orange-900/40 bg-gradient-to-br from-orange-950/20 via-slate-950/70 to-slate-900/90',
          glow: 'text-orange-400',
        };
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
      {/* Header & Global Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Earned Badges & Achievements
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {summary.totalUnlocked} of {summary.totalAchievements} Unlocked
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete milestones across combat, tactics, ratings, and opening repertoires to unlock badges.
          </p>
        </div>

        {/* Global Progress Gauge */}
        <div className="min-w-[180px] p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 self-start sm:self-center">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Total Progress:</span>
            <span className="text-amber-400 font-bold">{summary.completionPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${summary.completionPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Tier Badges Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-orange-500/20 flex items-center justify-between">
          <span className="text-xs text-orange-300 flex items-center gap-1.5">
            <span>🥉</span> Bronze
          </span>
          <span className="font-mono font-bold text-white text-sm">{summary.tierCounts.bronze}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-500/20 flex items-center justify-between">
          <span className="text-xs text-slate-300 flex items-center gap-1.5">
            <span>🥈</span> Silver
          </span>
          <span className="font-mono font-bold text-white text-sm">{summary.tierCounts.silver}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-amber-500/20 flex items-center justify-between">
          <span className="text-xs text-amber-300 flex items-center gap-1.5">
            <span>🥇</span> Gold
          </span>
          <span className="font-mono font-bold text-white text-sm">{summary.tierCounts.gold}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-cyan-500/20 flex items-center justify-between">
          <span className="text-xs text-cyan-300 flex items-center gap-1.5">
            <span>💎</span> Diamond
          </span>
          <span className="font-mono font-bold text-white text-sm">{summary.tierCounts.diamond}</span>
        </div>
      </div>

      {/* Filters: Status & Category */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Status Filter */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/70 border border-slate-800">
          {(['all', 'unlocked', 'locked'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status === 'all' ? 'All' : status === 'unlocked' ? 'Unlocked' : 'In Progress'}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All', icon: Sparkles },
            { id: 'combat', label: 'Combat', icon: Swords },
            { id: 'tactics', label: 'Tactics', icon: Zap },
            { id: 'rating', label: 'Ratings', icon: Trophy },
            { id: 'openings', label: 'Openings', icon: BookOpen },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement Cards Grid */}
      {filteredAchievements.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAchievements.map((achievement) => {
            const styles = getTierStyles(achievement.tier, achievement.isUnlocked);
            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${styles.border}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shadow-inner shrink-0">
                        {achievement.icon}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{achievement.title}</span>
                          {achievement.isUnlocked && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </h4>
                        <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border inline-block mt-0.5 ${styles.badge}`}>
                          {achievement.tier}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {achievement.isUnlocked ? (
                        <span className="text-[10px] font-bold font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-slate-500 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {achievement.description}
                  </p>
                </div>

                {/* Progress Bar & Numerical Target */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">
                      Progress: {achievement.currentProgress} / {achievement.maxProgress}
                    </span>
                    <span className={`font-bold ${achievement.isUnlocked ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {achievement.progressPercent}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${achievement.progressPercent}%` }}
                      className={`h-full transition-all duration-300 ${
                        achievement.isUnlocked
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs space-y-2">
          <Award className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
          <div className="text-slate-400 font-medium">No achievements in this filter.</div>
          <button
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="text-amber-400 hover:underline font-bold text-xs cursor-pointer"
          >
            Clear filters to show all achievements →
          </button>
        </div>
      )}
    </div>
  );
};
