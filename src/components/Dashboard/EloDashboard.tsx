import React, { useState } from 'react';
import { PlayerProfile } from '../../types/chess';
import { 
  Trophy, 
  Flame, 
  Target, 
  Zap, 
  Timer, 
  Clock, 
  Award, 
  TrendingUp, 
  RotateCcw,
  Swords,
  ChevronRight
} from 'lucide-react';

interface EloDashboardProps {
  profile: PlayerProfile;
  onReviewMatch?: (matchId: string) => void;
}

const RATING_HISTORY = {
  bullet: [1420, 1450, 1490, 1510, 1540, 1525, 1560, 1580],
  blitz: [1500, 1520, 1565, 1590, 1610, 1630, 1615, 1645],
  rapid: [1600, 1630, 1655, 1670, 1700, 1690, 1715, 1720],
  classical: [1700, 1720, 1750, 1780, 1795, 1810],
  puzzle: [1650, 1720, 1800, 1850, 1890, 1920, 1940]
};

const OPENING_STATS = [
  { name: 'Italian Game', games: 54, winRate: 68, eco: 'C50' },
  { name: 'Sicilian Defense', games: 42, winRate: 62, eco: 'B20' },
  { name: "Queen's Gambit", games: 38, winRate: 59, eco: 'D30' },
  { name: 'Ruy Lopez', games: 31, winRate: 55, eco: 'C60' },
  { name: 'Caro-Kann', games: 24, winRate: 50, eco: 'B10' },
];

const RECENT_MATCHES = [
  {
    id: 'match-1',
    opponent: 'HikaruFan_99',
    opponentElo: 1740,
    result: 'win',
    type: '3 | 0 Blitz',
    accuracy: 89.4,
    opening: 'Italian Game: Giuoco Piano',
    date: 'Today, 2:15 PM',
    eloDelta: '+12'
  },
  {
    id: 'match-2',
    opponent: 'ScandinavianKnight',
    opponentElo: 1610,
    result: 'win',
    type: '5 | 0 Rapid',
    accuracy: 92.1,
    opening: 'Scandinavian Defense: Mieses-Kotroc',
    date: 'Yesterday, 8:40 PM',
    eloDelta: '+9'
  },
  {
    id: 'match-3',
    opponent: 'Stockfish GM (Bot)',
    opponentElo: 2750,
    result: 'loss',
    type: '10 | 0 Rapid',
    accuracy: 78.6,
    opening: 'Ruy Lopez: Berlin Defense',
    date: '2 days ago',
    eloDelta: '-4'
  },
  {
    id: 'match-4',
    opponent: 'QueenSacrifice',
    opponentElo: 1890,
    result: 'draw',
    type: '3 | 2 Blitz',
    accuracy: 86.8,
    opening: "Queen's Gambit Declined",
    date: '3 days ago',
    eloDelta: '+1'
  }
];

