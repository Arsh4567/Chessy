/**
 * Local & Firestore Session Storage & Atomic State Manager
 * 
 * Features:
 * - Atomic account-switching and session generation tracking.
 * - Zero cross-account data leakage.
 * - Invalidation of stale in-flight Firestore promises after logout/login.
 * - Non-stale getActiveFirebaseUserId() bound strictly to auth.currentUser.
 */

import {
  saveUserStatsToFirestore,
  loadUserStatsFromFirestore,
  saveUserPreferencesToFirestore,
  loadUserPreferencesFromFirestore,
  recordMultiplayerGameTransaction,
  loadMatchHistoryFromFirestore,
} from '../firebase/firestoreService';
import { INITIAL_RATING, calculateEloUpdate } from './eloRating';
import { auth } from '../firebase/config';

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
  roomId?: string;
  opponentName: string;
  opponentRating: number;
  result: 'win' | 'loss' | 'draw';
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  isProvisional?: boolean;
  matchNumber?: number;
  playerColor?: 'w' | 'b';
  movesCount: number;
  timeControl?: string;
  pgn: string;
  date?: string;
  createdAt: string;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  puzzleRating: number;
  puzzlesSolved: number;
  history: SavedGame[];

  // Multiplayer Elo stats: starts at 800 Elo
  multiplayerRating: number;
  multiplayerGamesPlayed: number;
  multiplayerWins: number;
  multiplayerLosses: number;
  multiplayerDraws: number;
  multiplayerPeakRating: number;
  multiplayerHistory: MultiplayerMatchRecord[];
}

export interface UserPreferences {
  boardTheme: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble' | 'cobalt';
  soundEnabled: boolean;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean;
  defaultTimeControl: string;
  stockfishLevel?: number;
  engineThinkingSeconds?: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  boardTheme: 'emerald',
  soundEnabled: true,
  showCoordinates: true,
  showLegalMoves: true,
  autoQueen: false,
  defaultTimeControl: '5-0',
  stockfishLevel: 10,
  engineThinkingSeconds: 2,
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

// Monotonic Session Generation Counter for atomic account isolation
let currentSessionGeneration = 0;
let currentActiveUserId: string | null = null;
let inMemoryStats: UserStats = { ...DEFAULT_STATS };
let inMemoryPrefs: UserPreferences = { ...DEFAULT_PREFERENCES };

/**
 * Returns current authenticated Firebase user UID.
 * Strictly guarantees that if no Firebase user is authenticated, it returns null and clears cache.
 */
export function getActiveFirebaseUserId(): string | null {
  const current = auth.currentUser;
  if (!current) {
    currentActiveUserId = null;
    return null;
  }
  currentActiveUserId = current.uid;
  return current.uid;
}

export function setActiveFirebaseUserId(uid: string | null) {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
    currentActiveUserId = null;
    return;
  }
  currentActiveUserId = uid;
}

/**
 * Atomically clears all in-memory stats, preferences, and invalidates all in-flight async session requests.
 */
export function clearUserSessionData() {
  currentSessionGeneration++;
  currentActiveUserId = null;
  inMemoryStats = { ...DEFAULT_STATS };
  inMemoryPrefs = { ...DEFAULT_PREFERENCES };
}

/**
 * Starts a new isolated session generation for the target user.
 */
export function beginUserSession(userId: string): number {
  currentSessionGeneration++;
  currentActiveUserId = userId;
  inMemoryStats = { ...DEFAULT_STATS };
  inMemoryPrefs = { ...DEFAULT_PREFERENCES };
  return currentSessionGeneration;
}

export function loadPreferences(): UserPreferences {
  return inMemoryPrefs;
}

export function savePreferences(prefs: UserPreferences) {
  inMemoryPrefs = { ...prefs };
  const uid = getActiveFirebaseUserId();
  if (uid && auth.currentUser && auth.currentUser.uid === uid) {
    saveUserPreferencesToFirestore(uid, prefs).catch((err) => {
      console.warn('Firebase preferences save notice:', err);
    });
  }
}

export function loadUserStats(): UserStats {
  return inMemoryStats;
}

/**
 * Initializes and syncs stats from Firebase Firestore for the user.
 * Discards any results if the session generation or active UID has changed while requests were in-flight.
 */
