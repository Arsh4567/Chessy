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
} from 'firebase/firestore';
import { db, auth } from './config';
import { OperationType, handleFirestoreError } from './errors';
import { UserStats, UserPreferences, MultiplayerMatchRecord, SavedGame } from '../utils/storage';
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

    // Also update public leaderboard entry if auth is signed in and matches
    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        const lbPayload: LeaderboardEntry = {
          userId,
          displayName: auth.currentUser.displayName || 'Grandmaster Player',
          photoURL: auth.currentUser.photoURL || '',
          multiplayerRating: payload.multiplayerRating,
          multiplayerGamesPlayed: payload.multiplayerGamesPlayed,
          multiplayerWins: payload.multiplayerWins,
          multiplayerLosses: payload.multiplayerLosses,
          multiplayerDraws: payload.multiplayerDraws,
          puzzleRating: payload.puzzleRating,
          updatedAt: payload.updatedAt,
        };
        await setDoc(doc(db, 'public_leaderboard', userId), lbPayload, { merge: true });
      } catch (err) {
        // Non-blocking leaderboard update
        console.warn('Could not sync to public_leaderboard:', err);
      }
    }
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
        history: [], // History logs loaded separately or kept in subcollection
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
 * Records a multiplayer match to Firestore under users/{userId}/matches/{matchId}
 */
export async function recordMatchToFirestore(
  userId: string,
  match: MultiplayerMatchRecord
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const cleanId = match.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `users/${userId}/matches/${cleanId}`;
  try {
    const payload = {
      id: cleanId,
      roomId: match.roomId || 'MAIN',
      userId,
      opponentName: match.opponentName || 'Opponent',
      opponentRating: Number(match.opponentRating || INITIAL_RATING),
      ratingBefore: Number(match.ratingBefore || INITIAL_RATING),
      ratingAfter: Number(match.ratingAfter || INITIAL_RATING),
      ratingDelta: Number(match.ratingDelta || 0),
      isProvisional: Boolean(match.isProvisional),
      matchNumber: Number(match.matchNumber || 1),
      result: match.result,
      movesCount: Number(match.movesCount || 0),
      pgn: (match.pgn || '').substring(0, 8000),
      date: match.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'matches', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Loads recent match history from Firestore
 */
export async function loadMatchHistoryFromFirestore(
  userId: string
): Promise<MultiplayerMatchRecord[]> {
  if (!userId) return [];
  const path = `users/${userId}/matches`;
  try {
    const matchesCol = collection(db, 'users', userId, 'matches');
    const q = query(matchesCol, limit(50));
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
    handleFirestoreError(error, OperationType.LIST, path);
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
    // 1. Public profile
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

    // 2. Private account with isolated PII email
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
      // Sort in memory by multiplayerRating descending
      list.sort((a, b) => (b.multiplayerRating ?? 0) - (a.multiplayerRating ?? 0));
      callback(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
