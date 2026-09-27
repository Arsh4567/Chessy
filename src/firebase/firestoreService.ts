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
 * Saves or updates user stats in Firestore
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
    await setDoc(doc(db, 'users', userId, 'stats', 'current'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads user stats from Firestore
 */
export async function loadUserStatsFromFirestore(userId: string): Promise<UserStats | null> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}/stats/current`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'stats', 'current'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        gamesPlayed: data.gamesPlayed ?? 0,
        wins: data.wins ?? 0,
        losses: data.losses ?? 0,
        draws: data.draws ?? 0,
        puzzleRating: data.puzzleRating ?? 1500,
        puzzlesSolved: data.puzzlesSolved ?? 0,
        history: [],
        multiplayerRating: data.multiplayerRating ?? INITIAL_RATING,
        multiplayerGamesPlayed: data.multiplayerGamesPlayed ?? 0,
        multiplayerWins: data.multiplayerWins ?? 0,
        multiplayerLosses: data.multiplayerLosses ?? 0,
        multiplayerDraws: data.multiplayerDraws ?? 0,
        multiplayerPeakRating: data.multiplayerPeakRating ?? data.multiplayerRating ?? INITIAL_RATING,
        multiplayerHistory: [],
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Saves user preferences to Firestore
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
      boardTheme: prefs.boardTheme || 'cobalt',
      stockfishLevel: Number(prefs.stockfishLevel ?? 10),
      engineThinkingSeconds: Number(prefs.engineThinkingSeconds ?? 8),
      soundEnabled: Boolean(prefs.soundEnabled),
      showCoordinates: Boolean(prefs.showCoordinates),
      showLegalMoves: Boolean(prefs.showLegalMoves),
      autoQueen: Boolean(prefs.autoQueen),
      defaultTimeControl: prefs.defaultTimeControl || '5-0',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'preferences', 'current'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
    const docSnap = await getDoc(doc(db, 'users', userId, 'preferences', 'current'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        boardTheme: data.boardTheme ?? 'cobalt',
        stockfishLevel: data.stockfishLevel ?? 10,
        engineThinkingSeconds: data.engineThinkingSeconds ?? 8,
        soundEnabled: data.soundEnabled ?? true,
        showCoordinates: data.showCoordinates ?? true,
        showLegalMoves: data.showLegalMoves ?? true,
        autoQueen: data.autoQueen ?? false,
        defaultTimeControl: data.defaultTimeControl ?? '5-0',
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Atomically updates user stats and records a multiplayer match in Firestore via runTransaction
 */
export async function recordMultiplayerGameTransaction(
  userId: string,
  match: MultiplayerMatchRecord,
  resultDetails: {
    result: 'win' | 'loss' | 'draw';
    ratingBefore: number;
    ratingAfter: number;
    ratingDelta: number;
    isProvisional: boolean;
  }
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const cleanId = match.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const userStatsRef = doc(db, 'users', userId, 'stats', 'current');
  const matchDocRef = doc(db, 'users', userId, 'matches', cleanId);

  try {
    await runTransaction(db, async (transaction) => {
      const statsSnap = await transaction.get(userStatsRef);
      const prevData = statsSnap.exists() ? statsSnap.data() : {};

      const prevRating = Number(prevData.multiplayerRating ?? INITIAL_RATING);
      const prevGames = Number(prevData.multiplayerGamesPlayed ?? 0);
      const prevWins = Number(prevData.multiplayerWins ?? 0);
      const prevLosses = Number(prevData.multiplayerLosses ?? 0);
      const prevDraws = Number(prevData.multiplayerDraws ?? 0);
      const prevPeak = Number(prevData.multiplayerPeakRating ?? prevRating);

      const newGames = prevGames + 1;
      const newRating = Number(resultDetails.ratingAfter);
      const newPeak = Math.max(prevPeak, newRating);
      const newWins = prevWins + (resultDetails.result === 'win' ? 1 : 0);
      const newLosses = prevLosses + (resultDetails.result === 'loss' ? 1 : 0);
      const newDraws = prevDraws + (resultDetails.result === 'draw' ? 1 : 0);

      const updatedStats = {
        userId,
        gamesPlayed: Number(prevData.gamesPlayed ?? 0),
        wins: Number(prevData.wins ?? 0),
        losses: Number(prevData.losses ?? 0),
        draws: Number(prevData.draws ?? 0),
        puzzleRating: Number(prevData.puzzleRating ?? 1500),
        puzzlesSolved: Number(prevData.puzzlesSolved ?? 0),
        multiplayerRating: newRating,
        multiplayerGamesPlayed: newGames,
        multiplayerWins: newWins,
        multiplayerLosses: newLosses,
        multiplayerDraws: newDraws,
        multiplayerPeakRating: newPeak,
        updatedAt: new Date().toISOString(),
      };

      const matchPayload = {
        id: cleanId,
        roomId: match.roomId || 'MAIN',
        userId,
        opponentName: match.opponentName || 'Opponent',
        opponentRating: Number(match.opponentRating || INITIAL_RATING),
        ratingBefore: Number(resultDetails.ratingBefore || prevRating),
        ratingAfter: newRating,
        ratingDelta: Number(resultDetails.ratingDelta || 0),
        isProvisional: Boolean(resultDetails.isProvisional),
        matchNumber: newGames,
        result: resultDetails.result,
        movesCount: Number(match.movesCount || 0),
        pgn: (match.pgn || '').substring(0, 8000),
        date: match.date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      transaction.set(userStatsRef, updatedStats, { merge: true });
      transaction.set(matchDocRef, matchPayload);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/stats/current`);
  }
}

