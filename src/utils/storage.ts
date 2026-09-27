/**
 * Local & Firestore Session Storage & Atomic State Manager
 * 
 * Features:
 * - Safe factory functions (createDefaultStats, createDefaultPreferences) preventing shared array references.
 * - Atomic account-switching and monotonic session generation tracking.
 * - Rollback on Firestore transaction failure: prevents local stats from diverging.
 * - Invalidation of stale in-flight Firestore promises after logout/login.
 * - Non-stale getActiveFirebaseUserId() bound strictly to auth.currentUser.
 * - True atomic reset stats that propagates errors when Firestore fails.
 */

import {
  saveUserStatsToFirestore,
  loadUserStatsFromFirestore,
  saveUserPreferencesToFirestore,
  loadUserPreferencesFromFirestore,
  recordMultiplayerGameTransaction,
  loadMatchHistoryFromFirestore,
  resetUserStatsInFirestore,
  recordPuzzleSolvedTransaction,
  recordLocalGameTransaction,
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

/**
 * Safe Factory for User Preferences
 */
export function createDefaultPreferences(): UserPreferences {
  return {
    boardTheme: 'emerald',
    soundEnabled: true,
    showCoordinates: true,
    showLegalMoves: true,
    autoQueen: false,
    defaultTimeControl: '5-0',
    stockfishLevel: 10,
    engineThinkingSeconds: 2,
  };
}

/**
 * Safe Factory for User Stats with completely independent nested arrays
 */
export function createDefaultStats(): UserStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    puzzleRating: 1500,
    puzzlesSolved: 0,
    history: [],
    multiplayerRating: INITIAL_RATING,
    multiplayerGamesPlayed: 0,
    multiplayerWins: 0,
    multiplayerLosses: 0,
    multiplayerDraws: 0,
    multiplayerPeakRating: INITIAL_RATING,
    multiplayerHistory: [],
  };
}

// Backward compatibility constants (frozen copies)
export const DEFAULT_PREFERENCES: Readonly<UserPreferences> = Object.freeze(createDefaultPreferences());
export const DEFAULT_STATS: Readonly<UserStats> = Object.freeze(createDefaultStats());

// Monotonic Session Generation Counter for atomic account isolation
let currentSessionGeneration = 0;
let currentActiveUserId: string | null = null;
let inMemoryStats: UserStats = createDefaultStats();
let inMemoryPrefs: UserPreferences = createDefaultPreferences();
const recordedMatchIds = new Set<string>();

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
  recordedMatchIds.clear();
  inMemoryStats = createDefaultStats();
  inMemoryPrefs = createDefaultPreferences();
}

/**
 * Starts a new isolated session generation for the target user.
 */
export function beginUserSession(userId: string): number {
  currentSessionGeneration++;
  currentActiveUserId = userId;
  inMemoryStats = createDefaultStats();
  inMemoryPrefs = createDefaultPreferences();
  return currentSessionGeneration;
}

export function loadPreferences(): UserPreferences {
  return { ...inMemoryPrefs };
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
  return {
    ...inMemoryStats,
    history: [...inMemoryStats.history],
    multiplayerHistory: [...inMemoryStats.multiplayerHistory],
  };
}

/**
 * Resets user stats both in Firestore (if logged in) and in-memory atomically.
 * Throws if the Firestore reset fails, preventing false reporting of success.
 */
export async function resetUserStats(userId?: string): Promise<UserStats> {
  const targetUid = userId || getActiveFirebaseUserId();

  if (targetUid && auth.currentUser && auth.currentUser.uid === targetUid) {
    // Await authoritative reset in Firestore; do NOT swallow error!
    await resetUserStatsInFirestore(targetUid);
  }

  // Increment session generation to invalidate any race-condition in-flight writes
  currentSessionGeneration++;
  recordedMatchIds.clear();
  inMemoryStats = createDefaultStats();

  return {
    ...inMemoryStats,
    history: [],
    multiplayerHistory: [],
  };
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
    return { stats: createDefaultStats(), prefs: createDefaultPreferences() };
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
      return {
        stats: { ...inMemoryStats, history: [...inMemoryStats.history], multiplayerHistory: [...inMemoryStats.multiplayerHistory] },
        prefs: { ...inMemoryPrefs },
      };
    }

    if (remoteStats) {
      inMemoryStats = {
        ...createDefaultStats(),
        ...remoteStats,
        history: [],
        multiplayerHistory: Array.isArray(remoteMatches) ? [...remoteMatches] : [],
      };
    } else {
      // First time user: initialize with fresh defaults
      inMemoryStats = createDefaultStats();
      await saveUserStatsToFirestore(userId, inMemoryStats);
    }

    if (remotePrefs) {
      inMemoryPrefs = {
        ...createDefaultPreferences(),
        ...remotePrefs,
      };
    } else {
      inMemoryPrefs = createDefaultPreferences();
      await saveUserPreferencesToFirestore(userId, inMemoryPrefs);
    }
  } catch (error) {
    console.warn('Firestore user sync notice:', error);
  }

  return {
    stats: {
      ...inMemoryStats,
      history: [...inMemoryStats.history],
      multiplayerHistory: [...inMemoryStats.multiplayerHistory],
    },
    prefs: { ...inMemoryPrefs },
  };
}

