import { UserStats } from './storage';
import { extractOpeningFromPgn } from './openingAnalytics';

export type AchievementCategory = 'combat' | 'tactics' | 'rating' | 'openings' | 'mastery';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  isUnlocked: boolean;
  currentProgress: number;
  maxProgress: number;
  progressPercent: number;
  unlockedAt?: string;
  rewardXp: number;
}

export interface AchievementSummary {
  achievements: Achievement[];
  totalUnlocked: number;
  totalAchievements: number;
  completionPercent: number;
  tierCounts: {
    bronze: number;
    silver: number;
    gold: number;
    diamond: number;
  };
}

/**
 * Calculates current and historical achievements for the user based on stats.
 */
export function evaluateAchievements(stats: UserStats): AchievementSummary {
  const mpGames = stats.multiplayerGamesPlayed ?? 0;
  const mpWins = stats.multiplayerWins ?? 0;
  const mpRating = stats.multiplayerRating ?? 800;
  const mpPeak = stats.multiplayerPeakRating ?? mpRating;
  const botWins = stats.wins ?? 0;
  const totalWins = mpWins + botWins;
  const totalGames = mpGames + (stats.gamesPlayed ?? 0);
  const puzzlesSolved = stats.puzzlesSolved ?? 0;
  const puzzleRating = stats.puzzleRating ?? 1500;

  // Compute longest win streak and current win streak from multiplayer history
  let currentStreak = 0;
  let maxStreak = 0;
  let countingCurrent = true;
  let quickWins = 0;
  let marathonGames = 0;
  let whiteWins = 0;
  let blackWins = 0;
  const distinctOpenings = new Set<string>();

  const allMatches = [
    ...(stats.multiplayerHistory || []),
    ...(stats.history || []).map((h) => ({
      ...h,
      playerColor: 'w' as const,
      opponentRating: 1200,
    })),
  ];

  for (const match of stats.multiplayerHistory || []) {
    if (match.result === 'win') {
      if (countingCurrent) currentStreak++;
    } else {
      countingCurrent = false;
    }
  }

  // Calculate overall max streak
  let tempStreak = 0;
  for (let i = allMatches.length - 1; i >= 0; i--) {
    if (allMatches[i].result === 'win') {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  // Inspect moves count and openings from matches
  for (const match of allMatches) {
    if (match.movesCount && match.movesCount <= 25 && match.result === 'win') {
      quickWins++;
    }
    if (match.movesCount && match.movesCount >= 40) {
      marathonGames++;
    }
    const color = (match as any).playerColor || 'w';
    if (match.result === 'win') {
      if (color === 'w') whiteWins++;
      else blackWins++;
    }
    if (match.pgn) {
      const op = extractOpeningFromPgn(match.pgn);
      if (op.name && op.name !== 'Starting Position') {
        distinctOpenings.add(op.name);
      }
    }
  }

  const rawList: Omit<Achievement, 'progressPercent'>[] = [
    // ⚔️ COMBAT & VICTORIES
    {
      id: 'first-victory',
      title: 'First Blood',
      description: 'Score your very first chess victory against any player or bot.',
      category: 'combat',
      tier: 'bronze',
      icon: '⚔️',
      currentProgress: Math.min(1, totalWins),
      maxProgress: 1,
      isUnlocked: totalWins >= 1,
      rewardXp: 50,
    },
    {
      id: 'victories-10',
      title: 'Field Commander',
      description: 'Win 10 matches across rated multiplayer or bot games.',
      category: 'combat',
      tier: 'silver',
      icon: '🛡️',
      currentProgress: Math.min(10, totalWins),
      maxProgress: 10,
      isUnlocked: totalWins >= 10,
      rewardXp: 150,
    },
    {
      id: 'victories-50',
      title: 'Centurion Conqueror',
      description: 'Accumulate 50 hard-earned triumphs on the chessboard.',
      category: 'combat',
      tier: 'gold',
      icon: '🏆',
      currentProgress: Math.min(50, totalWins),
      maxProgress: 50,
      isUnlocked: totalWins >= 50,
      rewardXp: 500,
    },
    {
      id: 'streak-3',
      title: 'Hat Trick',
      description: 'Win 3 consecutive matches in a single unstoppable session.',
      category: 'combat',
      tier: 'silver',
      icon: '🔥',
      currentProgress: Math.min(3, maxStreak),
      maxProgress: 3,
      isUnlocked: maxStreak >= 3,
      rewardXp: 200,
    },
    {
      id: 'streak-5',
      title: 'Unstoppable Juggernaut',
      description: 'Achieve a legendary winning streak of 5 consecutive games.',
      category: 'combat',
      tier: 'gold',
      icon: '⚡',
      currentProgress: Math.min(5, maxStreak),
      maxProgress: 5,
      isUnlocked: maxStreak >= 5,
      rewardXp: 450,
    },
    {
      id: 'lightning-mate',
      title: 'Blitzkrieg Master',
      description: 'Deliver checkmate or claim victory in 25 moves or fewer.',
      category: 'combat',
      tier: 'silver',
      icon: '⚡',
      currentProgress: Math.min(1, quickWins),
      maxProgress: 1,
      isUnlocked: quickWins >= 1,
      rewardXp: 150,
    },
    {
      id: 'endgame-gladiator',
      title: 'Iron Endurance',
      description: 'Engage in a grueling battle lasting 40 moves or longer.',
      category: 'combat',
      tier: 'bronze',
      icon: '⏳',
      currentProgress: Math.min(1, marathonGames),
      maxProgress: 1,
      isUnlocked: marathonGames >= 1,
      rewardXp: 100,
    },

    // 🧠 TACTICAL PUZZLES
    {
      id: 'puzzle-first',
      title: 'Tactical Spark',
      description: 'Solve your first tactical chess puzzle correctly.',
      category: 'tactics',
      tier: 'bronze',
      icon: '🧩',
      currentProgress: Math.min(1, puzzlesSolved),
      maxProgress: 1,
      isUnlocked: puzzlesSolved >= 1,
      rewardXp: 50,
    },
    {
      id: 'puzzle-25',
      title: 'Sharp Eye',
      description: 'Successfully solve 25 chess tactics puzzles.',
      category: 'tactics',
      tier: 'silver',
      icon: '🎯',
      currentProgress: Math.min(25, puzzlesSolved),
      maxProgress: 25,
      isUnlocked: puzzlesSolved >= 25,
      rewardXp: 200,
    },
    {
      id: 'puzzle-100',
      title: 'Tactical Grandmaster',
      description: 'Conquer 100 tactical puzzles in the trainer.',
      category: 'tactics',
      tier: 'gold',
      icon: '🔮',
      currentProgress: Math.min(100, puzzlesSolved),
      maxProgress: 100,
      isUnlocked: puzzlesSolved >= 100,
      rewardXp: 600,
    },
    {
      id: 'puzzle-elo-1600',
      title: 'Master Tactician',
      description: 'Elevate your tactical puzzle rating to 1600+ Elo.',
      category: 'tactics',
      tier: 'silver',
      icon: '🎖️',
      currentProgress: Math.min(1600, puzzleRating),
      maxProgress: 1600,
      isUnlocked: puzzleRating >= 1600,
      rewardXp: 250,
    },
    {
      id: 'puzzle-elo-2000',
      title: 'Oracle of Combinations',
      description: 'Reach a formidable 2000+ tactical puzzle rating.',
      category: 'tactics',
      tier: 'diamond',
      icon: '💎',
      currentProgress: Math.min(2000, puzzleRating),
      maxProgress: 2000,
      isUnlocked: puzzleRating >= 2000,
      rewardXp: 1000,
    },

    // 🏆 MULTIPLAYER & RATING MILESTONES
    {
      id: 'placement-complete',
      title: 'Battle Tested',
      description: 'Complete all 7 multiplayer placement matches to earn your initial established rank.',
      category: 'rating',
      tier: 'bronze',
      icon: '🏁',
      currentProgress: Math.min(7, mpGames),
      maxProgress: 7,
      isUnlocked: mpGames >= 7,
      rewardXp: 150,
    },
    {
      id: 'rating-900',
      title: 'Rising Contender',
      description: 'Climb above 900 Elo in multiplayer rated games.',
      category: 'rating',
      tier: 'bronze',
      icon: '📈',
      currentProgress: Math.min(900, mpPeak),
      maxProgress: 900,
      isUnlocked: mpPeak >= 900,
      rewardXp: 100,
    },
    {
      id: 'rating-1000',
      title: 'Four-Digit Club',
      description: 'Break into the prestigious 1000+ Elo tier in live multiplayer.',
      category: 'rating',
      tier: 'silver',
      icon: '🛡️',
      currentProgress: Math.min(1000, mpPeak),
      maxProgress: 1000,
      isUnlocked: mpPeak >= 1000,
      rewardXp: 300,
    },
    {
      id: 'rating-1200',
      title: 'Club Champion',
      description: 'Attain a competitive rating of 1200+ Elo in multiplayer.',
      category: 'rating',
      tier: 'gold',
      icon: '👑',
      currentProgress: Math.min(1200, mpPeak),
      maxProgress: 1200,
      isUnlocked: mpPeak >= 1200,
      rewardXp: 600,
    },
    {
      id: 'rating-1500',
      title: 'Chess Titan',
      description: 'Ascend to the ranks of 1500+ Elo rating.',
      category: 'rating',
      tier: 'diamond',
      icon: '🌟',
      currentProgress: Math.min(1500, mpPeak),
      maxProgress: 1500,
      isUnlocked: mpPeak >= 1500,
      rewardXp: 1200,
    },

    // 📖 OPENINGS & VERSATILITY
    {
      id: 'openings-3',
      title: 'Broad Horizons',
      description: 'Deploy at least 3 distinct chess openings across your games.',
      category: 'openings',
      tier: 'bronze',
      icon: '📚',
      currentProgress: Math.min(3, distinctOpenings.size),
      maxProgress: 3,
      isUnlocked: distinctOpenings.size >= 3,
      rewardXp: 100,
    },
    {
      id: 'openings-6',
      title: 'Repertoire Connoisseur',
      description: 'Master theoretical depth by contesting at least 6 distinct chess openings.',
      category: 'openings',
      tier: 'silver',
      icon: '🎓',
      currentProgress: Math.min(6, distinctOpenings.size),
      maxProgress: 6,
      isUnlocked: distinctOpenings.size >= 6,
      rewardXp: 250,
    },
    {
      id: 'white-wins-5',
      title: 'White Knight',
      description: 'Claim victory in 5 games commanding the White pieces.',
      category: 'openings',
      tier: 'bronze',
      icon: '⚪',
      currentProgress: Math.min(5, whiteWins),
      maxProgress: 5,
      isUnlocked: whiteWins >= 5,
      rewardXp: 120,
    },
    {
      id: 'black-wins-5',
      title: 'Black Magic',
      description: 'Claim victory in 5 games countering from the Black side.',
      category: 'openings',
      tier: 'silver',
      icon: '⚫',
      currentProgress: Math.min(5, blackWins),
      maxProgress: 5,
      isUnlocked: blackWins >= 5,
      rewardXp: 180,
    },
  ];

  const achievements: Achievement[] = rawList.map((item) => {
    const percent = Math.min(100, Math.round((item.currentProgress / item.maxProgress) * 100));
    return {
      ...item,
      progressPercent: percent,
    };
  });

  const totalUnlocked = achievements.filter((a) => a.isUnlocked).length;
  const completionPercent = Math.round((totalUnlocked / achievements.length) * 100);

  const tierCounts = {
    bronze: achievements.filter((a) => a.tier === 'bronze' && a.isUnlocked).length,
    silver: achievements.filter((a) => a.tier === 'silver' && a.isUnlocked).length,
    gold: achievements.filter((a) => a.tier === 'gold' && a.isUnlocked).length,
    diamond: achievements.filter((a) => a.tier === 'diamond' && a.isUnlocked).length,
  };

  return {
    achievements,
    totalUnlocked,
    totalAchievements: achievements.length,
    completionPercent,
    tierCounts,
  };
}
