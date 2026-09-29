import { Chess } from 'chess.js';
import { detectOpening, OpeningInfo } from './openings';
import { SavedGame, MultiplayerMatchRecord } from './storage';

export interface OpeningStat {
  name: string;
  eco: string;
  moves: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0 - 100 percentage
  whiteGames: number;
  whiteWins: number;
  whiteLosses: number;
  whiteDraws: number;
  whiteWinRate: number;
  blackGames: number;
  blackWins: number;
  blackLosses: number;
  blackDraws: number;
  blackWinRate: number;
  avgMoves: number;
}

export interface OpeningsAnalysisSummary {
  openings: OpeningStat[];
  totalGamesAnalyzed: number;
  favoriteOpening: OpeningStat | null;
  bestOpening: OpeningStat | null;
  overallWhiteWinRate: number;
  overallBlackWinRate: number;
  distinctOpeningsCount: number;
}

export interface GenericMatchRecord {
  id: string;
  pgn?: string;
  result: 'win' | 'loss' | 'draw';
  playerColor?: 'w' | 'b';
  opponentName?: string;
  movesCount?: number;
  date?: string;
  createdAt?: string;
  isMultiplayer?: boolean;
}

/**
 * Extracts moves and determines the opening from a PGN string.
 */
export function extractOpeningFromPgn(pgn?: string): { name: string; eco: string; moves: string; movesSan: string[] } {
  if (!pgn || !pgn.trim()) {
    return { name: "Open Game", eco: "C20", moves: "1. e4 e5", movesSan: [] };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history();

    if (history.length > 0) {
      const match = detectOpening(history);
      if (match && match.name && match.name !== 'Starting Position') {
        return {
          name: match.name,
          eco: match.eco || 'A00',
          moves: match.moves || history.slice(0, 4).join(' '),
          movesSan: history,
        };
      }

      // Check first move heuristics if no deep match
      const firstMove = history[0];
      if (firstMove === 'e4') {
        const secondMove = history[1];
        if (secondMove === 'c5') return { name: 'Sicilian Defense', eco: 'B20', moves: 'e4 c5', movesSan: history };
        if (secondMove === 'e5') return { name: "King's Pawn Game", eco: 'C20', moves: 'e4 e5', movesSan: history };
        if (secondMove === 'e6') return { name: 'French Defense', eco: 'C00', moves: 'e4 e6', movesSan: history };
        if (secondMove === 'c6') return { name: 'Caro-Kann Defense', eco: 'B10', moves: 'e4 c6', movesSan: history };
        if (secondMove === 'd5') return { name: 'Scandinavian Defense', eco: 'B01', moves: 'e4 d5', movesSan: history };
        return { name: "King's Pawn Opening", eco: 'B00', moves: 'e4', movesSan: history };
      }
      if (firstMove === 'd4') {
        const secondMove = history[1];
        if (secondMove === 'd5') return { name: "Queen's Pawn Game", eco: 'D00', moves: 'd4 d5', movesSan: history };
        if (secondMove === 'Nf6') return { name: 'Indian Defense', eco: 'A45', moves: 'd4 Nf6', movesSan: history };
        return { name: "Queen's Pawn Opening", eco: 'A40', moves: 'd4', movesSan: history };
      }
      if (firstMove === 'c4') return { name: 'English Opening', eco: 'A10', moves: 'c4', movesSan: history };
      if (firstMove === 'Nf3') return { name: 'Réti Opening', eco: 'A04', moves: 'Nf3', movesSan: history };
    }
  } catch {
    // If PGN parsing fails, fallback safely
  }

  return { name: 'Modern Opening', eco: 'A00', moves: '', movesSan: [] };
}

/**
 * Computes deep opening performance metrics across all available matches.
 */