export function recordGameResult(
  result: 'win' | 'loss' | 'draw',
  opponent: string,
  movesCount: number,
  timeControl: string,
  pgn: string
): UserStats {
  const mutationGen = currentSessionGeneration;
  const rollbackSnapshot: UserStats = {
    ...inMemoryStats,
    history: [...inMemoryStats.history],
    multiplayerHistory: [...inMemoryStats.multiplayerHistory],
  };

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
    recordLocalGameTransaction(uid, result).catch((err) => {
      console.warn('Atomic game transaction error:', err);
      // Revert if still on the same session generation
      if (mutationGen === currentSessionGeneration) {
        inMemoryStats = rollbackSnapshot;
      }
    });
  }

  return {
    ...inMemoryStats,
    history: [...inMemoryStats.history],
    multiplayerHistory: [...inMemoryStats.multiplayerHistory],
  };
}

export function recordPuzzleSolved(ratingDelta: number): UserStats {
  const mutationGen = currentSessionGeneration;
  const prevRating = inMemoryStats.puzzleRating;
  const prevSolved = inMemoryStats.puzzlesSolved;

  inMemoryStats.puzzlesSolved += 1;
  inMemoryStats.puzzleRating = Math.max(400, Math.min(3500, inMemoryStats.puzzleRating + ratingDelta));

  const uid = getActiveFirebaseUserId();
  if (uid && auth.currentUser && auth.currentUser.uid === uid) {
    recordPuzzleSolvedTransaction(uid, ratingDelta)
      .then((authoritative) => {
        if (mutationGen === currentSessionGeneration) {
          inMemoryStats.puzzleRating = authoritative.puzzleRating;
          inMemoryStats.puzzlesSolved = authoritative.puzzlesSolved;
        }
      })
      .catch((err) => {
        console.warn('Atomic puzzle transaction error:', err);
        if (mutationGen === currentSessionGeneration) {
          inMemoryStats.puzzleRating = prevRating;
          inMemoryStats.puzzlesSolved = prevSolved;
        }
      });
  }

  return {
    ...inMemoryStats,
    history: [...inMemoryStats.history],
    multiplayerHistory: [...inMemoryStats.multiplayerHistory],
  };
}

/**
 * Records a completed multiplayer game and applies the advance Elo rating system.
 * Prevents local multiplayer stats from diverging by rolling back if the Firestore transaction fails!
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

  const cleanMatchId = params.matchId || (params.roomId ? `match_${params.roomId}` : `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  // Prevent duplicate game-result recording with idempotent match IDs
  if (recordedMatchIds.has(cleanMatchId)) {
    return {
      stats: {
        ...inMemoryStats,
        history: [...inMemoryStats.history],
        multiplayerHistory: [...inMemoryStats.multiplayerHistory],
      },
      oldRating: currentRating,
      newRating: currentRating,
      ratingDelta: 0,
      calc: {
        isProvisional: localCalc.isProvisional,
        matchesPlayed: inMemoryStats.multiplayerGamesPlayed,
        performanceTier: localCalc.performanceTier,
      },
    };
  }
  recordedMatchIds.add(cleanMatchId);
  if (recordedMatchIds.size > 200) {
    const oldest = recordedMatchIds.values().next().value;
    if (oldest) recordedMatchIds.delete(oldest);
  }

  const mutationGen = currentSessionGeneration;
  // Snapshot before optimistic mutation for atomic rollback if remote fails
  const rollbackSnapshot: UserStats = {
    ...inMemoryStats,
    history: [...inMemoryStats.history],
    multiplayerHistory: [...inMemoryStats.multiplayerHistory],
  };

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

  // Persist atomically to Firebase Firestore with rollback on failure
  const uid = getActiveFirebaseUserId();
  if (uid && auth.currentUser && auth.currentUser.uid === uid) {
    recordMultiplayerGameTransaction(uid, matchRecord, {
      result: params.result,
      ratingBefore: currentRating,
      ratingAfter: newRating,
      ratingDelta,
      isProvisional: localCalc.isProvisional,
    }).catch((err) => {
      console.error('Firebase atomic match transaction failed! Rolling back local stats to prevent divergence:', err);
      // Reconcile and roll back in-memory stats ONLY if session has not changed or reset
      if (mutationGen === currentSessionGeneration) {
        inMemoryStats = rollbackSnapshot;
        recordedMatchIds.delete(cleanMatchId);
      }
    });
  }

  return {
    stats: {
      ...inMemoryStats,
      history: [...inMemoryStats.history],
      multiplayerHistory: [...inMemoryStats.multiplayerHistory],
    },
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
