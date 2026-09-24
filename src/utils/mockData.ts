import { BotProfile, Friend, Tournament, FeedPost, PlayerProfile, TimeControl } from '../types/chess';

export const TIME_CONTROLS: TimeControl[] = [
  { id: '1-0', name: '1 min', category: 'bullet', initialSeconds: 60, incrementSeconds: 0 },
  { id: '2-1', name: '2 | 1', category: 'bullet', initialSeconds: 120, incrementSeconds: 1 },
  { id: '3-0', name: '3 min', category: 'blitz', initialSeconds: 180, incrementSeconds: 0 },
  { id: '3-2', name: '3 | 2', category: 'blitz', initialSeconds: 180, incrementSeconds: 2 },
  { id: '5-0', name: '5 min', category: 'rapid', initialSeconds: 300, incrementSeconds: 0 },
  { id: '10-0', name: '10 min', category: 'rapid', initialSeconds: 600, incrementSeconds: 0 },
  { id: '15-10', name: '15 | 10', category: 'rapid', initialSeconds: 900, incrementSeconds: 10 },
  { id: 'unlimited', name: 'Unlimited', category: 'unlimited', initialSeconds: 3600, incrementSeconds: 0 },
];

export const INITIAL_BOTS: BotProfile[] = [
  {
    id: 'bot-martin',
    name: 'Martin',
    elo: 450,
    avatarBg: 'bg-emerald-950/70 border-emerald-500/30 text-emerald-400',
    avatarIcon: '♟️',
    description: 'A cheerful beginner who is learning piece values and frequently leaves pieces undefended.',
    personality: 'novice',
    depth: 1,
    blunderRate: 0.45,
    favoriteOpening: 'Italian Game',
    tagline: 'Hey there! Let’s have a fun and easy game!'
  },
  {
    id: 'bot-nelson',
    name: 'Nelson',
    elo: 1350,
    avatarBg: 'bg-rose-950/70 border-rose-500/30 text-rose-400',
    avatarIcon: '👑',
    description: 'Infamous for bringing his Queen out on turn 2 (Scholar’s Mate attempt) and relentless early king attacks.',
    personality: 'queen_rush',
    depth: 2,
    blunderRate: 0.12,
    favoriteOpening: 'Wayward Queen Attack',
    tagline: 'Watch out for my Queen! She comes out fast.'
  },
  {
    id: 'bot-beth',
    name: 'Beth',
    elo: 1680,
    title: 'FM',
    avatarBg: 'bg-purple-950/70 border-purple-500/30 text-purple-400',
    avatarIcon: '⚔️',
    description: 'Fierce attacking style with deep pawn storms, intuitive tactics, and aggressive king-side pressure.',
    personality: 'aggressive',
    depth: 3,
    blunderRate: 0.05,
    favoriteOpening: "Queen's Gambit",
    tagline: 'Chess isn’t always competitive. It can be beautiful.'
  },
  {
    id: 'bot-elena',
    name: 'Elena',
    elo: 2050,
    title: 'IM',
    avatarBg: 'bg-sky-950/70 border-sky-500/30 text-sky-400',
    avatarIcon: '⚡',
    description: 'International Master with razor-sharp endgame calculation and solid Sicilian defense masterclasses.',
    personality: 'tactical',
    depth: 3,
    blunderRate: 0.02,
    favoriteOpening: 'Sicilian Defense: Najdorf',
    tagline: 'Every move must serve a strategic master plan.'
  },
  {
    id: 'bot-stockfish-gm',
    name: 'Stockfish GM',
    elo: 2750,
    title: 'GM',
    avatarBg: 'bg-amber-950/70 border-amber-500/30 text-amber-400',
    avatarIcon: '🏆',
    description: 'Super Grandmaster level with near flawless positional mastery, deep alpha-beta search, and zero mercy.',
    personality: 'grandmaster',
    depth: 4,
    blunderRate: 0.0,
    favoriteOpening: 'Ruy Lopez: Berlin Defense',
    tagline: 'The evaluation bar is unyielding. Play with supreme precision.'
  }
];

export const INITIAL_PLAYER_PROFILE: PlayerProfile = {
  id: 'user-me',
  username: 'GrandmasterPlayer',
  title: 'FM',
  avatar: '♚',
  country: 'US',
  ratingBullet: 1580,
  ratingBlitz: 1645,
  ratingRapid: 1720,
  ratingClassical: 1810,
  ratingPuzzle: 1940,
  wins: 142,
  losses: 68,
  draws: 24,
  winStreak: 5,
  totalGames: 234,
  avgAccuracy: 84.8
};

