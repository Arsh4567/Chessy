/**
 * Firebase Firestore Data Persistence for Chess Stats, Preferences, and Game History
 * Replaces pure local storage with Firebase Cloud Firestore.
 */

import { calculateEloUpdate, INITIAL_RATING, EloCalculationResult } from './eloRating';
import { 
  saveUserStatsToFirestore, 
  loadUserStatsFromFirestore, 
  saveUserPreferencesToFirestore, 
  loadUserPreferencesFromFirestore, 
  recordMatchToFirestore,
  loadMatchHistoryFromFirestore
} from '../firebase/firestoreService';
import { auth } from '../firebase/config';

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

export const DEFAULT_PREFERENCES: UserPreferences = {
  boardTheme: 'cobalt',
  stockfishLevel: 10,
  engineThinkingSeconds: 8,
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

// In-memory active session cache
let inMemoryStats: UserStats = { ...DEFAULT_STATS };
let inMemoryPrefs: UserPreferences = { ...DEFAULT_PREFERENCES };
let currentActiveUserId: string | null = null;

export function getActiveFirebaseUserId(): string | null {
  if (auth.currentUser?.uid) {
    currentActiveUserId = auth.currentUser.uid;
    return auth.currentUser.uid;
  }
  return currentActiveUserId;
}

export function setActiveFirebaseUserId(uid: string) {
  currentActiveUserId = uid;
}

export function loadPreferences(): UserPreferences {
  return inMemoryPrefs;
}

export function savePreferences(prefs: UserPreferences) {
  inMemoryPrefs = { ...prefs };
  const uid = getActiveFirebaseUserId();
  if (uid && auth.currentUser) {
    saveUserPreferencesToFirestore(uid, prefs).catch((err) => {
      console.warn('Firebase preferences save notice:', err);
    });
  }
}

export function loadUserStats(): UserStats {
  return inMemoryStats;
}

/**
 * Initializes and syncs stats from Firebase Firestore for the user
 */
export async function syncUserDataFromFirestore(userId: string): Promise<{ stats: UserStats; prefs: UserPreferences }> {
  if (!userId || !auth.currentUser) {
    return { stats: inMemoryStats, prefs: inMemoryPrefs };
  }
  try {
    const [remoteStats, remotePrefs, remoteMatches] = await Promise.all([
      loadUserStatsFromFirestore(userId),
      loadUserPreferencesFromFirestore(userId),
      loadMatchHistoryFromFirestore(userId),
    ]);

    if (remoteStats) {
      inMemoryStats = {
        ...inMemoryStats,
        ...remoteStats,
        multiplayerHistory: remoteMatches && remoteMatches.length > 0 ? remoteMatches : inMemoryStats.multiplayerHistory,
      };
    } else {
      // First time user: save initial 800 Elo stats to Firebase
      await saveUserStatsToFirestore(userId, inMemoryStats);
    }

    if (remotePrefs) {
      inMemoryPrefs = {
        ...inMemoryPrefs,
        ...remotePrefs,
      };
    } else {
      await saveUserPreferencesToFirestore(userId, inMemoryPrefs);
    }
  } catch (error) {
    console.warn('Firestore user sync notice:', error);
  }

  return { stats: inMemoryStats, prefs: inMemoryPrefs };
}

export function recordGameResult(
  result: 'win' | 'loss' | 'draw',
  opponent: string,
  movesCount: number,
  timeControl: string,
  pgn: string
): UserStats {
  inMemoryStats.gamesPlayed += 1;
  if (result === 'win') inMemoryStats.wins += 1;
  else if (result === 'loss') inMemoryStats.losses += 1;
  else inMemoryStats.draws += 1;

  const newGame: SavedGame = {
    id: `game-${Date.now()}`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    result,
    opponent,
    movesCount,
    timeControl,
    pgn,
  };

  inMemoryStats.history.unshift(newGame);
  if (inMemoryStats.history.length > 50) inMemoryStats.history.pop();

  const uid = getActiveFirebaseUserId();
  if (uid) {
    saveUserStatsToFirestore(uid, inMemoryStats).catch((err) => {
      console.warn('Firebase stats sync warning:', err);
    });
  }

  return { ...inMemoryStats };
}

export function recordPuzzleSolved(ratingDelta: number): UserStats {
  inMemoryStats.puzzlesSolved += 1;
  inMemoryStats.puzzleRating = Math.max(400, inMemoryStats.puzzleRating + ratingDelta);

  const uid = getActiveFirebaseUserId();
  if (uid) {
    saveUserStatsToFirestore(uid, inMemoryStats).catch((err) => {
      console.warn('Firebase puzzle sync warning:', err);
    });
  }

  return { ...inMemoryStats };
}

/**
 * Records a completed multiplayer game and applies the advance Elo rating system:
 * - Starts at 800 Elo
 * - First 7 matches (1..7): drastic ±100 Elo volatility (placement phase)
 * - Established matches (8+): stable ±7 to 8 Elo changes (0 for draw)
 * - Persists atomically to Firebase Firestore!
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
  const currentRating = inMemoryStats.multiplayerRating ?? INITIAL_RATING;
  const oppRating = params.opponentRating ?? INITIAL_RATING;
  const gamesBefore = inMemoryStats.multiplayerGamesPlayed ?? 0;

  // Compute or verify Elo rating update
  const calc = calculateEloUpdate(currentRating, oppRating, params.result, gamesBefore);

  const ratingDelta = typeof params.serverRatingDelta === 'number' ? params.serverRatingDelta : calc.ratingDelta;
  const newRating = typeof params.serverNewRating === 'number' ? params.serverNewRating : calc.newRating;

  // Update stats counters
  inMemoryStats.multiplayerGamesPlayed = gamesBefore + 1;
  inMemoryStats.multiplayerRating = newRating;
  inMemoryStats.multiplayerPeakRating = Math.max(inMemoryStats.multiplayerPeakRating || INITIAL_RATING, newRating);

  if (params.result === 'win') inMemoryStats.multiplayerWins += 1;
  else if (params.result === 'loss') inMemoryStats.multiplayerLosses += 1;
  else inMemoryStats.multiplayerDraws += 1;

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
    matchNumber: inMemoryStats.multiplayerGamesPlayed,
    movesCount: params.movesCount,
    pgn: params.pgn,
  };

  inMemoryStats.multiplayerHistory.unshift(matchRecord);
  if (inMemoryStats.multiplayerHistory.length > 50) inMemoryStats.multiplayerHistory.pop();

  // Persist directly to Firebase Firestore
  const uid = getActiveFirebaseUserId();
  if (uid) {
    saveUserStatsToFirestore(uid, inMemoryStats).catch((err) => {
      console.warn('Firebase multiplayer stats save error:', err);
    });
    recordMatchToFirestore(uid, matchRecord).catch((err) => {
      console.warn('Firebase match log save error:', err);
    });
  }

  return {
    stats: { ...inMemoryStats },
    calc,
    oldRating: currentRating,
    newRating,
    ratingDelta,
  };
}