/**
 * Loads recent match history from Firestore ordered newest first before applying limit
 */
export async function loadMatchHistoryFromFirestore(
  userId: string,
  limitCount = 50
): Promise<MultiplayerMatchRecord[]> {
  if (!userId) return [];
  const path = `users/${userId}/matches`;
  try {
    const matchesCol = collection(db, 'users', userId, 'matches');
    // Order by createdAt descending BEFORE applying limit
    const q = query(matchesCol, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    const records: MultiplayerMatchRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      records.push({
        id: data.id,
        roomId: data.roomId,
        date: data.date,
        result: data.result,
        opponentName: data.opponentName,
        opponentRating: data.opponentRating,
        ratingBefore: data.ratingBefore,
        ratingAfter: data.ratingAfter,
        ratingDelta: data.ratingDelta,
        isProvisional: data.isProvisional,
        matchNumber: data.matchNumber,
        movesCount: data.movesCount,
        pgn: data.pgn,
      });
    });
    return records;
  } catch (error) {
    // Fallback if composite index is pending: query limit then sort newest first
    try {
      const matchesCol = collection(db, 'users', userId, 'matches');
      const q = query(matchesCol, limit(limitCount));
      const snapshot = await getDocs(q);
      const records: MultiplayerMatchRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        records.push({
          id: data.id,
          roomId: data.roomId,
          date: data.date,
          result: data.result,
          opponentName: data.opponentName,
          opponentRating: data.opponentRating,
          ratingBefore: data.ratingBefore,
          ratingAfter: data.ratingAfter,
          ratingDelta: data.ratingDelta,
          isProvisional: data.isProvisional,
          matchNumber: data.matchNumber,
          movesCount: data.movesCount,
          pgn: data.pgn,
        });
      });
      records.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      return records;
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.LIST, path);
      return [];
    }
  }
}

/**
 * Initializes or updates user profile in Firestore
 */
export async function syncUserProfileToFirestore(user: {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}): Promise<void> {
  const publicPath = `users/${user.uid}/public/profile`;
  const privatePath = `users/${user.uid}/private/account`;
  try {
    await setDoc(
      doc(db, 'users', user.uid, 'public', 'profile'),
      {
        userId: user.uid,
        displayName: user.displayName || 'Grandmaster Player',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (user.email) {
      await setDoc(
        doc(db, 'users', user.uid, 'private', 'account'),
        {
          email: user.email,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }
}

/**
 * Fetches real-time public leaderboard from Firestore
 */
export function subscribeToPublicLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void,
  onError?: (err: any) => void
) {
  const path = 'public_leaderboard';
  const q = query(collection(db, path), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LeaderboardEntry[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as LeaderboardEntry;
        list.push(item);
      });
      list.sort((a, b) => (b.multiplayerRating ?? 0) - (a.multiplayerRating ?? 0));
      callback(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
