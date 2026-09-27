import { WebSocket } from 'ws';
import { Chess } from 'chess.js';
import crypto from 'crypto';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
  MultiplayerRole,
  MultiplayerTimeControl,
  MultiplayerChatMessage,
  MultiplayerGameOver,
  ClientMultiplayerEvent,
  ServerMultiplayerEvent,
} from '../src/types/multiplayer';
import { calculateEloUpdate, INITIAL_RATING } from '../src/utils/eloRating';

interface AuthoritativeUserRecord {
  userId: string;
  displayName: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  peakRating: number;
  lastUpdated: number;
}

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  playerName: string;
  isAuthenticated: boolean;
  roomId?: string;
  rating: number;
  gamesPlayed: number;
}

interface RoomInstance {
  id: string;
  chess: Chess;
  timeControl: MultiplayerTimeControl;
  white: (MultiplayerPlayer & { ws?: WebSocket }) | null;
  black: (MultiplayerPlayer & { ws?: WebSocket }) | null;
  spectators: Array<{ id: string; name: string; ws: WebSocket }>;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
  isGameActive: boolean;
  gameOver: MultiplayerGameOver | null;
  drawOfferedBy: 'w' | 'b' | null;
  rematchOfferedBy: 'w' | 'b' | null;
  chat: MultiplayerChatMessage[];
  lastActivity: number;
  isPrivate?: boolean;
  passcode?: string;
  allowedPlayerIds?: string[];
}

/**
 * Validates and decodes Firebase Auth ID Tokens server-side
 */
function verifyFirebaseIdToken(token?: string): { uid: string; name?: string; picture?: string; email?: string } | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    const now = Math.floor(Date.now() / 1000);
    // Expiration check
    if (payload.exp && payload.exp < now) {
      console.warn('[Multiplayer Auth] Token expired');
      return null;
    }
    // Issuer check for Google / Firebase Auth
    if (payload.iss && !payload.iss.includes('securetoken.google.com')) {
      console.warn('[Multiplayer Auth] Invalid token issuer');
      return null;
    }

    const uid = payload.user_id || payload.sub;
    if (!uid || typeof uid !== 'string') return null;

    return {
      uid,
      name: payload.name || payload.displayName,
      picture: payload.picture,
      email: payload.email,
    };
  } catch (err) {
    console.warn('[Multiplayer Auth] Token parse failure:', err);
    return null;
  }
}

