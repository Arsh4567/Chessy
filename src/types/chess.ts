export type GameMode =
  | 'bot'
  | 'pvp-local'
  | 'online-match'
  | 'online-room'
  | 'analysis'
  | 'puzzle';

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type TimeControlCategory = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'unlimited';

export interface TimeControl {
  id: string;
  name: string;
  category: TimeControlCategory;
  initialSeconds: number;
  incrementSeconds: number;
}

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export interface AnalyzedMove {
  san: string;
  from: string;
  to: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  promotion?: PieceType;
  fen: string;
  eval: number; // centipawns or large number for mate
  bestMoveSan?: string;
  classification?: MoveClassification;
  commentary?: string;
  timeSpentSeconds?: number;
}

export interface BotProfile {
  id: string;
  name: string;
  elo: number;
  title?: string;
  avatarBg: string;
  avatarIcon: string;
  description: string;
  personality: 'novice' | 'aggressive' | 'queen_rush' | 'tactical' | 'master' | 'grandmaster';
  depth: number;
  blunderRate: number; // 0 to 1
  favoriteOpening: string;
  tagline: string;
}

export interface PlayerProfile {
  id: string;
  username: string;
  title?: string;
  avatar: string;
  country: string;
  ratingBullet: number;
  ratingBlitz: number;
  ratingRapid: number;
  ratingClassical: number;
  ratingPuzzle: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  totalGames: number;
  avgAccuracy: number;
}

export interface ChatMessage {
  id: string;
  sender: 'player' | 'opponent' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  isEmote?: boolean;
}

export interface Friend {
  id: string;
  username: string;
  title?: string;
  avatar: string;
  country: string;
  elo: number;
  status: 'online' | 'in-game' | 'offline';
  lastSeen?: string;
  winRecordAgainst: { wins: number; losses: number; draws: number };
}

export interface Tournament {
  id: string;
  title: string;
  type: 'Arena' | 'Swiss' | 'Knockout';
  timeControl: string;
  status: 'upcoming' | 'active' | 'completed';
  startTime: string;
  durationMinutes: number;
  participantsCount: number;
  maxParticipants: number;
  prizePool: string;
  leaderboard: {
    rank: number;
    username: string;
    avatar: string;
    elo: number;
    points: number;
    gamesPlayed: number;
    performance: number;
  }[];
}

export interface FeedPost {
  id: string;
  author: {
    name: string;
    avatar: string;
    elo: number;
    title?: string;
  };
  title: string;
  description: string;
  pgn: string;
  fen: string;
  result: string;
  likes: number;
  commentsCount: number;
  timestamp: string;
  highlightMove: string;
  tags: string[];
}

export interface ChessPuzzle {
  id: string;
  fen: string;
  moves: string[]; // sequence of UCI or SAN moves: [opponentMove, userMove, opponentMove2, userMove2]
  rating: number;
  theme: string;
  description: string;
  playerColor: PieceColor;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'challenge' | 'move_alert' | 'tournament' | 'social';
  timestamp: string;
  read: boolean;
  data?: any;
}
