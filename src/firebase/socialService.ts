import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import { OperationType, handleFirestoreError } from './errors';
import { TimeControl, PieceColor } from '../types/chess';
import { TIME_CONTROLS } from '../utils/mockData';

export interface FriendUser {
  userId: string;
  displayName: string;
  photoURL?: string;
  rating?: number;
  status?: 'online' | 'in-game' | 'offline';
  currentRoomId?: string;
  addedAt?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromPhotoURL?: string;
  fromRating?: number;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}

export interface DirectMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  recipientId: string;
  text: string;
  createdAt: string;
  read?: boolean;
}

export interface GameChallenge {
  id: string;
  challengerId: string;
  challengerDisplayName: string;
  challengerPhotoURL?: string;
  challengerRating?: number;
  challengedId: string;
  timeControl: TimeControl;
  challengerColor: PieceColor | 'random';
  isRated: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  roomId: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  status: 'online' | 'in-game' | 'offline';
  currentRoomId?: string;
  lastActive: string;
}

/**
 * Generates a deterministic canonical chatId between two user IDs
 */
export function getChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_chat_');
}

/**
 * Updates current user's live presence heartbeat in Firestore
 */
export async function updateUserPresence(
  userId: string,
  status: 'online' | 'in-game' | 'offline' = 'online',
  currentRoomId?: string
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return;

  try {
    const payload: UserPresence = {
      userId,
      displayName: auth.currentUser.displayName || 'Grandmaster Player',
      status,
      currentRoomId: currentRoomId || '',
      lastActive: new Date().toISOString(),
    };
    await setDoc(doc(db, 'user_presence', userId), payload, { merge: true });
  } catch (error) {
    console.warn('Presence update notice:', error);
  }
}

/**
 * Subscribes to live presence status for a list of user IDs.
 * Batches queries into chunks of at most 30 to comply with Firestore 'in' query limits!
 */
export function subscribeToUsersPresence(
  userIds: string[],
  callback: (presenceMap: Record<string, UserPresence>) => void
): Unsubscribe {
  const uniqueUids = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUids.length === 0) {
    callback({});
    return () => {};
  }

  // Chunk into batches of up to 30 items
  const batches: string[][] = [];
  for (let i = 0; i < uniqueUids.length; i += 30) {
    batches.push(uniqueUids.slice(i, i + 30));
  }

  const batchResults: Record<number, Record<string, UserPresence>> = {};
  const unsubs: Unsubscribe[] = [];

  const emitCombined = () => {
    const combined: Record<string, UserPresence> = {};
    for (const bIdx in batchResults) {
      Object.assign(combined, batchResults[bIdx]);
    }
    callback(combined);
  };

  batches.forEach((batch, idx) => {
    const q = query(collection(db, 'user_presence'), where('userId', 'in', batch));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const presenceMap: Record<string, UserPresence> = {};
        const now = Date.now();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserPresence;
          const lastActiveTime = data.lastActive ? new Date(data.lastActive).getTime() : 0;
          const isRecent = now - lastActiveTime < 90000;
          presenceMap[data.userId] = {
            ...data,
            status: isRecent ? data.status : 'offline',
          };
        });
        batchResults[idx] = presenceMap;
        emitCombined();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'user_presence (batch)');
      }
    );
    unsubs.push(unsub);
  });

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Subscribes to the current user's friends list
 */
