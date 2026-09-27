export type MultiplayerRole = 'white' | 'black' | 'spectator';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  connected: boolean;
  color: 'w' | 'b';
  rating: number;
  gamesPlayed: number;
  ratingDelta?: number;
}

export interface MultiplayerTimeControl {
  initialSeconds: number;
  incrementSeconds: number;
  name: string;
}

export interface MultiplayerChatMessage {
  id: string;
  sender: string;
  senderColor?: 'w' | 'b' | 'spectator';
  text: string;
  timestamp: number;
}

export interface MultiplayerGameOver {
  winner?: 'w' | 'b' | 'draw';
  reason: string;
  whiteRating?: number;
  whiteRatingDelta?: number;
  blackRating?: number;
  blackRatingDelta?: number;
  whiteIsProvisional?: boolean;
  blackIsProvisional?: boolean;
  whiteMatchesPlayed?: number;
  blackMatchesPlayed?: number;
}

export interface MultiplayerRoomState {
  roomId: string;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  white: MultiplayerPlayer | null;
  black: MultiplayerPlayer | null;
  spectatorsCount: number;
  whiteTimeMs: number;
  blackTimeMs: number;
  timeControl: MultiplayerTimeControl;
  isGameActive: boolean;
  gameOver: MultiplayerGameOver | null;
  history: string[];
  drawOfferedBy: 'w' | 'b' | null;
  rematchOfferedBy: 'w' | 'b' | null;
  chat: MultiplayerChatMessage[];
  lastMoveTimestamp?: number;
  serverTime?: number;
  isPrivate?: boolean;
  allowedPlayerIds?: string[];
}

export type ClientMultiplayerEvent =
  | { 
      type: 'join_room'; 
      roomId: string; 
      playerName: string; 
      preferredColor?: 'w' | 'b' | 'random'; 
      playerId?: string;
      authToken?: string;
      playerRating?: number;
      gamesPlayed?: number;
      passcode?: string;
      allowedPlayerIds?: string[];
    }
  | { type: 'move'; roomId: string; from: string; to: string; promotion?: string }
  | { type: 'resign'; roomId: string }
  | { type: 'draw_offer'; roomId: string }
  | { type: 'draw_accept'; roomId: string }
  | { type: 'draw_decline'; roomId: string }
  | { type: 'rematch_offer'; roomId: string }
  | { type: 'rematch_accept'; roomId: string }
  | { type: 'chat'; roomId: string; text: string };

export type ServerMultiplayerEvent =
  | { type: 'room_state'; state: MultiplayerRoomState; yourRole: MultiplayerRole; yourId: string; serverTime: number }
  | { 
      type: 'move_made'; 
      from: string; 
      to: string; 
      san: string; 
      fen: string; 
      turn: 'w' | 'b'; 
      whiteTimeMs: number; 
      blackTimeMs: number; 
      isCheck: boolean; 
      isGameOver: boolean; 
      gameOver: MultiplayerGameOver | null;
      lastMoveTimestamp: number;
      serverTime: number;
    }
  | { 
      type: 'clock_sync'; 
      roomId: string; 
      whiteTimeMs: number; 
      blackTimeMs: number; 
      turn: 'w' | 'b'; 
      lastMoveTimestamp: number; 
      serverTime: number; 
      isGameActive: boolean 
    }
  | { type: 'presence'; whiteConnected: boolean; blackConnected: boolean; spectatorsCount: number; whiteName?: string; blackName?: string; whiteRating?: number; blackRating?: number }
  | { type: 'opponent_joined'; player: { name: string; color: 'w' | 'b'; rating: number; gamesPlayed: number } }
  | { type: 'draw_offered'; by: 'w' | 'b' }
  | { type: 'draw_declined' }
  | { type: 'rematch_offered'; by: 'w' | 'b' }
  | { type: 'rematch_started'; state: MultiplayerRoomState }
  | { type: 'chat_message'; message: MultiplayerChatMessage }
  | { type: 'error'; message: string };