export function computeOpeningAnalytics(
  multiplayerMatches: MultiplayerMatchRecord[] = [],
  localMatches: SavedGame[] = []
): OpeningsAnalysisSummary {
  // Combine all matches into a unified list
  const combined: GenericMatchRecord[] = [
    ...multiplayerMatches.map((m) => ({
      id: m.id,
      pgn: m.pgn,
      result: m.result,
      playerColor: m.playerColor || 'w',
      opponentName: m.opponentName,
      movesCount: m.movesCount,
      date: m.date || m.createdAt,
      isMultiplayer: true,
    })),
    ...localMatches.map((m) => ({
      id: m.id,
      pgn: m.pgn,
      result: m.result,
      playerColor: 'w' as const, // local games default to player as white
      opponentName: m.opponent,
      movesCount: m.movesCount,
      date: m.date,
      isMultiplayer: false,
    })),
  ];

  const map = new Map<string, {
    name: string;
    eco: string;
    moves: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    whiteGames: number;
    whiteWins: number;
    whiteLosses: number;
    whiteDraws: number;
    blackGames: number;
    blackWins: number;
    blackLosses: number;
    blackDraws: number;
    totalMoves: number;
  }>();

  let totalWhiteGames = 0;
  let totalWhiteWins = 0;
  let totalBlackGames = 0;
  let totalBlackWins = 0;

  for (const match of combined) {
    const opening = extractOpeningFromPgn(match.pgn);
    const key = opening.name;

    if (!map.has(key)) {
      map.set(key, {
        name: opening.name,
        eco: opening.eco,
        moves: opening.moves,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        whiteGames: 0,
        whiteWins: 0,
        whiteLosses: 0,
        whiteDraws: 0,
        blackGames: 0,
        blackWins: 0,
        blackLosses: 0,
        blackDraws: 0,
        totalMoves: 0,
      });
    }

    const entry = map.get(key)!;
    entry.gamesPlayed += 1;
    entry.totalMoves += match.movesCount || 0;

    const isWhite = match.playerColor !== 'b';
    if (isWhite) {
      entry.whiteGames += 1;
      totalWhiteGames += 1;
      if (match.result === 'win') {
        entry.wins += 1;
        entry.whiteWins += 1;
        totalWhiteWins += 1;
      } else if (match.result === 'loss') {
        entry.losses += 1;
        entry.whiteLosses += 1;
      } else {
        entry.draws += 1;
        entry.whiteDraws += 1;
      }
    } else {
      entry.blackGames += 1;
      totalBlackGames += 1;
      if (match.result === 'win') {
        entry.wins += 1;
        entry.blackWins += 1;
        totalBlackWins += 1;
      } else if (match.result === 'loss') {
        entry.losses += 1;
        entry.blackLosses += 1;
      } else {
        entry.draws += 1;
        entry.blackDraws += 1;
      }
    }
  }

  const openingStats: OpeningStat[] = Array.from(map.values()).map((e) => {
    const winRate = e.gamesPlayed > 0 ? Math.round((e.wins / e.gamesPlayed) * 100) : 0;
    const whiteWinRate = e.whiteGames > 0 ? Math.round((e.whiteWins / e.whiteGames) * 100) : 0;
    const blackWinRate = e.blackGames > 0 ? Math.round((e.blackWins / e.blackGames) * 100) : 0;
    const avgMoves = e.gamesPlayed > 0 ? Math.round(e.totalMoves / e.gamesPlayed) : 0;

    return {
      name: e.name,
      eco: e.eco,
      moves: e.moves,
      gamesPlayed: e.gamesPlayed,
      wins: e.wins,
      losses: e.losses,
      draws: e.draws,
      winRate,
      whiteGames: e.whiteGames,
      whiteWins: e.whiteWins,
      whiteLosses: e.whiteLosses,
      whiteDraws: e.whiteDraws,
      whiteWinRate,
      blackGames: e.blackGames,
      blackWins: e.blackWins,
      blackLosses: e.blackLosses,
      blackDraws: e.blackDraws,
      blackWinRate,
      avgMoves,
    };
  });

  // Sort by games played descending by default
  openingStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  // Identify favorite opening (most played)
  const favoriteOpening = openingStats.length > 0 ? openingStats[0] : null;

  // Identify best opening (highest win rate with at least 2 games, or highest if only 1 game)
  let bestOpening: OpeningStat | null = null;
  const qualifiedOpenings = openingStats.filter((o) => o.gamesPlayed >= 2);
  if (qualifiedOpenings.length > 0) {
    bestOpening = [...qualifiedOpenings].sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed)[0];
  } else if (openingStats.length > 0) {
    bestOpening = [...openingStats].sort((a, b) => b.winRate - a.winRate)[0];
  }

  const overallWhiteWinRate = totalWhiteGames > 0 ? Math.round((totalWhiteWins / totalWhiteGames) * 100) : 0;
  const overallBlackWinRate = totalBlackGames > 0 ? Math.round((totalBlackWins / totalBlackGames) * 100) : 0;

  return {
    openings: openingStats,
    totalGamesAnalyzed: combined.length,
    favoriteOpening,
    bestOpening,
    overallWhiteWinRate,
    overallBlackWinRate,
    distinctOpeningsCount: openingStats.length,
  };
}
