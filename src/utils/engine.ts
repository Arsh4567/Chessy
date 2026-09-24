import { Chess, Move } from 'chess.js';
import { BotProfile, MoveClassification, AnalyzedGame, AnalyzedMove, PieceType } from '../types/chess';
import { stockfish } from './stockfishWorker';

// Standard piece valuation
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional bonuses (Piece-Square Tables simplified)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

/**
 * Fast static evaluation in centipawns
 * Positive = White advantage, Negative = Black advantage
 */
export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -20000 : 20000;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let evaluation = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] || 0;
      let posVal = 0;
      const squareIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

      if (piece.type === 'p') posVal = PAWN_TABLE[squareIdx];
      else if (piece.type === 'n') posVal = KNIGHT_TABLE[squareIdx];
      else if (piece.type === 'b') posVal = BISHOP_TABLE[squareIdx];

      const pieceTotal = baseVal + posVal;
      if (piece.color === 'w') {
        evaluation += pieceTotal;
      } else {
        evaluation -= pieceTotal;
      }
    }
  }

  // Mobility bonus (number of legal moves)
  const mobility = chess.moves().length;
  evaluation += (chess.turn() === 'w' ? 1 : -1) * mobility * 5;

  return evaluation;
}

/**
 * Quiescence search to avoid the horizon effect
 */
function quiescence(chess: Chess, alpha: number, beta: number, depth: number): number {
  const standPat = (chess.turn() === 'w' ? 1 : -1) * evaluateBoard(chess);
  if (depth > 4) return standPat;

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const captureMoves = chess.moves({ verbose: true }).filter(m => m.captured);
  for (const move of captureMoves) {
    try {
      chess.move(move);
    } catch {
      continue;
    }
    const score = -quiescence(chess, -beta, -alpha, depth + 1);
    chess.undo();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

export function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; bestMove?: Move } {
  if (depth === 0 || chess.isGameOver()) {
    return { score: evaluateBoard(chess) };
  }

  const moves = chess.moves({ verbose: true });
  // Move ordering: sort captures and checks first
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;
    return scoreB - scoreA;
  });

  let bestMove: Move | undefined = moves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      try {
        chess.move(move);
      } catch {
        continue;
      }
      const evalResult = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();

      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break; // Beta cut-off
    }
    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      try {
        chess.move(move);
      } catch {
        continue;
      }
      const evalResult = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();

      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break; // Alpha cut-off
    }
    return { score: minEval, bestMove };
  }
}

/**
 * Calculates bot move based on persona profile and depth
 */
export function getBotMove(chess: Chess, bot: BotProfile): Move | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // Intentional inaccuracy / blunder rate based on Elo
  const shouldBlunder = Math.random() < bot.blunderRate;
  if (shouldBlunder && legalMoves.length > 1) {
    // Pick random move among legal moves
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // Calculate move using minimax
  const depth = bot.depth || 2;
  const isWhite = chess.turn() === 'w';
  const result = minimax(chess, depth, -Infinity, Infinity, isWhite);

  return result.bestMove || legalMoves[0];
}

/**
 * Gets real Stockfish move using WebAssembly worker, with graceful fallback
 * Default 8000ms gives Stockfish 7-10 seconds to analyze and find the best move
 */
export async function getStockfishMoveAsync(
  chess: Chess,
  bot: BotProfile,
  moveTimeMs: number = 8000
): Promise<{ from: string; to: string; promotion?: string }> {
  try {
    // Map bot elo (450 to 2800) to Stockfish skill level (0 to 20)
    const skillLevel = Math.max(0, Math.min(20, Math.round(((bot.elo - 400) / 2400) * 20)));
    const depth = 26; // deep search limit to allow 7-10s calculation

    const sfMove = await stockfish.getBestMove(chess.fen(), skillLevel, depth, moveTimeMs);
    if (sfMove && sfMove.from && sfMove.to) {
      // Validate with chess.js against current game state
      const test = new Chess(chess.fen());
      try {
        const valid = test.move({ from: sfMove.from, to: sfMove.to, promotion: sfMove.promotion });
        if (valid) {
          return { from: sfMove.from, to: sfMove.to, promotion: sfMove.promotion };
        }
      } catch (err) {
        console.warn('Stockfish move was invalid on current fen:', sfMove, err);
      }
    }
  } catch (e) {
    console.warn('Stockfish engine error, fallback to minimax:', e);
  }

  // Fallback to local minimax bot engine
  const fallback = getBotMove(chess, bot);
  if (fallback) {
    return { from: fallback.from, to: fallback.to, promotion: fallback.promotion };
  }
  const legal = chess.moves({ verbose: true });
  return legal.length > 0
    ? { from: legal[0].from, to: legal[0].to, promotion: legal[0].promotion }
    : { from: '', to: '' };
}