export const INITIAL_FRIENDS: Friend[] = [
  {
    id: 'fr-1',
    username: 'HikaruFan_99',
    title: 'IM',
    avatar: '♛',
    country: 'JP',
    elo: 1740,
    status: 'online',
    lastSeen: 'Now',
    winRecordAgainst: { wins: 4, losses: 3, draws: 1 }
  },
  {
    id: 'fr-2',
    username: 'ScandinavianKnight',
    avatar: '♞',
    country: 'NO',
    elo: 1610,
    status: 'in-game',
    lastSeen: 'In Rapid Match',
    winRecordAgainst: { wins: 6, losses: 2, draws: 0 }
  },
  {
    id: 'fr-3',
    username: 'QueenSacrifice',
    title: 'FM',
    avatar: '♝',
    country: 'DE',
    elo: 1890,
    status: 'online',
    lastSeen: 'Now',
    winRecordAgainst: { wins: 2, losses: 5, draws: 2 }
  },
  {
    id: 'fr-4',
    username: 'RookEndgameGuru',
    avatar: '♜',
    country: 'CA',
    elo: 1530,
    status: 'offline',
    lastSeen: '2 hours ago',
    winRecordAgainst: { wins: 5, losses: 1, draws: 1 }
  }
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tour-1',
    title: 'Sunday Super Blitz Arena',
    type: 'Arena',
    timeControl: '3 | 0 Blitz',
    status: 'active',
    startTime: 'Live Now',
    durationMinutes: 50,
    participantsCount: 148,
    maxParticipants: 250,
    prizePool: '1,500 Arena Points',
    leaderboard: [
      { rank: 1, username: 'Vishy_Tactics', avatar: '♚', elo: 2120, points: 28, gamesPlayed: 11, performance: 2280 },
      { rank: 2, username: 'GrandmasterPlayer', avatar: '♔', elo: 1645, points: 22, gamesPlayed: 9, performance: 1860 },
      { rank: 3, username: 'CaroKannKing', avatar: '♞', elo: 1790, points: 19, gamesPlayed: 8, performance: 1820 },
      { rank: 4, username: 'BerlinWall_9', avatar: '♜', elo: 1680, points: 16, gamesPlayed: 7, performance: 1710 },
      { rank: 5, username: 'CheckmateArtist', avatar: '♝', elo: 1590, points: 14, gamesPlayed: 8, performance: 1630 },
    ]
  },
  {
    id: 'tour-2',
    title: 'Rapid Masters Swiss Cup',
    type: 'Swiss',
    timeControl: '10 | 0 Rapid',
    status: 'upcoming',
    startTime: 'In 35 mins',
    durationMinutes: 90,
    participantsCount: 64,
    maxParticipants: 128,
    prizePool: '3,000 Arena Points + Trophy Badge',
    leaderboard: [
      { rank: 1, username: 'MagnusVibe', avatar: '♚', elo: 2310, points: 0, gamesPlayed: 0, performance: 2310 },
      { rank: 2, username: 'GrandmasterPlayer', avatar: '♔', elo: 1720, points: 0, gamesPlayed: 0, performance: 1720 },
      { rank: 3, username: 'TacticStorm', avatar: '♛', elo: 1840, points: 0, gamesPlayed: 0, performance: 1840 },
    ]
  },
  {
    id: 'tour-3',
    title: 'Bullet Frenzy 1+0 Knockout',
    type: 'Knockout',
    timeControl: '1 | 0 Bullet',
    status: 'completed',
    startTime: 'Yesterday',
    durationMinutes: 40,
    participantsCount: 32,
    maxParticipants: 32,
    prizePool: '1,000 Arena Points',
    leaderboard: [
      { rank: 1, username: 'SpeedDemonGM', avatar: '♚', elo: 2190, points: 36, gamesPlayed: 14, performance: 2340 },
      { rank: 2, username: 'UltraBullet_X', avatar: '♞', elo: 1980, points: 28, gamesPlayed: 13, performance: 2050 },
      { rank: 3, username: 'PawnPusher', avatar: '♟️', elo: 1710, points: 20, gamesPlayed: 10, performance: 1780 },
    ]
  }
];

export const INITIAL_FEED: FeedPost[] = [
  {
    id: 'post-1',
    author: {
      name: 'GrandmasterPlayer',
      avatar: '♚',
      elo: 1645,
      title: 'FM'
    },
    title: 'Unreal Queen Sacrifice leading to Mate in 3! 💎',
    description: 'Found this aesthetic double piece sacrifice against a 1750 rated opponent in the Italian Game. Stockfish classified move 18.Qxf7+ as Brilliant!',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 12. Bg5 Bxg5 13. Nxg5 h6 14. Qe2 hxg5 15. Re1 Be6 16. dxe6 f6 17. Re3 c6 18. Qxf7+ Kxf7 19. Bxe6+ Kg6 20. Bf7#',
    fen: 'r2q3r/pp2nBp1/2pp1pk1/6p1/8/4R3/PP3PPP/4R1K1 b - - 1 20',
    result: '1-0 · Checkmate',
    likes: 48,
    commentsCount: 12,
    timestamp: '2 hours ago',
    highlightMove: '18. Qxf7+ !!',
    tags: ['Brilliancy', 'ItalianGame', 'QueenSac']
  },
  {
    id: 'post-2',
    author: {
      name: 'QueenSacrifice',
      avatar: '♛',
      elo: 1890,
      title: 'FM'
    },
    title: 'Endgame Mastery: Converting a 3 vs 2 Rook Endgame ♜',
    description: 'Classic Lucena position demonstration in the Sunday Swiss Cup. Remember: build the bridge on the 4th rank!',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6',
    fen: '8/5k2/5P2/4K3/8/8/1r6/5R2 w - - 0 54',
    result: '1-0 · Resignation',
    likes: 35,
    commentsCount: 8,
    timestamp: '5 hours ago',
    highlightMove: '48. Rf4 !',
    tags: ['Endgame', 'RookEndgame', 'Lucena']
  },
  {
    id: 'post-3',
    author: {
      name: 'HikaruFan_99',
      avatar: '♝',
      elo: 1740,
      title: 'IM'
    },
    title: 'Botez Gambit turned into a miraculous stalemate save! 🤯',
    description: 'Lost my queen on move 12 due to a mouse-slip, but swindled a king corner stalemate trap with 0.8 seconds on the clock in 1|0 Bullet!',
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O',
    fen: '7k/8/8/8/8/8/5q2/7K w - - 0 68',
    result: '½-½ · Stalemate',
    likes: 82,
    commentsCount: 26,
    timestamp: '1 day ago',
    highlightMove: '68. Kh1 =',
    tags: ['Bullet', 'Swindle', 'Stalemate']
  }
];
