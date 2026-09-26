/**
 * Real Local Storage for Chess Stats, Preferences, and Game History
 * No fake data.
 */

import { calculateEloUpdate, INITIAL_RATING, EloCalculationResult } from './eloRating';

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

export interface MultiplayerMatchRecord {
  id: string;
  roomId: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  opponentName: string;
  opponentRating: number;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  isProvisional: boolean;
  matchNumber: number;
  movesCount: number;
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

  // Multiplayer Elo Rating & Placement Progression
  multiplayerRating: number; // Starts at 800 Elo
  multiplayerGamesPlayed: number;
  multiplayerWins: number;
  multiplayerLosses: number;
  multiplayerDraws: number;
  multiplayerPeakRating: number;
  multiplayerHistory: MultiplayerMatchRecord[];
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

  // Multiplayer Elo stats: starts at 800 Elo
  multiplayerRating: INITIAL_RATING,
  multiplayerGamesPlayed: 0,
  multiplayerWins: 0,
  multiplayerLosses: 0,
  multiplayerDraws: 0,
  multiplayerPeakRating: INITIAL_RATING,
  multiplayerHistory: [],
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
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        multiplayerRating: parsed.multiplayerRating ?? INITIAL_RATING,
        multiplayerGamesPlayed: parsed.multiplayerGamesPlayed ?? 0,
        multiplayerWins: parsed.multiplayerWins ?? 0,
        multiplayerLosses: parsed.multiplayerLosses ?? 0,
        multiplayerDraws: parsed.multiplayerDraws ?? 0,
        multiplayerPeakRating: parsed.multiplayerPeakRating ?? (parsed.multiplayerRating ?? INITIAL_RATING),
        multiplayerHistory: Array.isArray(parsed.multiplayerHistory) ? parsed.multiplayerHistory : [],
      };
    }
  } catch {}
  return DEFAULT_STATS;
}

export function recordGameResult(
  result: 'win' | 'loss' | 'draw',
  opponent: string,
  movesCount: number,
  timeControl: string,
  pgn: string
) {
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

/**
 * Records a completed multiplayer game and applies the advance Elo rating system:
 * - Starts at 800 Elo
 * - First 7 matches (1..7): drastic ±100 Elo volatility (placement phase)
 * - Established matches (8+): stable ±7 to 8 Elo changes (0 for draw)
 */
export function recordMultiplayerGameResult(params: {
  roomId: string;
  result: 'win' | 'loss' | 'draw';
  opponentName: string;
  opponentRating?: number;
  movesCount: number;
  pgn: string;
  serverRatingDelta?: number;
  serverNewRating?: number;
}): {
  stats: UserStats;
  calc: EloCalculationResult;
  oldRating: number;
  newRating: number;
  ratingDelta: number;
} {
  const stats = loadUserStats();
  const currentRating = stats.multiplayerRating ?? INITIAL_RATING;
  const oppRating = params.opponentRating ?? INITIAL_RATING;
  const gamesBefore = stats.multiplayerGamesPlayed ?? 0;

  // Compute or verify Elo rating update
  const calc = calculateEloUpdate(currentRating, oppRating, params.result, gamesBefore);

  // If server provided authoritative delta, prefer server value, otherwise use calc
  const ratingDelta = typeof params.serverRatingDelta === 'number' ? params.serverRatingDelta : calc.ratingDelta;
  const newRating = typeof params.serverNewRating === 'number' ? params.serverNewRating : calc.newRating;

  // Update stats counters
  stats.multiplayerGamesPlayed = gamesBefore + 1;
  stats.multiplayerRating = newRating;
  stats.multiplayerPeakRating = Math.max(stats.multiplayerPeakRating || INITIAL_RATING, newRating);

  if (params.result === 'win') stats.multiplayerWins += 1;
  else if (params.result === 'loss') stats.multiplayerLosses += 1;
  else stats.multiplayerDraws += 1;

  const matchRecord: MultiplayerMatchRecord = {
    id: `mp-${Date.now()}`,
    roomId: params.roomId,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    result: params.result,
    opponentName: params.opponentName || 'Opponent',
    opponentRating: oppRating,
    ratingBefore: currentRating,
    ratingAfter: newRating,
    ratingDelta,
    isProvisional: calc.isProvisional,
    matchNumber: stats.multiplayerGamesPlayed,
    movesCount: params.movesCount,
    pgn: params.pgn,
  };

  stats.multiplayerHistory.unshift(matchRecord);
  if (stats.multiplayerHistory.length > 50) stats.multiplayerHistory.pop();

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}

  return {
    stats,
    calc,
    oldRating: currentRating,
    newRating,
    ratingDelta,
  };
}