/**
 * Converts centipawns to winning percentage (0 - 100)
 */
export function centipawnsToWinProb(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
}

/**
 * Full game analysis algorithm
 */
export function analyzeMatch(
  historyMoves: { from: string; to: string; promotion?: string }[],
  initialPgn?: string
): AnalyzedGame {
  const sim = new Chess();
  if (initialPgn) {
    try {
      sim.loadPgn(initialPgn);
    } catch {}
  }

  const analyzedMoves: AnalyzedMove[] = [];
  let whiteAccuracySum = 0;
  let blackAccuracySum = 0;
  let whiteMovesCount = 0;
  let blackMovesCount = 0;

  let whiteBrilliants = 0;
  let blackBrilliants = 0;
  let whiteBlunders = 0;
  let blackBlunders = 0;

  // Reset to start of moves
  sim.reset();

  for (let i = 0; i < historyMoves.length; i++) {
    const m = historyMoves[i];
    const turn = sim.turn(); // Turn BEFORE move
    const evalBefore = evaluateBoard(sim);

    // Calculate best move before player moved
    const bestMoveResult = minimax(sim, 2, -Infinity, Infinity, turn === 'w');
    const bestMoveSan = bestMoveResult.bestMove?.san || '';

    // Execute player move safely
    let moveResult: Move | null = null;
    try {
      moveResult = sim.move(m);
    } catch {
      break;
    }
    if (!moveResult) break;

    const evalAfter = evaluateBoard(sim);
    const evalDelta = turn === 'w' ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

    // Determine move classification
    let classification: MoveClassification = 'good';
    let commentary = '';

    const isSacrifice = moveResult.captured === undefined &&
      (moveResult.piece === 'q' || moveResult.piece === 'r' || moveResult.piece === 'b' || moveResult.piece === 'n') &&
      evalDelta >= 0;

    if (isSacrifice && evalDelta > 50) {
      classification = 'brilliant';
      commentary = 'A brilliant tactical sacrifice that unleashes a decisive advantage!';
      if (turn === 'w') whiteBrilliants++; else blackBrilliants++;
    } else if (bestMoveSan === moveResult.san) {
      classification = 'best';
      commentary = 'The best engine move in the position.';
    } else if (evalDelta >= -20) {
      classification = 'good';
      commentary = 'A solid, active move maintaining the position.';
    } else if (evalDelta >= -80) {
      classification = 'inaccuracy';
      commentary = `Slight inaccuracy. Better was ${bestMoveSan}.`;
    } else if (evalDelta >= -200) {
      classification = 'mistake';
      commentary = `Mistake that conceded the initiative. Recommended: ${bestMoveSan}.`;
    } else {
      classification = 'blunder';
      commentary = `Severe blunder! Overlooked tactical reply. Best was ${bestMoveSan}.`;
      if (turn === 'w') whiteBlunders++; else blackBlunders++;
    }

    // Move accuracy calculation
    const moveAcc = Math.max(0, Math.min(100, 100 + evalDelta / 2));
    if (turn === 'w') {
      whiteAccuracySum += moveAcc;
      whiteMovesCount++;
    } else {
      blackAccuracySum += moveAcc;
      blackMovesCount++;
    }

    analyzedMoves.push({
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece as PieceType,
      color: moveResult.color as 'w' | 'b',
      captured: moveResult.captured as PieceType | undefined,
      promotion: moveResult.promotion as PieceType | undefined,
      fen: sim.fen(),
      eval: +(evalAfter / 100).toFixed(2),
      bestMoveSan,
      classification,
      commentary,
    });
  }

  const whiteAccuracy = whiteMovesCount > 0 ? +(whiteAccuracySum / whiteMovesCount).toFixed(1) : 85.0;
  const blackAccuracy = blackMovesCount > 0 ? +(blackAccuracySum / blackMovesCount).toFixed(1) : 85.0;

  return {
    whiteAccuracy,
    blackAccuracy,
    analyzedMoves,
    whiteBrilliants,
    blackBrilliants,
    whiteBlunders,
    blackBlunders,
  };
}

export const analyzeGame = analyzeMatch;