export const EloDashboard: React.FC<EloDashboardProps> = ({ profile }) => {
  const [activeCategory, setActiveCategory] = useState<'bullet' | 'blitz' | 'rapid' | 'classical' | 'puzzle'>('blitz');

  const ratingsMap = {
    bullet: profile.ratingBullet,
    blitz: profile.ratingBlitz,
    rapid: profile.ratingRapid,
    classical: profile.ratingClassical,
    puzzle: profile.ratingPuzzle
  };

  const currentCategoryRating = ratingsMap[activeCategory];
  const historyData = RATING_HISTORY[activeCategory];

  const winPercent = ((profile.wins / profile.totalGames) * 100).toFixed(1);
  const lossPercent = ((profile.losses / profile.totalGames) * 100).toFixed(1);
  const drawPercent = ((profile.draws / profile.totalGames) * 100).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Profile Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
              {profile.avatar}
            </div>
            {profile.title && (
              <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 text-xs font-black bg-amber-500 text-slate-950 rounded-md font-mono shadow-sm">
                {profile.title}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
                {profile.username}
              </h1>
              <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                {profile.country}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Active Member · FIDE Master Rank · Rated in all standard time controls
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                <Flame className="w-4 h-4" />
                <span>{profile.winStreak} Win Streak</span>
              </div>
              <span className="text-slate-600">·</span>
              <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                <Target className="w-4 h-4" />
                <span>{profile.avgAccuracy}% Avg Accuracy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Game Record */}
        <div className="flex items-center gap-4 sm:gap-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 w-full md:w-auto justify-around">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Games</span>
            <span className="text-xl font-mono font-extrabold text-slate-100">{profile.totalGames}</span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4 sm:pl-6">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Wins</span>
            <span className="text-xl font-mono font-extrabold text-emerald-400">{profile.wins}</span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4 sm:pl-6">
            <span className="text-[10px] uppercase font-bold text-rose-400 block">Losses</span>
            <span className="text-xl font-mono font-extrabold text-rose-400">{profile.losses}</span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4 sm:pl-6">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Draws</span>
            <span className="text-xl font-mono font-extrabold text-slate-400">{profile.draws}</span>
          </div>
        </div>
      </div>

      {/* Ratings Breakdown Segmented Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              Elo Rating Analytics
            </h2>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['bullet', 'blitz', 'rapid', 'classical', 'puzzle'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Card & Progression Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Current {activeCategory} Elo</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-4xl font-mono font-extrabold text-slate-100">
              {currentCategoryRating}
            </div>
            <div className="text-xs text-slate-400">
              Peak: <span className="font-mono text-slate-200 font-bold">{Math.max(...historyData)}</span> · Lowest: <span className="font-mono text-slate-200 font-bold">{Math.min(...historyData)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-medium">
              +{historyData[historyData.length - 1] - historyData[0]} rating points this season
            </div>
          </div>

          {/* Rating SVG Curve */}
          <div className="lg:col-span-8 bg-slate-950/80 p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Rating Progression (Last 8 Rating Milestones)</span>
              <span className="font-mono font-bold text-amber-400">Trend: Ascending</span>
            </div>

            <div className="h-36 flex items-end justify-between gap-3 pt-6 px-2">
              {historyData.map((val, idx) => {
                const min = Math.min(...historyData) - 50;
                const max = Math.max(...historyData) + 50;
                const heightPercent = Math.max(15, ((val - min) / (max - min)) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {val}
                    </span>
                    <div
                      className="w-full bg-linear-to-t from-amber-600/30 to-amber-400 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[9px] font-mono text-slate-400">
                      G{idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Opening Repertoire Performance & Recent Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Opening Repertoire */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold font-display text-slate-100">
              Opening Repertoire Mastery
            </h3>
            <span className="text-xs text-slate-400 font-mono">5 Openings</span>
          </div>

          <div className="space-y-3">
            {OPENING_STATS.map((op) => (
              <div key={op.name} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] px-1 py-0.2 bg-slate-800 rounded text-amber-400 font-bold">
                      {op.eco}
                    </span>
                    <span className="font-semibold text-slate-200">{op.name}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{op.winRate}% Win</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${op.winRate}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{op.games} matches played</span>
                  <span>Performance: 1,840</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Matches Log */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold font-display text-slate-100">
              Recent Competitive Matches
            </h3>
            <span className="text-xs text-slate-400 font-mono">Last 4 Games</span>
          </div>

          <div className="space-y-2.5">
            {RECENT_MATCHES.map((match) => (
              <div
                key={match.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                      match.result === 'win'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : match.result === 'loss'
                        ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {match.result === 'win' ? 'WIN' : match.result === 'loss' ? 'LOSS' : 'DRAW'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-100 truncate">
                        vs {match.opponent}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({match.opponentElo})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[240px]">
                      {match.opening} · {match.type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Accuracy</span>
                    <span className="text-xs font-mono font-bold text-slate-200">{match.accuracy}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rating</span>
                    <span className={`text-xs font-mono font-bold ${match.eloDelta.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {match.eloDelta}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
