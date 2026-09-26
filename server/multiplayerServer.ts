import { WebSocket } from 'ws';
import { Chess } from 'chess.js';
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

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  playerName: string;
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
}

class MultiplayerServerManager {
  private rooms: Map<string, RoomInstance> = new Map();
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startClockTicker();
  }

  /**
   * Clock ticker: checks active games every 500ms to detect flag falls (time out)
   */
  private startClockTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const now = Date.now();

      this.rooms.forEach((room) => {
        // Only tick if game is active, has both players, and time control has time limits
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
    }, 500);
  }

  /**
   * Authoritative Elo calculation and game finalization
   */
  private finalizeGameOver(
    room: RoomInstance,
    winner: 'w' | 'b' | 'draw',
    reason: string
  ): MultiplayerGameOver {
    room.isGameActive = false;

    const whiteRating = room.white?.rating ?? INITIAL_RATING;
    const blackRating = room.black?.rating ?? INITIAL_RATING;
    const whiteGames = room.white?.gamesPlayed ?? 0;
    const blackGames = room.black?.gamesPlayed ?? 0;

    const whiteResult = winner === 'w' ? 'win' : winner === 'b' ? 'loss' : 'draw';
    const blackResult = winner === 'b' ? 'win' : winner === 'w' ? 'loss' : 'draw';

    // Compute Elo update using the advance first 7 match volatile (±100) vs established (±7..8) model
    const whiteCalc = calculateEloUpdate(whiteRating, blackRating, whiteResult, whiteGames);
    const blackCalc = calculateEloUpdate(blackRating, whiteRating, blackResult, blackGames);

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
    });
  }

  public handleConnection(ws: WebSocket) {
    const client: ConnectedClient = {
      ws,
      playerId: `p_${Math.random().toString(36).substring(2, 9)}`,
      playerName: 'Player',
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
    timeControlConfig?: MultiplayerTimeControl
  ): RoomInstance {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

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
      playerRating?: number;
      gamesPlayed?: number;
    }
  ) {
    const cleanRoomId = (payload.roomId || 'MAIN').trim().toUpperCase();
    const room = this.getOrCreateRoom(cleanRoomId);
    client.roomId = cleanRoomId;
    if (payload.playerId) client.playerId = payload.playerId;
    if (payload.playerName) client.playerName = payload.playerName.trim() || 'Grandmaster';
    if (typeof payload.playerRating === 'number') client.rating = payload.playerRating;
    if (typeof payload.gamesPlayed === 'number') client.gamesPlayed = payload.gamesPlayed;

    let role: MultiplayerRole = 'spectator';

    // 1. Check if reconnecting as existing White or Black player
    if (room.white && room.white.id === client.playerId) {
      room.white.connected = true;
      room.white.ws = ws;
      room.white.name = client.playerName;
      if (typeof payload.playerRating === 'number') room.white.rating = payload.playerRating;
      if (typeof payload.gamesPlayed === 'number') room.white.gamesPlayed = payload.gamesPlayed;
      role = 'white';
    } else if (room.black && room.black.id === client.playerId) {
      room.black.connected = true;
      room.black.ws = ws;
      room.black.name = client.playerName;
      if (typeof payload.playerRating === 'number') room.black.rating = payload.playerRating;
      if (typeof payload.gamesPlayed === 'number') room.black.gamesPlayed = payload.gamesPlayed;
      role = 'black';
    }
    // 2. Assign empty White or Black slot
    else if (!room.white && !room.black) {
      // First player joining
      let assignColor: 'w' | 'b' = 'w';
      if (payload.preferredColor === 'b') assignColor = 'b';
      else if (payload.preferredColor === 'random') assignColor = Math.random() < 0.5 ? 'w' : 'b';

      if (assignColor === 'w') {
        room.white = { 
          id: client.playerId, 
          name: client.playerName, 
          connected: true, 
          color: 'w', 
          rating: client.rating,
          gamesPlayed: client.gamesPlayed,
          ws 
        };
        role = 'white';
      } else {
        room.black = { 
          id: client.playerId, 
          name: client.playerName, 
          connected: true, 
          color: 'b', 
          rating: client.rating,
          gamesPlayed: client.gamesPlayed,
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
        rating: client.rating,
        gamesPlayed: client.gamesPlayed,
        ws 
      };
      role = 'white';
    } else if (!room.black) {
      room.black = { 
        id: client.playerId, 
        name: client.playerName, 
        connected: true, 
        color: 'b', 
        rating: client.rating,
        gamesPlayed: client.gamesPlayed,
        ws 
      };
      role = 'black';
    } else {
      // Both seats filled: join as spectator
      role = 'spectator';
      room.spectators.push({ id: client.playerId, name: client.playerName, ws });
    }

    // Check if game should start now (both White and Black present)
    if (room.white && room.black && !room.isGameActive && !room.gameOver) {
      room.isGameActive = true;
      room.lastMoveTimestamp = Date.now();
    }

    // Send complete authoritative room snapshot to this client
    const state = this.serializeRoomState(room);
    this.send(ws, {
      type: 'room_state',
      state,
      yourRole: role,
      yourId: client.playerId,
    });

    // Notify other players
    if (role === 'white' || role === 'black') {
      this.broadcastToRoom(room, {
        type: 'opponent_joined',
        player: { 
          name: client.playerName, 
          color: role === 'white' ? 'w' : 'b',
          rating: client.rating,
          gamesPlayed: client.gamesPlayed,
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

    // Deduct elapsed time from moving player
    if (room.timeControl.initialSeconds > 0) {
      if (currentTurn === 'w') {
        room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed + room.timeControl.incrementSeconds * 1000);
      } else {
        room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed + room.timeControl.incrementSeconds * 1000);
      }
    }

    // Attempt authoritative move execution in chess.js
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
      room.drawOfferedBy = null; // Move cancels any pending draw offer

      // Check game over
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

      // Broadcast move to all room participants
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

    const acceptingColor = room.white && room.white.id === client.playerId ? 'w' : 'b';
    if (acceptingColor === room.drawOfferedBy) return; // Can't accept own draw offer

    const gameOverDetails = this.finalizeGameOver(room, 'draw', 'Draw agreed by mutual consensus');

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
    if (!room || !room.gameOver) return;

    const isWhite = room.white && room.white.id === client.playerId;
    const isBlack = room.black && room.black.id === client.playerId;
    if (!isWhite && !isBlack) return;

    const color = isWhite ? 'w' : 'b';
    room.rematchOfferedBy = color;
    this.broadcastToRoom(room, { type: 'rematch_offered', by: color }, ws);
  }

  private processRematchAccept(ws: WebSocket, client: ConnectedClient, payload: { roomId: string }) {
    const room = this.rooms.get(payload.roomId);
    if (!room || !room.gameOver || !room.rematchOfferedBy) return;

    // Reset chess board
    room.chess = new Chess();
    room.gameOver = null;
    room.drawOfferedBy = null;
    room.rematchOfferedBy = null;
    room.isGameActive = true;
    room.lastMoveTimestamp = Date.now();

    const initialMs = room.timeControl.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;
    room.whiteTimeMs = initialMs;
    room.blackTimeMs = initialMs;

    // Swap player colors for fair alternating play!
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
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
          console.warn('[Multiplayer WS] Broadcast error to socket:', e);
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
    };
  }
}

export const multiplayerServer = new MultiplayerServerManager();