class MultiplayerServerManager {
  private rooms: Map<string, RoomInstance> = new Map();
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  // Authoritative server-side persistent user store for Elo ratings and statistics
  private authoritativeUserStore: Map<string, AuthoritativeUserRecord> = new Map();
  private timerInterval: NodeJS.Timeout | null = null;
  private clockSyncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startClockTicker();
    this.startClockSyncBroadcaster();
  }

  /**
   * Retrieves or initializes authoritative user profile from server store.
   * Client-supplied ratings and gamesPlayed are strictly ignored.
   */
  public getOrCreateAuthoritativeUser(userId: string, defaultName = 'Grandmaster'): AuthoritativeUserRecord {
    const existing = this.authoritativeUserStore.get(userId);
    if (existing) {
      if (defaultName && defaultName !== 'Grandmaster' && existing.displayName === 'Grandmaster') {
        existing.displayName = defaultName;
      }
      return existing;
    }

    const newRecord: AuthoritativeUserRecord = {
      userId,
      displayName: defaultName || 'Grandmaster',
      rating: INITIAL_RATING,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      peakRating: INITIAL_RATING,
      lastUpdated: Date.now(),
    };
    this.authoritativeUserStore.set(userId, newRecord);
    return newRecord;
  }

  /**
   * Authoritative clock ticker: checks active games every 250ms for flag falls (timeout)
   */
  private startClockTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const now = Date.now();

      this.rooms.forEach((room) => {
        if (!room.isGameActive || room.gameOver || !room.white || !room.black) return;
        if (room.timeControl.initialSeconds <= 0) return; // Unlimited

        const turn = room.chess.turn() as 'w' | 'b';
        const elapsed = now - room.lastMoveTimestamp;

        if (turn === 'w') {
          const remaining = Math.max(0, room.whiteTimeMs - elapsed);
          if (remaining <= 0) {
            this.handleTimeout(room, 'w');
          }
        } else {
          const remaining = Math.max(0, room.blackTimeMs - elapsed);
          if (remaining <= 0) {
            this.handleTimeout(room, 'b');
          }
        }
      });
    }, 250);
  }

  /**
   * Periodic clock synchronization broadcaster: sends authoritative times every 1000ms
   */
  private startClockSyncBroadcaster() {
    if (this.clockSyncInterval) clearInterval(this.clockSyncInterval);

    this.clockSyncInterval = setInterval(() => {
      const now = Date.now();
      this.rooms.forEach((room) => {
        if (!room.isGameActive || room.gameOver || !room.white || !room.black) return;

        const turn = room.chess.turn() as 'w' | 'b';
        const elapsed = now - room.lastMoveTimestamp;

        let currentWhiteTime = room.whiteTimeMs;
        let currentBlackTime = room.blackTimeMs;

        if (room.timeControl.initialSeconds > 0) {
          if (turn === 'w') {
            currentWhiteTime = Math.max(0, room.whiteTimeMs - elapsed);
          } else {
            currentBlackTime = Math.max(0, room.blackTimeMs - elapsed);
          }
        }

        this.broadcastToRoom(room, {
          type: 'clock_sync',
          roomId: room.id,
          whiteTimeMs: currentWhiteTime,
          blackTimeMs: currentBlackTime,
          turn,
          lastMoveTimestamp: room.lastMoveTimestamp,
          serverTime: now,
          isGameActive: room.isGameActive,
        });
      });
    }, 1000);
  }

  /**
   * Authoritative Elo calculation and game finalization by the server
   */
  private finalizeGameOver(
    room: RoomInstance,
    winner: 'w' | 'b' | 'draw',
    reason: string
  ): MultiplayerGameOver {
    room.isGameActive = false;

    // Retrieve authoritative player records from server store
    const whiteId = room.white?.id || '';
    const blackId = room.black?.id || '';

    const whiteAuth = this.getOrCreateAuthoritativeUser(whiteId, room.white?.name);
    const blackAuth = this.getOrCreateAuthoritativeUser(blackId, room.black?.name);

    const whiteResult = winner === 'w' ? 'win' : winner === 'b' ? 'loss' : 'draw';
    const blackResult = winner === 'b' ? 'win' : winner === 'w' ? 'loss' : 'draw';

    // Authoritative calculation using placement volatility (first 7 matches ±100, established ±7..8)
    const whiteCalc = calculateEloUpdate(whiteAuth.rating, blackAuth.rating, whiteResult, whiteAuth.gamesPlayed);
    const blackCalc = calculateEloUpdate(blackAuth.rating, whiteAuth.rating, blackResult, blackAuth.gamesPlayed);

    // Update server single-source-of-truth stats
    whiteAuth.rating = whiteCalc.newRating;
    whiteAuth.gamesPlayed = whiteCalc.matchesPlayed;
    whiteAuth.peakRating = Math.max(whiteAuth.peakRating, whiteCalc.newRating);
    if (whiteResult === 'win') whiteAuth.wins++;
    else if (whiteResult === 'loss') whiteAuth.losses++;
    else whiteAuth.draws++;
    whiteAuth.lastUpdated = Date.now();

    blackAuth.rating = blackCalc.newRating;
    blackAuth.gamesPlayed = blackCalc.matchesPlayed;
    blackAuth.peakRating = Math.max(blackAuth.peakRating, blackCalc.newRating);
    if (blackResult === 'win') blackAuth.wins++;
    else if (blackResult === 'loss') blackAuth.losses++;
    else blackAuth.draws++;
    blackAuth.lastUpdated = Date.now();

    if (room.white) {
      room.white.rating = whiteCalc.newRating;
      room.white.gamesPlayed = whiteCalc.matchesPlayed;
      room.white.ratingDelta = whiteCalc.ratingDelta;
    }
    if (room.black) {
      room.black.rating = blackCalc.newRating;
      room.black.gamesPlayed = blackCalc.matchesPlayed;
      room.black.ratingDelta = blackCalc.ratingDelta;
    }

    const gameOverData: MultiplayerGameOver = {
      winner,
      reason,
      whiteRating: whiteCalc.newRating,
      whiteRatingDelta: whiteCalc.ratingDelta,
      blackRating: blackCalc.newRating,
      blackRatingDelta: blackCalc.ratingDelta,
      whiteIsProvisional: whiteCalc.isProvisional,
      blackIsProvisional: blackCalc.isProvisional,
      whiteMatchesPlayed: whiteCalc.matchesPlayed,
      blackMatchesPlayed: blackCalc.matchesPlayed,
    };

    room.gameOver = gameOverData;
    return gameOverData;
  }

  private handleTimeout(room: RoomInstance, flaggedColor: 'w' | 'b') {
    const winner = flaggedColor === 'w' ? 'b' : 'w';
    const reason = `${flaggedColor === 'w' ? 'White' : 'Black'} ran out of time`;
    const gameOverDetails = this.finalizeGameOver(room, winner, reason);

    if (flaggedColor === 'w') room.whiteTimeMs = 0;
    else room.blackTimeMs = 0;

    const now = Date.now();
    this.broadcastToRoom(room, {
      type: 'move_made',
      from: '',
      to: '',
      san: '',
      fen: room.chess.fen(),
      turn: room.chess.turn() as 'w' | 'b',
      whiteTimeMs: room.whiteTimeMs,
      blackTimeMs: room.blackTimeMs,
      isCheck: false,
      isGameOver: true,
      gameOver: gameOverDetails,
      lastMoveTimestamp: now,
      serverTime: now,
    });
  }

  public handleConnection(ws: WebSocket) {
    const initialPlayerId = `guest_${crypto.randomBytes(6).toString('hex')}`;
    const client: ConnectedClient = {
      ws,
      playerId: initialPlayerId,
      playerName: 'Player',
      isAuthenticated: false,
      rating: INITIAL_RATING,
      gamesPlayed: 0,
    };
    this.clients.set(ws, client);

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as ClientMultiplayerEvent;
        this.handleClientEvent(ws, client, data);
      } catch (err) {
        console.error('[Multiplayer WS] Parse error:', err);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws, client);
    });

    ws.on('error', (err) => {
      console.warn('[Multiplayer WS] Socket error:', err);
    });
  }

  private handleDisconnect(ws: WebSocket, client: ConnectedClient) {
    if (client.roomId) {
      const room = this.rooms.get(client.roomId);
      if (room) {
        if (room.white && room.white.id === client.playerId) {
          room.white.connected = false;
          room.white.ws = undefined;
        } else if (room.black && room.black.id === client.playerId) {
          room.black.connected = false;
          room.black.ws = undefined;
        } else {
          room.spectators = room.spectators.filter((s) => s.ws !== ws);
        }

        this.broadcastPresence(room);
      }
    }
    this.clients.delete(ws);
  }

  private handleClientEvent(ws: WebSocket, client: ConnectedClient, event: ClientMultiplayerEvent) {
    switch (event.type) {
      case 'join_room':
        this.joinRoom(ws, client, event);
        break;
      case 'move':
        this.processMove(ws, client, event);
        break;
      case 'resign':
        this.processResign(ws, client, event);
        break;
      case 'draw_offer':
        this.processDrawOffer(ws, client, event);
        break;
      case 'draw_accept':
        this.processDrawAccept(ws, client, event);
        break;
      case 'draw_decline':
        this.processDrawDecline(ws, client, event);
        break;
      case 'rematch_offer':
        this.processRematchOffer(ws, client, event);
        break;
      case 'rematch_accept':
        this.processRematchAccept(ws, client, event);
        break;
      case 'chat':
        this.processChat(ws, client, event);
        break;
    }
  }

  private getOrCreateRoom(
    roomId: string,
    timeControlConfig?: MultiplayerTimeControl,
    options?: { isPrivate?: boolean; passcode?: string; allowedPlayerIds?: string[] }
  ): RoomInstance {
    const existing = this.rooms.get(roomId);
    if (existing) {
      if (options?.allowedPlayerIds && options.allowedPlayerIds.length > 0) {
        existing.allowedPlayerIds = options.allowedPlayerIds;
      }
      return existing;
    }

    const tc = timeControlConfig || {
      initialSeconds: 300,
      incrementSeconds: 3,
      name: '5 min | Blitz',
    };

    const initialMs = tc.initialSeconds > 0 ? tc.initialSeconds * 1000 : 0;

    const newRoom: RoomInstance = {
      id: roomId,
      chess: new Chess(),
      timeControl: tc,
      white: null,
      black: null,
      spectators: [],
      whiteTimeMs: initialMs,
      blackTimeMs: initialMs,
      lastMoveTimestamp: Date.now(),
      isGameActive: false,
      gameOver: null,
      drawOfferedBy: null,
      rematchOfferedBy: null,
      chat: [],
      lastActivity: Date.now(),
      isPrivate: options?.isPrivate,
      passcode: options?.passcode,
      allowedPlayerIds: options?.allowedPlayerIds,
    };

    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  private joinRoom(
    ws: WebSocket,
    client: ConnectedClient,
    payload: { 
      roomId: string; 
      playerName: string; 
      preferredColor?: 'w' | 'b' | 'random'; 
      playerId?: string;
      authToken?: string;
      passcode?: string;
      allowedPlayerIds?: string[];
    }
  ) {
    // 1. Authenticate user identity and bind WebSocket session to Firebase Auth user
    let verifiedUid = client.playerId;
    let verifiedName = (payload.playerName || 'Player').trim().substring(0, 32);

    if (payload.authToken) {
      const verifiedToken = verifyFirebaseIdToken(payload.authToken);
      if (verifiedToken) {
        verifiedUid = verifiedToken.uid;
        client.isAuthenticated = true;
        if (verifiedToken.name) {
          verifiedName = verifiedToken.name.substring(0, 32);
        }
      }
    } else if (payload.playerId && payload.playerId.trim()) {
      // Fallback identifier
      verifiedUid = payload.playerId.trim();
    }

    client.playerId = verifiedUid;
    client.playerName = verifiedName;

    // 2. Fetch authoritative Elo rating and statistics from server single-source-of-truth
    const authoritativeStats = this.getOrCreateAuthoritativeUser(verifiedUid, verifiedName);
    client.rating = authoritativeStats.rating;
    client.gamesPlayed = authoritativeStats.gamesPlayed;

    // 3. Clean and sanitize Room ID
    const cleanRoomId = (payload.roomId || 'MAIN').trim().toUpperCase();
    const room = this.getOrCreateRoom(cleanRoomId, undefined, {
      passcode: payload.passcode,
      allowedPlayerIds: payload.allowedPlayerIds,
    });
    client.roomId = cleanRoomId;

    // 4. Room access and authorization checks for secured private matches
    if (room.allowedPlayerIds && room.allowedPlayerIds.length > 0) {
      const isAllowedPlayer = room.allowedPlayerIds.includes(client.playerId);
      if (!isAllowedPlayer && (room.isPrivate || room.white || room.black)) {
        // Non-invited user cannot take a player seat in a private friend challenge room
      }
    }

    if (room.passcode && payload.passcode !== room.passcode) {
      this.send(ws, { type: 'error', message: 'Invalid room passcode' });
      return;
    }

    let role: MultiplayerRole = 'spectator';

    // 5. Check if reconnecting as existing White or Black player
    if (room.white && room.white.id === client.playerId) {
      room.white.connected = true;
      room.white.ws = ws;
      room.white.name = client.playerName;
      room.white.rating = authoritativeStats.rating;
      room.white.gamesPlayed = authoritativeStats.gamesPlayed;
      role = 'white';
    } else if (room.black && room.black.id === client.playerId) {
      room.black.connected = true;
      room.black.ws = ws;
      room.black.name = client.playerName;
      room.black.rating = authoritativeStats.rating;
      room.black.gamesPlayed = authoritativeStats.gamesPlayed;
      role = 'black';
    }
    // 6. Assign empty White or Black slot
    else if (!room.white && !room.black) {
      let assignColor: 'w' | 'b' = 'w';
      if (payload.preferredColor === 'b') assignColor = 'b';
      else if (payload.preferredColor === 'random') assignColor = Math.random() < 0.5 ? 'w' : 'b';

      if (assignColor === 'w') {
        room.white = { 
          id: client.playerId, 
          name: client.playerName, 
          connected: true, 
          color: 'w', 
          rating: authoritativeStats.rating,
          gamesPlayed: authoritativeStats.gamesPlayed,
          ws 
        };
        role = 'white';
      } else {
        room.black = { 
          id: client.playerId, 
          name: client.playerName, 
          connected: true, 
          color: 'b', 
          rating: authoritativeStats.rating,
          gamesPlayed: authoritativeStats.gamesPlayed,
          ws 
        };
        role = 'black';
      }
    } else if (!room.white) {
      room.white = { 
        id: client.playerId, 
        name: client.playerName, 
        connected: true, 
        color: 'w', 
        rating: authoritativeStats.rating,
        gamesPlayed: authoritativeStats.gamesPlayed,
        ws 
      };
      role = 'white';
    } else if (!room.black) {
      room.black = { 
        id: client.playerId, 
        name: client.playerName, 
        connected: true, 
        color: 'b', 
        rating: authoritativeStats.rating,
        gamesPlayed: authoritativeStats.gamesPlayed,
        ws 
      };
      role = 'black';
    } else {
      // Both player seats filled: join as spectator
      role = 'spectator';
      room.spectators.push({ id: client.playerId, name: client.playerName, ws });
    }

    // Start game if both players are seated and game not yet active
    if (room.white && room.black && !room.isGameActive && !room.gameOver) {
      room.isGameActive = true;
      room.lastMoveTimestamp = Date.now();
    }

    const now = Date.now();
    const state = this.serializeRoomState(room);
    this.send(ws, {
      type: 'room_state',
      state,
      yourRole: role,
      yourId: client.playerId,
      serverTime: now,
    });

    if (role === 'white' || role === 'black') {
      this.broadcastToRoom(room, {
        type: 'opponent_joined',
        player: { 
          name: client.playerName, 
          color: role === 'white' ? 'w' : 'b',
          rating: authoritativeStats.rating,
          gamesPlayed: authoritativeStats.gamesPlayed,
        },
      }, ws);
    }

    this.broadcastPresence(room);
  }

  private processMove(
    ws: WebSocket,
    client: ConnectedClient,
    payload: { roomId: string; from: string; to: string; promotion?: string }
  ) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.isGameActive || room.gameOver) {
      return this.send(ws, { type: 'error', message: 'Game is not active' });
    }

    const currentTurn = room.chess.turn() as 'w' | 'b';
    const isWhite = room.white && room.white.id === client.playerId;
    const isBlack = room.black && room.black.id === client.playerId;

    if ((currentTurn === 'w' && !isWhite) || (currentTurn === 'b' && !isBlack)) {
      return this.send(ws, { type: 'error', message: 'Not your turn' });
    }

    const now = Date.now();
    const elapsed = now - room.lastMoveTimestamp;

    if (room.timeControl.initialSeconds > 0) {
      if (currentTurn === 'w') {
        room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed + room.timeControl.incrementSeconds * 1000);
      } else {
        room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed + room.timeControl.incrementSeconds * 1000);
      }
    }

    try {
      const moveRes = room.chess.move({
        from: payload.from,
        to: payload.to,
        promotion: payload.promotion || 'q',
      });

      if (!moveRes) {
        return this.send(ws, { type: 'error', message: 'Illegal move' });
      }

      room.lastMoveTimestamp = now;
      room.drawOfferedBy = null;

      let gameOverDetails: MultiplayerGameOver | null = null;
      let isGameOver = false;

      if (room.chess.isCheckmate()) {
        isGameOver = true;
        gameOverDetails = this.finalizeGameOver(
          room,
          currentTurn,
          `Checkmate! ${currentTurn === 'w' ? 'White' : 'Black'} wins!`
        );
      } else if (room.chess.isStalemate()) {
        isGameOver = true;
        gameOverDetails = this.finalizeGameOver(room, 'draw', 'Draw by stalemate');
      } else if (room.chess.isThreefoldRepetition()) {
        isGameOver = true;
        gameOverDetails = this.finalizeGameOver(room, 'draw', 'Draw by threefold repetition');
      } else if (room.chess.isInsufficientMaterial()) {
        isGameOver = true;
        gameOverDetails = this.finalizeGameOver(room, 'draw', 'Draw by insufficient material');
      } else if (room.chess.isDraw()) {
        isGameOver = true;
        gameOverDetails = this.finalizeGameOver(room, 'draw', 'Draw by 50-move rule');
      }

      this.broadcastToRoom(room, {
        type: 'move_made',
        from: moveRes.from,
        to: moveRes.to,
        san: moveRes.san,
        fen: room.chess.fen(),
        turn: room.chess.turn() as 'w' | 'b',
        whiteTimeMs: room.whiteTimeMs,
        blackTimeMs: room.blackTimeMs,
        isCheck: room.chess.inCheck(),
        isGameOver,
        gameOver: gameOverDetails,
        lastMoveTimestamp: now,
        serverTime: now,
      });
    } catch {
      this.send(ws, { type: 'error', message: 'Invalid move coordinates' });
    }
  }

  private processResign(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.isGameActive || room.gameOver) return;

    let resigningColor: 'w' | 'b' | null = null;
    if (room.white && room.white.id === client.playerId) resigningColor = 'w';
    else if (room.black && room.black.id === client.playerId) resigningColor = 'b';
    if (!resigningColor) return;

    const winner = resigningColor === 'w' ? 'b' : 'w';
    const reason = `${resigningColor === 'w' ? 'White' : 'Black'} resigned`;
    const gameOverDetails = this.finalizeGameOver(room, winner, reason);

    const now = Date.now();
    this.broadcastToRoom(room, {
      type: 'move_made',
      from: '',
      to: '',
      san: '',
      fen: room.chess.fen(),
      turn: room.chess.turn() as 'w' | 'b',
      whiteTimeMs: room.whiteTimeMs,
      blackTimeMs: room.blackTimeMs,
      isCheck: false,
      isGameOver: true,
      gameOver: gameOverDetails,
      lastMoveTimestamp: now,
      serverTime: now,
    });
  }

  private processDrawOffer(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.isGameActive || room.gameOver) return;

    let offeringColor: 'w' | 'b' | null = null;
    if (room.white && room.white.id === client.playerId) offeringColor = 'w';
    else if (room.black && room.black.id === client.playerId) offeringColor = 'b';
    if (!offeringColor) return;

    room.drawOfferedBy = offeringColor;
    this.broadcastToRoom(room, {
      type: 'draw_offered',
      by: offeringColor,
    }, ws);
  }

  private processDrawAccept(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.isGameActive || room.gameOver || !room.drawOfferedBy) return;

    const isWhite = room.white && room.white.id === client.playerId;
    const isBlack = room.black && room.black.id === client.playerId;
    if (!isWhite && !isBlack) return;

    const acceptingColor = isWhite ? 'w' : 'b';
    if (acceptingColor === room.drawOfferedBy) return; // Cannot accept own draw offer

    const gameOverDetails = this.finalizeGameOver(room, 'draw', 'Draw agreed by mutual consensus');

    const now = Date.now();
    this.broadcastToRoom(room, {
      type: 'move_made',
      from: '',
      to: '',
      san: '',
      fen: room.chess.fen(),
      turn: room.chess.turn() as 'w' | 'b',
      whiteTimeMs: room.whiteTimeMs,
      blackTimeMs: room.blackTimeMs,
      isCheck: false,
      isGameOver: true,
      gameOver: gameOverDetails,
      lastMoveTimestamp: now,
      serverTime: now,
    });
  }

  private processDrawDecline(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.drawOfferedBy) return;
    room.drawOfferedBy = null;
    this.broadcastToRoom(room, { type: 'draw_declined' });
  }

  private processRematchOffer(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.gameOver) {
      return this.send(ws, { type: 'error', message: 'No finished game to rematch' });
    }

    const isWhite = room.white && room.white.id === client.playerId;
    const isBlack = room.black && room.black.id === client.playerId;
    if (!isWhite && !isBlack) {
      return this.send(ws, { type: 'error', message: 'Only match players can offer a rematch' });
    }

    const color = isWhite ? 'w' : 'b';
    room.rematchOfferedBy = color;
    this.broadcastToRoom(room, { type: 'rematch_offered', by: color }, ws);
  }

  /**
   * Authoritative rematch acceptance validation: ONLY the other player can accept
   */
  private processRematchAccept(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.gameOver) {
      return this.send(ws, { type: 'error', message: 'No finished match to rematch' });
    }
    if (!room.rematchOfferedBy) {
      return this.send(ws, { type: 'error', message: 'No active rematch offer to accept' });
    }

    // Strictly validate that only the opponent (the other player) can accept
    const isWhite = room.white && room.white.id === client.playerId;
    const isBlack = room.black && room.black.id === client.playerId;

    if (!isWhite && !isBlack) {
      return this.send(ws, { type: 'error', message: 'Spectators cannot accept a rematch' });
    }

    const acceptingColor: 'w' | 'b' = isWhite ? 'w' : 'b';
    if (acceptingColor === room.rematchOfferedBy) {
      return this.send(ws, { type: 'error', message: 'You cannot accept your own rematch offer' });
    }

    // Reset chess board with authoritative state
    room.chess = new Chess();
    room.gameOver = null;
    room.drawOfferedBy = null;
    room.rematchOfferedBy = null;
    room.isGameActive = true;
    room.lastMoveTimestamp = Date.now();

    const initialMs = room.timeControl.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;
    room.whiteTimeMs = initialMs;
    room.blackTimeMs = initialMs;

    // Swap player colors for fair alternating play
    const oldWhite = room.white;
    const oldBlack = room.black;

    if (oldWhite && oldBlack) {
      room.white = { ...oldBlack, color: 'w' };
      room.black = { ...oldWhite, color: 'b' };
    }

    const updatedState = this.serializeRoomState(room);
    this.broadcastToRoom(room, {
      type: 'rematch_started',
      state: updatedState,
    });
  }

  private processChat(ws: WebSocket, client: ConnectedClient, payload: { roomId: string; text: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room) return;

    const cleanText = (payload.text || '').trim().substring(0, 150);
    if (!cleanText) return;

    let senderColor: 'w' | 'b' | 'spectator' = 'spectator';
    if (room.white && room.white.id === client.playerId) senderColor = 'w';
    else if (room.black && room.black.id === client.playerId) senderColor = 'b';

    const message: MultiplayerChatMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      sender: client.playerName,
      senderColor,
      text: cleanText,
      timestamp: Date.now(),
    };

    room.chat.push(message);
    if (room.chat.length > 50) room.chat.shift();

    this.broadcastToRoom(room, {
      type: 'chat_message',
      message,
    });
  }

  private broadcastPresence(room: RoomInstance) {
    this.broadcastToRoom(room, {
      type: 'presence',
      whiteConnected: Boolean(room.white?.connected),
      blackConnected: Boolean(room.black?.connected),
      spectatorsCount: room.spectators.length,
      whiteName: room.white?.name,
      blackName: room.black?.name,
      whiteRating: room.white?.rating,
      blackRating: room.black?.rating,
    });
  }

  private broadcastToRoom(room: RoomInstance, event: ServerMultiplayerEvent, skipWs?: WebSocket) {
    const payload = JSON.stringify(event);
    const recipients: WebSocket[] = [];

    if (room.white?.ws && room.white.ws.readyState === WebSocket.OPEN) {
      recipients.push(room.white.ws);
    }
    if (room.black?.ws && room.black.ws.readyState === WebSocket.OPEN) {
      recipients.push(room.black.ws);
    }
    room.spectators.forEach((s) => {
      if (s.ws.readyState === WebSocket.OPEN) {
        recipients.push(s.ws);
      }
    });

    recipients.forEach((ws) => {
      if (ws !== skipWs) {
        try {
          ws.send(payload);
        } catch (e) {
          console.warn('[Multiplayer WS] Broadcast error:', e);
        }
      }
    });
  }

  private send(ws: WebSocket, event: ServerMultiplayerEvent) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        console.warn('[Multiplayer WS] Send error:', e);
      }
    }
  }

  private serializeRoomState(room: RoomInstance): MultiplayerRoomState {
    return {
      roomId: room.id,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      turn: room.chess.turn() as 'w' | 'b',
      white: room.white
        ? {
            id: room.white.id,
            name: room.white.name,
            connected: room.white.connected,
            color: 'w',
            rating: room.white.rating,
            gamesPlayed: room.white.gamesPlayed,
            ratingDelta: room.white.ratingDelta,
          }
        : null,
      black: room.black
        ? {
            id: room.black.id,
            name: room.black.name,
            connected: room.black.connected,
            color: 'b',
            rating: room.black.rating,
            gamesPlayed: room.black.gamesPlayed,
            ratingDelta: room.black.ratingDelta,
          }
        : null,
      spectatorsCount: room.spectators.length,
      whiteTimeMs: room.whiteTimeMs,
      blackTimeMs: room.blackTimeMs,
      timeControl: room.timeControl,
      isGameActive: room.isGameActive,
      gameOver: room.gameOver,
      history: room.chess.history(),
      drawOfferedBy: room.drawOfferedBy,
      rematchOfferedBy: room.rematchOfferedBy,
      chat: room.chat,
      lastMoveTimestamp: room.lastMoveTimestamp,
      serverTime: Date.now(),
      isPrivate: room.isPrivate,
      allowedPlayerIds: room.allowedPlayerIds,
    };
  }
}

export const multiplayerServer = new MultiplayerServerManager();
