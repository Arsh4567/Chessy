import { BotProfile, TimeControl } from '../types/chess';

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
    description: 'A cheerful beginner learning piece values and fundamentals.',
    personality: 'novice',
    depth: 1,
    blunderRate: 0.45,
    favoriteOpening: 'Italian Game',
    tagline: 'Let’s have a fun and casual game!'
  },
  {
    id: 'bot-nelson',
    name: 'Nelson',
    elo: 1350,
    avatarBg: 'bg-rose-950/70 border-rose-500/30 text-rose-400',
    avatarIcon: '👑',
    description: 'Aggressive player who brings the Queen out early for fast king attacks.',
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
    description: 'Attacking style with deep pawn storms and active tactical piece coordination.',
    personality: 'aggressive',
    depth: 3,
    blunderRate: 0.05,
    favoriteOpening: "Queen's Gambit",
    tagline: 'Every position holds tactical beauty.'
  },
  {
    id: 'bot-elena',
    name: 'Elena',
    elo: 2050,
    title: 'IM',
    avatarBg: 'bg-sky-950/70 border-sky-500/30 text-sky-400',
    avatarIcon: '⚡',
    description: 'International Master with strong endgame conversion and opening knowledge.',
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
    description: 'Grandmaster engine with deep Stockfish search and tactical precision.',
    personality: 'grandmaster',
    depth: 4,
    blunderRate: 0.0,
    favoriteOpening: 'Ruy Lopez: Berlin Defense',
    tagline: 'Stockfish calculation at high depth.'
  }
];
