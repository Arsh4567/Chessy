/**
 * Real Local Storage for Chess Stats, Preferences, and Game History
 * No fake data.
 */

export interface UserPreferences {
  boardTheme: 'cobalt' | 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble';
  stockfishLevel: number; // 0 to 20 (0 = beginner ~600, 20 = GM ~2800)
  engineThinkingSeconds: number; // 7 to 10 seconds for deep analysis
  soundEnabled: boolean;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean;
  defaultTimeControl: string; // '3-0', '5-0', '10-0', 'unlimited'
}

export interface SavedGame {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  opponent: string;
  movesCount: number;
  timeControl: string;
  pgn: string;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  puzzleRating: number;
  puzzlesSolved: number;
  history: SavedGame[];
}

const PREF_KEY = 'gm_chess_preferences_v2';
const STATS_KEY = 'gm_chess_user_stats_v2';

export const DEFAULT_PREFERENCES: UserPreferences = {
  boardTheme: 'cobalt',
  stockfishLevel: 10, // Default balanced level
  engineThinkingSeconds: 8, // 8 seconds default deep analysis (7-10s range)
  soundEnabled: true,
  showCoordinates: true,
  showLegalMoves: true,
  autoQueen: false,
  defaultTimeControl: '5-0',
};

export const DEFAULT_STATS: UserStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  puzzleRating: 1500,
  puzzlesSolved: 0,
  history: [],
};

export function loadPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure engineThinkingSeconds is at least 7-10s
      if (!parsed.engineThinkingSeconds || parsed.engineThinkingSeconds < 7) {
        parsed.engineThinkingSeconds = 8;
      }
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

export function savePreferences(prefs: UserPreferences) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {}
}

export function loadUserStats(): UserStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return { ...DEFAULT_STATS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_STATS;
}

export function recordGameResult(result: 'win' | 'loss' | 'draw', opponent: string, movesCount: number, timeControl: string, pgn: string) {
  const stats = loadUserStats();
  stats.gamesPlayed += 1;
  if (result === 'win') stats.wins += 1;
  else if (result === 'loss') stats.losses += 1;
  else stats.draws += 1;

  const newGame: SavedGame = {
    id: `game-${Date.now()}`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    result,
    opponent,
    movesCount,
    timeControl,
    pgn,
  };

  stats.history.unshift(newGame);
  if (stats.history.length > 50) stats.history.pop();

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
  return stats;
}

export function recordPuzzleSolved(ratingDelta: number) {
  const stats = loadUserStats();
  stats.puzzlesSolved += 1;
  stats.puzzleRating = Math.max(400, stats.puzzleRating + ratingDelta);
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
  return stats;
}
