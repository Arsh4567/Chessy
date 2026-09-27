import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from './config';
import { OperationType, handleFirestoreError } from './errors';
import { UserStats, UserPreferences, MultiplayerMatchRecord } from '../utils/storage';
import { INITIAL_RATING } from '../utils/eloRating';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  multiplayerRating: number;
  multiplayerGamesPlayed: number;
  multiplayerWins: number;
  multiplayerLosses: number;
  multiplayerDraws: number;
  puzzleRating?: number;
  updatedAt: string;
}

/**
 * Determines whether a Firestore error is transient and eligible for retry.
 * Non-transient errors (permission-denied, unauthenticated, not-found, invalid-argument) fail fast!
 */
export function isTransientFirestoreError(error: any): boolean {
  if (!error) return false;
  const code = (error.code || '').toLowerCase();
  const message = (error.message || '').toLowerCase();

  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'resource-exhausted' ||
    code === 'aborted' ||
    code === 'cancelled' ||
    code.includes('network')
  ) {
    return true;
  }

  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('unavailable') ||
    message.includes('offline') ||
    message.includes('failed to fetch')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes an async Firestore operation with exponential backoff retry ONLY for transient errors.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 250
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries || !isTransientFirestoreError(error)) {
        throw error;
      }
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

/**
 * Saves or updates user stats in Firestore with transient retry protection
 */
