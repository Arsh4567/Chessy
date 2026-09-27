import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import {
  MultiplayerRoomState,
  MultiplayerRole,
  MultiplayerChatMessage,
  ServerMultiplayerEvent,
  ClientMultiplayerEvent,
  MultiplayerGameOver,
} from '../types/multiplayer';
import { sound } from '../utils/sound';
import { loadUserStats, recordMultiplayerGameResult, UserStats } from '../utils/storage';
import { INITIAL_RATING } from '../utils/eloRating';
import { auth } from '../firebase/config';

export interface MultiplayerGameRatingSummary {
  result: 'win' | 'loss' | 'draw';
  opponentName: string;
  opponentRating: number;
  oldRating: number;
  newRating: number;
  ratingDelta: number;
  isProvisional: boolean;
  matchesPlayed: number;
  performanceTier: string;
  movesCount: number;
}

export interface UseMultiplayerGameOptions {
  onStatsUpdated?: (stats: UserStats) => void;
}

interface ServerClockSnapshot {
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
  serverTime: number;
  turn: 'w' | 'b';
  isGameActive: boolean;
  gameOver: boolean;
  clientTimeAtSnapshot: number;
}

export function useMultiplayerGame(options: UseMultiplayerGameOptions = {}) {
  const [connected, setConnected] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null);
  const [myRole, setMyRole] = useState<MultiplayerRole>('spectator');
  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    if (auth.currentUser?.uid) return auth.currentUser.uid;
    return localStorage.getItem('gm_multiplayer_player_id') || `p_${Math.random().toString(36).substring(2, 9)}`;
  });
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [drawOfferReceived, setDrawOfferReceived] = useState<boolean>(false);
  const [rematchOfferReceived, setRematchOfferReceived] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastGameRatingSummary, setLastGameRatingSummary] = useState<MultiplayerGameRatingSummary | null>(null);

  // Synchronized client clocks
  const [whiteDisplayTimeMs, setWhiteDisplayTimeMs] = useState<number>(300000);
  const [blackDisplayTimeMs, setBlackDisplayTimeMs] = useState<number>(300000);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<MultiplayerRoomState | null>(null);
  lastStateRef.current = roomState;
  const myRoleRef = useRef<MultiplayerRole>('spectator');
  myRoleRef.current = myRole;
  const chessRef = useRef<Chess>(chess);
  chessRef.current = chess;
  const onStatsUpdatedRef = useRef(options.onStatsUpdated);
  onStatsUpdatedRef.current = options.onStatsUpdated;

  // Authoritative server clock snapshot
  const serverClockSnapshotRef = useRef<ServerClockSnapshot>({
    whiteTimeMs: 300000,
    blackTimeMs: 300000,
    lastMoveTimestamp: Date.now(),
    serverTime: Date.now(),
    turn: 'w',
    isGameActive: false,
    gameOver: false,
    clientTimeAtSnapshot: Date.now(),
  });

  // Track recorded games to prevent duplicate rating calculations
  const recordedMatchKeysRef = useRef<Set<string>>(new Set());

  // Update playerId when Firebase auth state changes
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user?.uid) {
        setMyPlayerId(user.uid);
        localStorage.setItem('gm_multiplayer_player_id', user.uid);
      }
    });
    return () => unsub();
  }, []);

  // Persist playerId
  useEffect(() => {
    localStorage.setItem('gm_multiplayer_player_id', myPlayerId);
  }, [myPlayerId]);

  // Helper to obtain Firebase auth token for server-side session binding
  const getAuthToken = useCallback(async (): Promise<string | undefined> => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, []);

  // Processes game over and records the advance Elo rating transition
  const handleGameOverRecord = useCallback((
    gameOver: MultiplayerGameOver,
    currentChess: Chess,
    state: MultiplayerRoomState,
    role: MultiplayerRole
  ) => {
    if (role !== 'white' && role !== 'black') return;

    const matchKey = `${state.roomId}_${gameOver.winner}_${gameOver.reason}_${currentChess.history().length}`;
    if (recordedMatchKeysRef.current.has(matchKey)) return;
    recordedMatchKeysRef.current.add(matchKey);

    const myResult: 'win' | 'loss' | 'draw' =
      gameOver.winner === 'draw'
        ? 'draw'
        : gameOver.winner === (role === 'white' ? 'w' : 'b')
        ? 'win'
        : 'loss';

    const opp = role === 'white' ? state.black : state.white;
    const opponentName = opp?.name || (role === 'white' ? 'Black' : 'White');
    const opponentRating = opp?.rating ?? INITIAL_RATING;

    // Use authoritative server-calculated rating deltas
    const serverRatingDelta = role === 'white' ? gameOver.whiteRatingDelta : gameOver.blackRatingDelta;
    const serverNewRating = role === 'white' ? gameOver.whiteRating : gameOver.blackRating;

    const movesCount = Math.ceil(currentChess.history().length / 2);

    const updateRes = recordMultiplayerGameResult({
      roomId: state.roomId,
      result: myResult,
      opponentName,
      opponentRating,
      movesCount,
      pgn: currentChess.pgn(),
      serverRatingDelta,
      serverNewRating,
    });

    const summary: MultiplayerGameRatingSummary = {
      result: myResult,
      opponentName,
      opponentRating,
      oldRating: updateRes.oldRating,
      newRating: updateRes.newRating,
      ratingDelta: updateRes.ratingDelta,
      isProvisional: updateRes.calc.isProvisional,
      matchesPlayed: updateRes.calc.matchesPlayed,
      performanceTier: updateRes.calc.performanceTier,
      movesCount,
    };

    setLastGameRatingSummary(summary);
    if (onStatsUpdatedRef.current) {
      onStatsUpdatedRef.current(updateRes.stats);
    }
  }, []);

  // Connect to WebSocket server
  const connectSocket = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/multiplayer`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = async () => {
      setConnected(true);
      setErrorMessage(null);

      // If re-joining an active room, authenticate and join seamlessly
      if (lastStateRef.current?.roomId) {
        const savedName = auth.currentUser?.displayName || localStorage.getItem('gm_player_name') || 'Grandmaster';
        const token = await getAuthToken();
        const msg: ClientMultiplayerEvent = {
          type: 'join_room',
          roomId: lastStateRef.current.roomId,
          playerName: savedName,
          playerId: auth.currentUser?.uid || myPlayerId,
          authToken: token,
        };
        ws.send(JSON.stringify(msg));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerMultiplayerEvent;
        handleServerEvent(data);
      } catch (err) {
        console.warn('[Multiplayer Client] Message parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSocket();
      }, 2500);
    };

    ws.onerror = (err) => {
      console.warn('[Multiplayer Client] WebSocket error:', err);
    };
  }, [myPlayerId, getAuthToken]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connectSocket]);

  const handleServerEvent = (event: ServerMultiplayerEvent) => {
    const now = Date.now();

    switch (event.type) {
      case 'room_state': {
        setRoomState(event.state);
        setMyRole(event.yourRole);
        myRoleRef.current = event.yourRole;
        setMyPlayerId(event.yourId);

        serverClockSnapshotRef.current = {
          whiteTimeMs: event.state.whiteTimeMs,
          blackTimeMs: event.state.blackTimeMs,
          lastMoveTimestamp: event.state.lastMoveTimestamp || event.serverTime || now,
          serverTime: event.serverTime || now,
          turn: event.state.turn,
          isGameActive: event.state.isGameActive,
          gameOver: Boolean(event.state.gameOver),
          clientTimeAtSnapshot: now,
        };

        setWhiteDisplayTimeMs(event.state.whiteTimeMs);
        setBlackDisplayTimeMs(event.state.blackTimeMs);

        try {
          const nextChess = new Chess(event.state.fen);
          setChess(nextChess);
          chessRef.current = nextChess;

          if (event.state.gameOver) {
            handleGameOverRecord(event.state.gameOver, nextChess, event.state, event.yourRole);
          }
        } catch {}
        break;
      }

      case 'move_made': {
        serverClockSnapshotRef.current = {
          whiteTimeMs: event.whiteTimeMs,
          blackTimeMs: event.blackTimeMs,
          lastMoveTimestamp: event.lastMoveTimestamp || event.serverTime || now,
          serverTime: event.serverTime || now,
          turn: event.turn,
          isGameActive: !event.isGameOver,
          gameOver: event.isGameOver,
          clientTimeAtSnapshot: now,
        };

        setWhiteDisplayTimeMs(event.whiteTimeMs);
        setBlackDisplayTimeMs(event.blackTimeMs);

        let nextChessInstance = chessRef.current;
        try {
          const nextChess = new Chess(event.fen);
          setChess(nextChess);
          chessRef.current = nextChess;
          nextChessInstance = nextChess;
          if (event.from && event.to) {
            setLastMove({ from: event.from, to: event.to });
          }
        } catch {}

        setRoomState((prev) => {
          if (!prev) return prev;
          const updatedState: MultiplayerRoomState = {
            ...prev,
            fen: event.fen,
            turn: event.turn,
            whiteTimeMs: event.whiteTimeMs,
            blackTimeMs: event.blackTimeMs,
            isGameActive: !event.isGameOver,
            gameOver: event.gameOver,
            drawOfferedBy: null,
            lastMoveTimestamp: event.lastMoveTimestamp,
          };

          if (event.isGameOver && event.gameOver) {
            handleGameOverRecord(event.gameOver, nextChessInstance, updatedState, myRoleRef.current);
          }

          return updatedState;
        });

        if (event.isGameOver) {
          sound.playGameOver();
        } else if (event.isCheck) {
          sound.playCheck();
        } else {
          sound.playMove();
        }
        break;
      }

      case 'clock_sync': {
        serverClockSnapshotRef.current = {
          whiteTimeMs: event.whiteTimeMs,
          blackTimeMs: event.blackTimeMs,
          lastMoveTimestamp: event.lastMoveTimestamp,
          serverTime: event.serverTime,
          turn: event.turn,
          isGameActive: event.isGameActive,
          gameOver: false,
          clientTimeAtSnapshot: now,
        };
        setWhiteDisplayTimeMs(event.whiteTimeMs);
        setBlackDisplayTimeMs(event.blackTimeMs);
        break;
      }

      case 'opponent_joined': {
        sound.playMatchStart();
        setRoomState((prev) => {
          if (!prev) return prev;
          if (event.player.color === 'w') {
            return {
              ...prev,
              white: { 
                id: 'opp', 
                name: event.player.name, 
                connected: true, 
                color: 'w', 
                rating: event.player.rating,
                gamesPlayed: event.player.gamesPlayed,
              },
              isGameActive: Boolean(prev.black),
            };
          } else {
            return {
              ...prev,
              black: { 
                id: 'opp', 
                name: event.player.name, 
                connected: true, 
                color: 'b', 
                rating: event.player.rating,
                gamesPlayed: event.player.gamesPlayed,
              },
              isGameActive: Boolean(prev.white),
            };
          }
        });
        break;
      }

      case 'presence': {
        setRoomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            spectatorsCount: event.spectatorsCount,
            white: prev.white ? { 
              ...prev.white, 
              connected: event.whiteConnected, 
              name: event.whiteName || prev.white.name,
              rating: typeof event.whiteRating === 'number' ? event.whiteRating : prev.white.rating,
            } : null,
            black: prev.black ? { 
              ...prev.black, 
              connected: event.blackConnected, 
              name: event.blackName || prev.black.name,
              rating: typeof event.blackRating === 'number' ? event.blackRating : prev.black.rating,
            } : null,
          };
        });
        break;
      }

      case 'draw_offered': {
        setDrawOfferReceived(true);
        break;
      }

      case 'draw_declined': {
        setDrawOfferReceived(false);
        break;
      }

      case 'rematch_offered': {
        setRematchOfferReceived(true);
        break;
      }

      case 'rematch_started': {
        setRoomState(event.state);
        setDrawOfferReceived(false);
        setRematchOfferReceived(false);
        setLastMove(null);
        setLastGameRatingSummary(null);

        serverClockSnapshotRef.current = {
          whiteTimeMs: event.state.whiteTimeMs,
          blackTimeMs: event.state.blackTimeMs,
          lastMoveTimestamp: event.state.lastMoveTimestamp || now,
          serverTime: event.state.serverTime || now,
          turn: event.state.turn,
          isGameActive: event.state.isGameActive,
          gameOver: false,
          clientTimeAtSnapshot: now,
        };

        setWhiteDisplayTimeMs(event.state.whiteTimeMs);
        setBlackDisplayTimeMs(event.state.blackTimeMs);

        try {
          const nextChess = new Chess(event.state.fen);
          setChess(nextChess);
          chessRef.current = nextChess;
        } catch {}

        let nextRole: MultiplayerRole = 'spectator';
        if (event.state.white?.id === myPlayerId) {
          nextRole = 'white';
        } else if (event.state.black?.id === myPlayerId) {
          nextRole = 'black';
        }
        setMyRole(nextRole);
        myRoleRef.current = nextRole;

        sound.playMatchStart();
        break;
      }

      case 'chat_message': {
        setRoomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            chat: [...prev.chat, event.message],
          };
        });
        break;
      }

      case 'error': {
        setErrorMessage(event.message);
        break;
      }
    }
  };

  // Authoritative server-clock synchronization ticker: updates display times without clock drift
  useEffect(() => {
    if (!roomState?.isGameActive || roomState.gameOver) return;
    if (roomState.timeControl.initialSeconds <= 0) return; // Unlimited

    const interval = setInterval(() => {
      const snap = serverClockSnapshotRef.current;
      if (!snap.isGameActive || snap.gameOver) {
        setWhiteDisplayTimeMs(snap.whiteTimeMs);
        setBlackDisplayTimeMs(snap.blackTimeMs);
        return;
      }

      const elapsedSinceSnapshot = Math.max(0, Date.now() - snap.clientTimeAtSnapshot);

      if (snap.turn === 'w') {
        setWhiteDisplayTimeMs(Math.max(0, snap.whiteTimeMs - elapsedSinceSnapshot));
        setBlackDisplayTimeMs(snap.blackTimeMs);
      } else {
        setWhiteDisplayTimeMs(snap.whiteTimeMs);
        setBlackDisplayTimeMs(Math.max(0, snap.blackTimeMs - elapsedSinceSnapshot));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [roomState?.isGameActive, roomState?.gameOver, roomState?.timeControl.initialSeconds]);

  // Client commands
  const sendEvent = useCallback((event: ClientMultiplayerEvent) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    } else {
      console.warn('[Multiplayer Client] Cannot send event - WebSocket not connected');
    }
  }, []);

  const joinRoom = useCallback(
    async (roomId: string, playerName: string, preferredColor?: 'w' | 'b' | 'random') => {
      const cleanId = roomId.trim().toUpperCase();
      const token = await getAuthToken();
      const authUid = auth.currentUser?.uid;

      sendEvent({
        type: 'join_room',
        roomId: cleanId,
        playerName: playerName.trim(),
        preferredColor,
        playerId: authUid || myPlayerId,
        authToken: token,
      });
    },
    [sendEvent, myPlayerId, getAuthToken]
  );

  const makeMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): boolean => {
      if (!roomState?.isGameActive || roomState.gameOver) return false;

      const currentTurn = chess.turn();
      const isMyTurn = (currentTurn === 'w' && myRole === 'white') || (currentTurn === 'b' && myRole === 'black');
      if (!isMyTurn) return false;

      try {
        const nextChess = new Chess(chess.fen());
        const res = nextChess.move(move);
        if (!res) return false;

        // Dispatch move command to authoritative server
        sendEvent({
          type: 'move',
          roomId: roomState.roomId,
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
        });
        return true;
      } catch {
        return false;
      }
    },
    [roomState, chess, myRole, sendEvent]
  );

  const resign = useCallback(() => {
    if (!roomState) return;
    sendEvent({ type: 'resign', roomId: roomState.roomId });
  }, [roomState, sendEvent]);

  const offerDraw = useCallback(() => {
    if (!roomState) return;
    sendEvent({ type: 'draw_offer', roomId: roomState.roomId });
  }, [roomState, sendEvent]);

  const acceptDraw = useCallback(() => {
    if (!roomState) return;
    setDrawOfferReceived(false);
    sendEvent({ type: 'draw_accept', roomId: roomState.roomId });
  }, [roomState, sendEvent]);

  const declineDraw = useCallback(() => {
    if (!roomState) return;
    setDrawOfferReceived(false);
    sendEvent({ type: 'draw_decline', roomId: roomState.roomId });
  }, [roomState, sendEvent]);

  const offerRematch = useCallback(() => {
    if (!roomState) return;
    sendEvent({ type: 'rematch_offer', roomId: roomState.roomId });
  }, [roomState, sendEvent]);

  const acceptRematch = useCallback(() => {
    if (!roomState) return;
    setRematchOfferReceived(false);
    sendEvent({ type: 'rematch_accept', roomId: roomState.roomId });
  }, [roomState, sendEvent]);

  const sendChat = useCallback(
    (text: string) => {
      if (!roomState) return;
      sendEvent({ type: 'chat', roomId: roomState.roomId, text });
    },
    [roomState, sendEvent]
  );

  const leaveRoom = useCallback(() => {
    setRoomState(null);
    setLastMove(null);
    setLastGameRatingSummary(null);
    setChess(new Chess());
  }, []);

  const clearLastGameRatingSummary = useCallback(() => {
    setLastGameRatingSummary(null);
  }, []);

  return {
    connected,
    roomState,
    myRole,
    myPlayerId,
    chess,
    lastMove,
    drawOfferReceived,
    rematchOfferReceived,
    errorMessage,
    lastGameRatingSummary,
    clearLastGameRatingSummary,
    whiteDisplayTimeMs,
    blackDisplayTimeMs,
    joinRoom,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    acceptRematch,
    sendChat,
    leaveRoom,
  };
}