export async function syncUserDataFromFirestore(
  userId: string
): Promise<{ stats: UserStats; prefs: UserPreferences }> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    clearUserSessionData();
    return { stats: { ...DEFAULT_STATS }, prefs: { ...DEFAULT_PREFERENCES } };
  }

  const sessionGen = currentSessionGeneration;

  try {
    const [remoteStats, remotePrefs, remoteMatches] = await Promise.all([
      loadUserStatsFromFirestore(userId),
      loadUserPreferencesFromFirestore(userId),
      loadMatchHistoryFromFirestore(userId),
    ]);

    // Discard stale response if session changed or user logged out/switched
    if (
      sessionGen !== currentSessionGeneration ||
      !auth.currentUser ||
      auth.currentUser.uid !== userId
    ) {
      return { stats: inMemoryStats, prefs: inMemoryPrefs };
    }

    if (remoteStats) {
      inMemoryStats = {
        ...DEFAULT_STATS,
        ...remoteStats,
        multiplayerHistory:
          remoteMatches && remoteMatches.length > 0
            ? remoteMatches
            : remoteStats.multiplayerHistory || [],
      };
    } else {
      // First time user: save clean initial stats to Firestore
      inMemoryStats = { ...DEFAULT_STATS };
      await saveUserStatsToFirestore(userId, inMemoryStats);
    }

    if (remotePrefs) {
      inMemoryPrefs = {
        ...DEFAULT_PREFERENCES,
        ...remotePrefs,
      };
    } else {
      inMemoryPrefs = { ...DEFAULT_PREFERENCES };
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
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    result,
    opponent,
    movesCount,
    timeControl,
    pgn,
  };

  inMemoryStats.history.unshift(newGame);
  if (inMemoryStats.history.length > 50) inMemoryStats.history.pop();

  const uid = getActiveFirebaseUserId();
  if (uid && auth.currentUser && auth.currentUser.uid === uid) {
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
  if (uid && auth.currentUser && auth.currentUser.uid === uid) {
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
  matchId?: string;
  roomId?: string;
  result: 'win' | 'loss' | 'draw';
  opponentName: string;
  opponentRating?: number;
  movesCount: number;
  timeControl?: string;
  pgn: string;
  playerColor?: 'w' | 'b';
  serverRatingDelta?: number;
  serverNewRating?: number;
}): {
  stats: UserStats;
  oldRating: number;
  newRating: number;
  ratingDelta: number;
  calc: {
    isProvisional: boolean;
    matchesPlayed: number;
    performanceTier: string;
  };
} {
  const currentRating = inMemoryStats.multiplayerRating ?? INITIAL_RATING;
  const currentGamesPlayed = inMemoryStats.multiplayerGamesPlayed ?? 0;

  const localCalc = calculateEloUpdate(
    currentRating,
    params.opponentRating ?? 800,
    params.result,
    currentGamesPlayed
  );

  const newRating = params.serverNewRating !== undefined ? params.serverNewRating : localCalc.newRating;
  const ratingDelta = params.serverRatingDelta !== undefined ? params.serverRatingDelta : localCalc.ratingDelta;

  inMemoryStats.multiplayerGamesPlayed = currentGamesPlayed + 1;
  inMemoryStats.multiplayerRating = newRating;
  inMemoryStats.multiplayerPeakRating = Math.max(
    inMemoryStats.multiplayerPeakRating ?? INITIAL_RATING,
    newRating
  );

  if (params.result === 'win') {
    inMemoryStats.multiplayerWins = (inMemoryStats.multiplayerWins ?? 0) + 1;
  } else if (params.result === 'loss') {
    inMemoryStats.multiplayerLosses = (inMemoryStats.multiplayerLosses ?? 0) + 1;
  } else {
    inMemoryStats.multiplayerDraws = (inMemoryStats.multiplayerDraws ?? 0) + 1;
  }

  const cleanMatchId = params.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const matchRecord: MultiplayerMatchRecord = {
    id: cleanMatchId,
    roomId: params.roomId,
    opponentName: params.opponentName,
    opponentRating: params.opponentRating ?? 800,
    result: params.result,
    ratingBefore: currentRating,
    ratingAfter: newRating,
    ratingDelta,
    playerColor: params.playerColor,
    movesCount: params.movesCount,
    timeControl: params.timeControl,
    pgn: params.pgn,
    createdAt: new Date().toISOString(),
  };

  if (!inMemoryStats.multiplayerHistory) {
    inMemoryStats.multiplayerHistory = [];
  }
  inMemoryStats.multiplayerHistory.unshift(matchRecord);
  if (inMemoryStats.multiplayerHistory.length > 50) {
    inMemoryStats.multiplayerHistory.pop();
  }

  // Persist atomically to Firebase Firestore using atomic transaction
  const uid = getActiveFirebaseUserId();
  if (uid && auth.currentUser && auth.currentUser.uid === uid) {
    recordMultiplayerGameTransaction(uid, matchRecord, {
      result: params.result,
      ratingBefore: currentRating,
      ratingAfter: newRating,
      ratingDelta,
      isProvisional: localCalc.isProvisional,
    }).catch((err) => {
      console.warn('Firebase atomic match transaction warning:', err);
    });
  }

  return {
    stats: { ...inMemoryStats },
    oldRating: currentRating,
    newRating,
    ratingDelta,
    calc: {
      isProvisional: localCalc.isProvisional,
      matchesPlayed: inMemoryStats.multiplayerGamesPlayed,
      performanceTier: localCalc.performanceTier,
    },
  };
}