export function subscribeToFriends(
  userId: string,
  callback: (friends: FriendUser[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const friendsRef = collection(db, 'users', userId, 'friends');

  return onSnapshot(
    friendsRef,
    (snapshot) => {
      const friends: FriendUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        friends.push({
          userId: data.friendId || docSnap.id,
          displayName: data.friendDisplayName || 'Friend',
          photoURL: data.friendPhotoURL || '',
          rating: typeof data.friendRating === 'number' ? data.friendRating : 1200,
          addedAt: data.addedAt || new Date().toISOString(),
        });
      });
      callback(friends);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/friends`);
    }
  );
}

/**
 * Subscribes to incoming and outgoing friend requests for the user
 */
export function subscribeToFriendRequests(
  userId: string,
  callback: (incoming: FriendRequest[], outgoing: FriendRequest[]) => void
): Unsubscribe {
  if (!userId) {
    callback([], []);
    return () => {};
  }

  const incomingQuery = query(
    collection(db, 'friend_requests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  const outgoingQuery = query(
    collection(db, 'friend_requests'),
    where('fromUserId', '==', userId),
    where('status', '==', 'pending')
  );

  let incomingList: FriendRequest[] = [];
  let outgoingList: FriendRequest[] = [];

  const unsubIncoming = onSnapshot(
    incomingQuery,
    (snapshot) => {
      incomingList = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        incomingList.push({
          id: docSnap.id,
          fromUserId: d.fromUserId,
          fromDisplayName: d.fromDisplayName || 'Player',
          fromPhotoURL: d.fromPhotoURL,
          fromRating: d.fromRating || 1200,
          toUserId: d.toUserId,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });
      callback(incomingList, outgoingList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'friend_requests (incoming)');
    }
  );

  const unsubOutgoing = onSnapshot(
    outgoingQuery,
    (snapshot) => {
      outgoingList = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        outgoingList.push({
          id: docSnap.id,
          fromUserId: d.fromUserId,
          fromDisplayName: d.fromDisplayName || 'Player',
          fromPhotoURL: d.fromPhotoURL,
          fromRating: d.fromRating || 1200,
          toUserId: d.toUserId,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });
      callback(incomingList, outgoingList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'friend_requests (outgoing)');
    }
  );

  return () => {
    unsubIncoming();
    unsubOutgoing();
  };
}

/**
 * Sends a friend request to target user
 */
export async function sendFriendRequest(
  toUser: { userId: string; displayName?: string }
): Promise<void> {
  const current = auth.currentUser;
  if (!current || !toUser.userId || current.uid === toUser.userId) {
    throw new Error('Invalid user for friend request');
  }

  const requestId = `${current.uid}_to_${toUser.userId}`;
  const requestRef = doc(db, 'friend_requests', requestId);

  const existingSnap = await getDoc(requestRef);
  if (existingSnap.exists() && existingSnap.data()?.status === 'pending') {
    return;
  }

  const payload: FriendRequest = {
    id: requestId,
    fromUserId: current.uid,
    fromDisplayName: current.displayName || 'Player',
    fromPhotoURL: current.photoURL || '',
    toUserId: toUser.userId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await setDoc(requestRef, payload);
}

/**
 * Accepts a friend request and establishes reciprocal, bidirectional friendship safely.
 * Validates request ownership and pending state before modifying.
 */
export async function acceptFriendRequest(request: FriendRequest): Promise<void> {
  const current = auth.currentUser;
  if (!current || current.uid !== request.toUserId) {
    throw new Error('Unauthorized friend request acceptance');
  }

  // Validate current Firestore state
  const requestRef = doc(db, 'friend_requests', request.id);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) {
    throw new Error('Friend request no longer exists');
  }
  const data = snap.data();
  if (data.status !== 'pending' || data.toUserId !== current.uid) {
    throw new Error('Friend request is no longer pending or authorized');
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Update friend request status to accepted
  batch.update(requestRef, { status: 'accepted', updatedAt: now });

  // 2. Add to accepting user's friends list
  const acceptingUserFriendRef = doc(db, 'users', current.uid, 'friends', request.fromUserId);
  batch.set(acceptingUserFriendRef, {
    friendId: request.fromUserId,
    friendDisplayName: request.fromDisplayName,
    friendPhotoURL: request.fromPhotoURL || '',
    friendRating: request.fromRating || 1200,
    addedAt: now,
  });

  // 3. Reciprocally add to requesting user's friends list
  const requestingUserFriendRef = doc(db, 'users', request.fromUserId, 'friends', current.uid);
  batch.set(requestingUserFriendRef, {
    friendId: current.uid,
    friendDisplayName: current.displayName || 'Player',
    friendPhotoURL: current.photoURL || '',
    friendRating: 1200,
    addedAt: now,
  });

  // Commit atomically! If any single write fails, all changes roll back.
  await batch.commit();
}

/**
 * Declines a friend request with ownership validation
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  const current = auth.currentUser;
  if (!current || !requestId) throw new Error('Unauthenticated');

  const requestRef = doc(db, 'friend_requests', requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists() || snap.data()?.toUserId !== current.uid || snap.data()?.status !== 'pending') {
    throw new Error('Cannot decline: request is not pending or unauthorized');
  }

  await updateDoc(requestRef, {
    status: 'declined',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Cancels an outgoing pending friend request with ownership validation
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const current = auth.currentUser;
  if (!current || !requestId) throw new Error('Unauthenticated');

  const requestRef = doc(db, 'friend_requests', requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists() || snap.data()?.fromUserId !== current.uid || snap.data()?.status !== 'pending') {
    throw new Error('Cannot cancel: request is not pending or unauthorized');
  }

  await updateDoc(requestRef, {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Removes a friend from user's friends list atomically and reciprocally
 */
export async function removeFriend(friendId: string): Promise<void> {
  const current = auth.currentUser;
  if (!current || !friendId) return;

  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', current.uid, 'friends', friendId));
  batch.delete(doc(db, 'users', friendId, 'friends', current.uid));

  try {
    await batch.commit();
  } catch (err) {
    // Fallback: delete current user's entry if reciprocal batch fails
    await deleteDoc(doc(db, 'users', current.uid, 'friends', friendId));
  }
}

/**
 * Subscribes to real-time direct messages between two users
 */
export function subscribeToDirectMessages(
  chatId: string,
  callback: (messages: DirectMessage[]) => void
): Unsubscribe {
  if (!chatId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, 'direct_chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: DirectMessage[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        messages.push({
          id: docSnap.id,
          chatId: d.chatId,
          senderId: d.senderId,
          senderDisplayName: d.senderDisplayName,
          senderPhotoURL: d.senderPhotoURL,
          recipientId: d.recipientId,
          text: d.text,
          createdAt: d.createdAt,
          read: d.read,
        });
      });
      callback(messages);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `direct_chats/${chatId}/messages`);
    }
  );
}

/**
 * Sends a direct message in a 1-on-1 chat.
 * Strictly derives and validates the canonical chatId from authenticated sender + recipient!
 */
export async function sendDirectMessage(
  chatId: string,
  recipientId: string,
  text: string
): Promise<void> {
  const current = auth.currentUser;
  if (!current || !recipientId || !text.trim()) return;

  // Derive and validate canonical chatId from authenticated sender + recipient
  const expectedChatId = getChatId(current.uid, recipientId);
  const canonicalChatId = chatId === expectedChatId ? chatId : expectedChatId;

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const msgRef = doc(db, 'direct_chats', canonicalChatId, 'messages', msgId);

  const payload: DirectMessage = {
    id: msgId,
    chatId: canonicalChatId,
    senderId: current.uid,
    senderDisplayName: current.displayName || 'Player',
    senderPhotoURL: current.photoURL || '',
    recipientId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: false,
  };

  await setDoc(msgRef, payload);

  // Keep parent direct_chats metadata up-to-date
  try {
    await setDoc(
      doc(db, 'direct_chats', canonicalChatId),
      {
        lastMessage: text.trim().substring(0, 100),
        lastMessageAt: payload.createdAt,
        updatedAt: payload.createdAt,
      },
      { merge: true }
    );
  } catch (err) {
    // Parent touch failure shouldn't fail message delivery
    console.debug('Chat parent metadata notice:', err);
  }
}

/**
 * Sends a real-time game challenge to a friend
 */
export async function sendGameChallenge(
  challengedUser: FriendUser,
  timeControl: TimeControl = TIME_CONTROLS[2],
  challengerColor: PieceColor | 'random' = 'random',
  isRated: boolean = true
): Promise<GameChallenge> {
  const current = auth.currentUser;
  if (!current || !challengedUser.userId || current.uid === challengedUser.userId) {
    throw new Error('Invalid participants for game challenge');
  }

  // Validate timeControl
  if (!timeControl || typeof timeControl.initialSeconds !== 'number' || timeControl.initialSeconds <= 0) {
    throw new Error('Invalid time control specified for game challenge');
  }

  const randomBytes = new Uint8Array(8);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 8; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const secureHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const challengeId = `chal_${Date.now()}_${secureHex.substring(0, 8)}`;
  const roomId = `CHAL-${Date.now().toString(36).toUpperCase()}-${secureHex.toUpperCase()}`;

  // Validate roomId format strictly
  if (!/^CHAL-[A-Z0-9]+-[A-F0-9]+$/.test(roomId)) {
    throw new Error('Malformed room identifier');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 120000).toISOString();

  const challenge: GameChallenge = {
    id: challengeId,
    challengerId: current.uid,
    challengerDisplayName: current.displayName || 'Player',
    challengerPhotoURL: current.photoURL || '',
    challengerRating: 1200,
    challengedId: challengedUser.userId,
    timeControl,
    challengerColor,
    isRated,
    status: 'pending',
    roomId,
    createdAt: now.toISOString(),
    expiresAt,
  };

  await setDoc(doc(db, 'game_challenges', challengeId), challenge);
  return challenge;
}

/**
 * Subscribes to real-time incoming game challenges for the user
 */
export function subscribeToIncomingChallenges(
  userId: string,
  callback: (challenges: GameChallenge[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'game_challenges'),
    where('challengedId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const challenges: GameChallenge[] = [];
      const now = new Date().toISOString();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as GameChallenge;
        if (data.expiresAt > now) {
          challenges.push({ ...data, id: docSnap.id });
        }
      });
      callback(challenges);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'game_challenges (incoming)');
    }
  );
}

/**
 * Subscribes to real-time outgoing pending game challenges sent by the user
 */
export function subscribeToOutgoingChallenges(
  userId: string,
  callback: (challenges: GameChallenge[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'game_challenges'),
    where('challengerId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const challenges: GameChallenge[] = [];
      const now = new Date().toISOString();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as GameChallenge;
        if (data.expiresAt > now) {
          challenges.push({ ...data, id: docSnap.id });
        }
      });
      callback(challenges);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'game_challenges (outgoing)');
    }
  );
}

/**
 * Subscribes to outgoing challenge status
 */
export function subscribeToOutgoingChallenge(
  challengeId: string,
  callback: (challenge: GameChallenge | null) => void
): Unsubscribe {
  if (!challengeId) {
    callback(null);
    return () => {};
  }

  const challengeRef = doc(db, 'game_challenges', challengeId);

  return onSnapshot(challengeRef, (docSnap) => {
    if (docSnap.exists()) {
      const d = docSnap.data() as GameChallenge;
      callback({ ...d, id: docSnap.id });
    } else {
      callback(null);
    }
  });
}

/**
 * Responds to a game challenge (accept, decline, cancel) with ownership and state verification
 */
export async function respondToGameChallenge(
  challengeId: string,
  action: 'accepted' | 'declined' | 'cancelled'
): Promise<void> {
  const current = auth.currentUser;
  if (!current || !challengeId) throw new Error('Unauthenticated challenge response');

  const challengeRef = doc(db, 'game_challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) {
    throw new Error('Game challenge no longer exists');
  }

  const data = snap.data();
  if (data.status !== 'pending') {
    throw new Error(`Cannot ${action}: challenge is already ${data.status}`);
  }

  // Check expiration
  if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
    throw new Error('Challenge has expired');
  }

  // Validate authorized role for action
  if (action === 'accepted' || action === 'declined') {
    if (data.challengedId !== current.uid) {
      throw new Error('Only the challenged recipient can accept or decline this challenge');
    }
  } else if (action === 'cancelled') {
    if (data.challengerId !== current.uid) {
      throw new Error('Only the challenger can cancel this challenge');
    }
  }

  await updateDoc(challengeRef, {
    status: action,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Searches community player directory on leaderboard for friend discovery
 */
export async function searchCommunityUsers(searchQuery: string): Promise<FriendUser[]> {
  const clean = searchQuery.trim().toLowerCase();
  if (!clean) return [];

  try {
    const q = query(collection(db, 'public_leaderboard'), limit(50));
    const snap = await getDocs(q);
    const results: FriendUser[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const name = (data.displayName || data.username || '').toLowerCase();
      const uid = data.userId || docSnap.id;

      if (name.includes(clean) || uid.toLowerCase().includes(clean)) {
        results.push({
          userId: uid,
          displayName: data.displayName || data.username || 'Player',
          photoURL: data.photoURL || '',
          rating: typeof data.multiplayerRating === 'number' ? data.multiplayerRating : (Number(data.rating) || 1200),
          addedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    });

    return results;
  } catch (error) {
    console.warn('Community search warning:', error);
    return [];
  }
}