export async function saveUserStatsToFirestore(userId: string, stats: UserStats): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/stats/current`;

  try {
    const payload = {
      userId,
      gamesPlayed: Number(stats.gamesPlayed || 0),
      wins: Number(stats.wins || 0),
      losses: Number(stats.losses || 0),
      draws: Number(stats.draws || 0),
      puzzleRating: Number(stats.puzzleRating || 1500),
      puzzlesSolved: Number(stats.puzzlesSolved || 0),
      multiplayerRating: Number(stats.multiplayerRating ?? INITIAL_RATING),
      multiplayerGamesPlayed: Number(stats.multiplayerGamesPlayed || 0),
      multiplayerWins: Number(stats.multiplayerWins || 0),
      multiplayerLosses: Number(stats.multiplayerLosses || 0),
      multiplayerDraws: Number(stats.multiplayerDraws || 0),
      multiplayerPeakRating: Number(stats.multiplayerPeakRating ?? stats.multiplayerRating ?? INITIAL_RATING),
      updatedAt: new Date().toISOString(),
    };

    await withRetry(() =>
      setDoc(doc(db, 'users', userId, 'stats', 'current'), payload, { merge: true })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Resets user stats in Firestore back to pristine initial ratings.
 * Throws on failure so callers know the operation did not silently succeed.
 */
export async function resetUserStatsInFirestore(userId: string): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Unauthenticated stats reset attempt');
  }
  const path = `users/${userId}/stats/current`;

  try {
    const resetPayload = {
      userId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      puzzleRating: 1500,
      puzzlesSolved: 0,
      multiplayerRating: INITIAL_RATING,
      multiplayerGamesPlayed: 0,
      multiplayerWins: 0,
      multiplayerLosses: 0,
      multiplayerDraws: 0,
      multiplayerPeakRating: INITIAL_RATING,
      updatedAt: new Date().toISOString(),
    };

    await withRetry(() =>
      setDoc(doc(db, 'users', userId, 'stats', 'current'), resetPayload)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Atomically updates puzzle rating and puzzles solved in Firestore
 */
export async function recordPuzzleSolvedTransaction(
  userId: string,
  ratingDelta: number
): Promise<{ puzzleRating: number; puzzlesSolved: number }> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Unauthenticated puzzle recording');
  }

  const userStatsRef = doc(db, 'users', userId, 'stats', 'current');

  return await withRetry(() =>
    runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(userStatsRef);
      const currentData = statsDoc.exists() ? statsDoc.data() : {};

      const currentRating = currentData.puzzleRating ?? 1500;
      const newRating = Math.max(400, Math.min(3500, currentRating + ratingDelta));
      const puzzlesSolved = (currentData.puzzlesSolved ?? 0) + 1;

      transaction.set(
        userStatsRef,
        {
          userId,
          gamesPlayed: currentData.gamesPlayed ?? 0,
          wins: currentData.wins ?? 0,
          losses: currentData.losses ?? 0,
          draws: currentData.draws ?? 0,
          puzzleRating: newRating,
          puzzlesSolved,
          multiplayerRating: currentData.multiplayerRating ?? INITIAL_RATING,
          multiplayerGamesPlayed: currentData.multiplayerGamesPlayed ?? 0,
          multiplayerWins: currentData.multiplayerWins ?? 0,
          multiplayerLosses: currentData.multiplayerLosses ?? 0,
          multiplayerDraws: currentData.multiplayerDraws ?? 0,
          multiplayerPeakRating: currentData.multiplayerPeakRating ?? INITIAL_RATING,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return { puzzleRating: newRating, puzzlesSolved };
    })
  );
}

/**
 * Atomically records a local/bot game result in Firestore
 */
export async function recordLocalGameTransaction(
  userId: string,
  result: 'win' | 'loss' | 'draw'
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;

  const userStatsRef = doc(db, 'users', userId, 'stats', 'current');

  await withRetry(() =>
    runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(userStatsRef);
      const currentData = statsDoc.exists() ? statsDoc.data() : {};

      const gamesPlayed = (currentData.gamesPlayed ?? 0) + 1;
      const wins = result === 'win' ? (currentData.wins ?? 0) + 1 : currentData.wins ?? 0;
      const losses = result === 'loss' ? (currentData.losses ?? 0) + 1 : currentData.losses ?? 0;
      const draws = result === 'draw' ? (currentData.draws ?? 0) + 1 : currentData.draws ?? 0;

      transaction.set(
        userStatsRef,
        {
          userId,
          gamesPlayed,
          wins,
          losses,
          draws,
          puzzleRating: currentData.puzzleRating ?? 1500,
          puzzlesSolved: currentData.puzzlesSolved ?? 0,
          multiplayerRating: currentData.multiplayerRating ?? INITIAL_RATING,
          multiplayerGamesPlayed: currentData.multiplayerGamesPlayed ?? 0,
          multiplayerWins: currentData.multiplayerWins ?? 0,
          multiplayerLosses: currentData.multiplayerLosses ?? 0,
          multiplayerDraws: currentData.multiplayerDraws ?? 0,
          multiplayerPeakRating: currentData.multiplayerPeakRating ?? INITIAL_RATING,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    })
  );
}

/**
 * Loads user stats from Firestore
 */
export async function loadUserStatsFromFirestore(userId: string): Promise<UserStats | null> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}/stats/current`;
  try {
    const docSnap = await withRetry(() =>
      getDoc(doc(db, 'users', userId, 'stats', 'current'))
    );
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        gamesPlayed: Number(data.gamesPlayed) || 0,
        wins: Number(data.wins) || 0,
        losses: Number(data.losses) || 0,
        draws: Number(data.draws) || 0,
        puzzleRating: Number(data.puzzleRating) || 1500,
        puzzlesSolved: Number(data.puzzlesSolved) || 0,
        history: [],
        multiplayerRating: Number(data.multiplayerRating) || INITIAL_RATING,
        multiplayerGamesPlayed: Number(data.multiplayerGamesPlayed) || 0,
        multiplayerWins: Number(data.multiplayerWins) || 0,
        multiplayerLosses: Number(data.multiplayerLosses) || 0,
        multiplayerDraws: Number(data.multiplayerDraws) || 0,
        multiplayerPeakRating: Number(data.multiplayerPeakRating) || Number(data.multiplayerRating) || INITIAL_RATING,
        multiplayerHistory: [],
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Saves user preferences to Firestore with transient retry protection
 */
export async function saveUserPreferencesToFirestore(
  userId: string,
  prefs: UserPreferences
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/preferences/current`;
  try {
    const payload = {
      userId,
      boardTheme: prefs.boardTheme || 'emerald',
      stockfishLevel: Number(prefs.stockfishLevel ?? 10),
      engineThinkingSeconds: Number(prefs.engineThinkingSeconds ?? 2),
      soundEnabled: Boolean(prefs.soundEnabled),
      showCoordinates: Boolean(prefs.showCoordinates),
      showLegalMoves: Boolean(prefs.showLegalMoves),
      autoQueen: Boolean(prefs.autoQueen),
      defaultTimeControl: prefs.defaultTimeControl || '5-0',
      updatedAt: new Date().toISOString(),
    };
    await withRetry(() =>
      setDoc(doc(db, 'users', userId, 'preferences', 'current'), payload, { merge: true })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Loads user preferences from Firestore
 */
export async function loadUserPreferencesFromFirestore(
  userId: string
): Promise<UserPreferences | null> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}/preferences/current`;
  try {
    const docSnap = await withRetry(() =>
      getDoc(doc(db, 'users', userId, 'preferences', 'current'))
    );
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        boardTheme: data.boardTheme ?? 'emerald',
        stockfishLevel: typeof data.stockfishLevel === 'number' ? data.stockfishLevel : 10,
        engineThinkingSeconds: typeof data.engineThinkingSeconds === 'number' ? data.engineThinkingSeconds : 2,
        soundEnabled: data.soundEnabled !== undefined ? Boolean(data.soundEnabled) : true,
        showCoordinates: data.showCoordinates !== undefined ? Boolean(data.showCoordinates) : true,
        showLegalMoves: data.showLegalMoves !== undefined ? Boolean(data.showLegalMoves) : true,
        autoQueen: data.autoQueen !== undefined ? Boolean(data.autoQueen) : false,
        defaultTimeControl: data.defaultTimeControl || '5-0',
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Robustly parses a leaderboard document handling missing or legacy field formats
 */
function parseLeaderboardDoc(id: string, data: any): LeaderboardEntry {
  const rating = typeof data.multiplayerRating === 'number'
    ? data.multiplayerRating
    : Number(data.rating) || INITIAL_RATING;

  const displayName = data.displayName || data.username || data.name || 'Anonymous Grandmaster';
  const gamesPlayed = typeof data.multiplayerGamesPlayed === 'number'
    ? data.multiplayerGamesPlayed
    : Number(data.gamesPlayed) || 0;

  const wins = typeof data.multiplayerWins === 'number' ? data.multiplayerWins : Number(data.wins) || 0;
  const losses = typeof data.multiplayerLosses === 'number' ? data.multiplayerLosses : Number(data.losses) || 0;
  const draws = typeof data.multiplayerDraws === 'number' ? data.multiplayerDraws : Number(data.draws) || 0;
  const puzzleRating = typeof data.puzzleRating === 'number' ? data.puzzleRating : 1500;

  return {
    userId: data.userId || id,
    displayName,
    photoURL: data.photoURL || '',
    multiplayerRating: rating,
    multiplayerGamesPlayed: gamesPlayed,
    multiplayerWins: wins,
    multiplayerLosses: losses,
    multiplayerDraws: draws,
    puzzleRating,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Loads top leaderboard players from Firestore public leaderboard collection
 */
export async function loadLeaderboardFromFirestore(limitCount: number = 50): Promise<LeaderboardEntry[]> {
  const path = 'public_leaderboard';
  try {
    const q = query(
      collection(db, 'public_leaderboard'),
      orderBy('multiplayerRating', 'desc'),
      limit(limitCount)
    );
    const snap = await withRetry(() => getDocs(q));
    const entries: LeaderboardEntry[] = [];
    snap.forEach((d) => {
      entries.push(parseLeaderboardDoc(d.id, d.data()));
    });
    if (entries.length > 0) return entries;

    // Fallback: If no docs have multiplayerRating field yet, query by collection limit
    const fallbackQ = query(collection(db, 'public_leaderboard'), limit(limitCount));
    const fallbackSnap = await withRetry(() => getDocs(fallbackQ));
    fallbackSnap.forEach((d) => {
      entries.push(parseLeaderboardDoc(d.id, d.data()));
    });
    return entries.sort((a, b) => b.multiplayerRating - a.multiplayerRating);
  } catch (error) {
    try {
      const fallbackQ = query(collection(db, 'public_leaderboard'), limit(limitCount));
      const fallbackSnap = await getDocs(fallbackQ);
      const entries: LeaderboardEntry[] = [];
      fallbackSnap.forEach((d) => {
        entries.push(parseLeaderboardDoc(d.id, d.data()));
      });
      return entries.sort((a, b) => b.multiplayerRating - a.multiplayerRating);
    } catch {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }
}

/**
 * Subscribes to real-time leaderboard updates with robust legacy document parsing
 */
export function subscribeToLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void,
  limitOrError?: number | ((error: any) => void),
  onError?: (error: any) => void
): () => void {
  const path = 'public_leaderboard';
  const limitCount = typeof limitOrError === 'number' ? limitOrError : 50;
  const errorHandler = typeof limitOrError === 'function' ? limitOrError : onError;

  try {
    const q = query(
      collection(db, 'public_leaderboard'),
      orderBy('multiplayerRating', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snap) => {
        const entries: LeaderboardEntry[] = [];
        snap.forEach((d) => {
          entries.push(parseLeaderboardDoc(d.id, d.data()));
        });
        callback(entries);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        errorHandler?.(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    errorHandler?.(error);
    return () => {};
  }
}

export const subscribeToPublicLeaderboard = subscribeToLeaderboard;

/**
 * Atomically records a completed multiplayer match and updates user stats in Firestore
 */
export async function recordMultiplayerGameTransaction(
  userId: string,
  matchRecord: MultiplayerMatchRecord,
  calc: {
    result: 'win' | 'loss' | 'draw';
    ratingBefore: number;
    ratingAfter: number;
    ratingDelta: number;
    isProvisional?: boolean;
  }
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const userStatsRef = doc(db, 'users', userId, 'stats', 'current');
  const matchRef = doc(db, 'users', userId, 'matches', matchRecord.id);

  try {
    await withRetry(() =>
      runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(userStatsRef);
        const currentData = statsDoc.exists() ? statsDoc.data() : {};

        const gamesPlayed = (currentData.gamesPlayed ?? 0) + 1;
        const mpGamesPlayed = (currentData.multiplayerGamesPlayed ?? 0) + 1;
        const wins = calc.result === 'win' ? (currentData.wins ?? 0) + 1 : currentData.wins ?? 0;
        const losses = calc.result === 'loss' ? (currentData.losses ?? 0) + 1 : currentData.losses ?? 0;
        const draws = calc.result === 'draw' ? (currentData.draws ?? 0) + 1 : currentData.draws ?? 0;
        const mpWins = calc.result === 'win' ? (currentData.multiplayerWins ?? 0) + 1 : currentData.multiplayerWins ?? 0;
        const mpLosses = calc.result === 'loss' ? (currentData.multiplayerLosses ?? 0) + 1 : currentData.multiplayerLosses ?? 0;
        const mpDraws = calc.result === 'draw' ? (currentData.multiplayerDraws ?? 0) + 1 : currentData.multiplayerDraws ?? 0;
        const peakRating = Math.max(currentData.multiplayerPeakRating ?? INITIAL_RATING, calc.ratingAfter);

        transaction.set(
          userStatsRef,
          {
            userId,
            gamesPlayed,
            wins,
            losses,
            draws,
            multiplayerRating: calc.ratingAfter,
            multiplayerGamesPlayed: mpGamesPlayed,
            multiplayerWins: mpWins,
            multiplayerLosses: mpLosses,
            multiplayerDraws: mpDraws,
            multiplayerPeakRating: peakRating,
            puzzleRating: currentData.puzzleRating ?? 1500,
            puzzlesSolved: currentData.puzzlesSolved ?? 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        transaction.set(matchRef, {
          id: matchRecord.id,
          roomId: matchRecord.roomId || '',
          date: matchRecord.date || new Date().toISOString(),
          createdAt: matchRecord.createdAt || new Date().toISOString(),
          result: matchRecord.result,
          opponentName: matchRecord.opponentName,
          opponentRating: matchRecord.opponentRating,
          ratingBefore: calc.ratingBefore,
          ratingAfter: calc.ratingAfter,
          ratingDelta: calc.ratingDelta,
          isProvisional: calc.isProvisional ?? false,
          playerColor: matchRecord.playerColor || 'w',
          movesCount: matchRecord.movesCount,
          timeControl: matchRecord.timeControl || '5-0',
          pgn: matchRecord.pgn,
        });
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/stats/current`);
    throw error;
  }
}

/**
 * Loads recent match history from user's matches collection in Firestore
 */
export async function loadMatchHistoryFromFirestore(
  userId: string,
  limitCount: number = 30
): Promise<MultiplayerMatchRecord[]> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return [];
  const path = `users/${userId}/matches`;
  try {
    const q = query(
      collection(db, 'users', userId, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await withRetry(() => getDocs(q));
    const history: MultiplayerMatchRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      history.push({
        id: data.id || d.id,
        roomId: data.roomId,
        date: data.date,
        createdAt: data.createdAt || data.date || new Date().toISOString(),
        result: data.result,
        opponentName: data.opponentName || 'Opponent',
        opponentRating: data.opponentRating ?? 800,
        ratingBefore: data.ratingBefore ?? INITIAL_RATING,
        ratingAfter: data.ratingAfter ?? INITIAL_RATING,
        ratingDelta: data.ratingDelta ?? 0,
        isProvisional: data.isProvisional,
        matchNumber: data.matchNumber,
        playerColor: data.playerColor,
        movesCount: data.movesCount ?? 0,
        timeControl: data.timeControl,
        pgn: data.pgn || '',
      });
    });
    return history;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Initializes or updates user profile in Firestore
 * Preserves the original createdAt timestamp and validates the authenticated user.
 */
export async function syncUserProfileToFirestore(user: {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}): Promise<void> {
  if (!user.uid || !auth.currentUser || auth.currentUser.uid !== user.uid) {
    return;
  }

  const publicDocRef = doc(db, 'users', user.uid, 'public', 'profile');
  const privateDocRef = doc(db, 'users', user.uid, 'private', 'account');

  try {
    const publicSnap = await withRetry(() => getDoc(publicDocRef));
    const now = new Date().toISOString();

    if (publicSnap.exists()) {
      // Existing profile: update displayName, photoURL, and updatedAt without altering createdAt
      await withRetry(() =>
        setDoc(
          publicDocRef,
          {
            userId: user.uid,
            displayName: user.displayName || publicSnap.data()?.displayName || 'Grandmaster Player',
            photoURL: user.photoURL || publicSnap.data()?.photoURL || '',
            updatedAt: now,
          },
          { merge: true }
        )
      );
    } else {
      // New profile: set initial createdAt
      await withRetry(() =>
        setDoc(publicDocRef, {
          userId: user.uid,
          displayName: user.displayName || 'Grandmaster Player',
          photoURL: user.photoURL || '',
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    if (user.email) {
      const privateSnap = await withRetry(() => getDoc(privateDocRef));
      if (privateSnap.exists()) {
        await withRetry(() =>
          setDoc(
            privateDocRef,
            {
              email: user.email,
              updatedAt: now,
            },
            { merge: true }
          )
        );
      } else {
        await withRetry(() =>
          setDoc(privateDocRef, {
            email: user.email,
            createdAt: now,
            updatedAt: now,
          })
        );
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/public/profile`);
  }
}
