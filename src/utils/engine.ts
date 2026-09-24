import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { BotProfile, AnalyzedMove, MoveClassification } from '../types/chess';
import { detectOpening } from './openings';

// Piece values in centipawns
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (Midgame)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDGAME_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -20000 : 20000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const board = chess.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const pieceVal = PIECE_VALUES[piece.type];
      const sqIdx = r * 8 + c;
      const flippedIdx = (7 - r) * 8 + c;

      let positionalScore = 0;
      if (piece.type === 'p') {
        positionalScore = piece.color === 'w' ? PAWN_PST[sqIdx] : PAWN_PST[flippedIdx];
      } else if (piece.type === 'n') {
        positionalScore = piece.color === 'w' ? KNIGHT_PST[sqIdx] : KNIGHT_PST[flippedIdx];
      } else if (piece.type === 'b') {
        positionalScore = piece.color === 'w' ? BISHOP_PST[sqIdx] : BISHOP_PST[flippedIdx];
      } else if (piece.type === 'r') {
        positionalScore = piece.color === 'w' ? ROOK_PST[sqIdx] : ROOK_PST[flippedIdx];
      } else if (piece.type === 'q') {
        positionalScore = piece.color === 'w' ? QUEEN_PST[sqIdx] : QUEEN_PST[flippedIdx];
      } else if (piece.type === 'k') {
        positionalScore = piece.color === 'w' ? KING_MIDGAME_PST[sqIdx] : KING_MIDGAME_PST[flippedIdx];
      }

      const totalPieceVal = pieceVal + positionalScore;
      if (piece.color === 'w') {
        score += totalPieceVal;
      } else {
        score -= totalPieceVal;
      }
    }
  }

  // Factor in mobility (number of legal moves)
  const mobility = chess.moves().length;
  if (chess.turn() === 'w') {
    score += mobility * 5;
  } else {
    score -= mobility * 5;
  }

  return score; // Positive is white advantage in centipawns
}

function quiescence(chess: Chess, alpha: number, beta: number, depth: number = 0): number {
  const standPat = evaluateBoard(chess) * (chess.turn() === 'w' ? 1 : -1);
  if (depth > 4) return standPat;

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const captureMoves = chess.moves({ verbose: true }).filter(m => m.captured);
  for (const move of captureMoves) {
    chess.move(move);
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
      chess.move(move);
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
      chess.move(move);
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
 * Calculates the best move for a bot based on personality and Elo settings
 */
export function getBotMove(chess: Chess, bot: BotProfile): Move | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // Bot personality quirks:
  // Nelson: Loves queen moves and early aggressive checks
  if (bot.personality === 'queen_rush' && Math.random() < 0.6) {
    const queenMoves = legalMoves.filter(m => m.piece === 'q');
    if (queenMoves.length > 0) {
      return queenMoves[Math.floor(Math.random() * queenMoves.length)];
    }
  }

  // Blunder rate check
  if (Math.random() < bot.blunderRate) {
    // Pick a random legal move or capture
    const nonBestMoves = legalMoves.length > 1 ? legalMoves : legalMoves;
    return nonBestMoves[Math.floor(Math.random() * nonBestMoves.length)];
  }

  const isWhite = chess.turn() === 'w';
  const depth = Math.min(bot.depth, 3); // Keep within fast response bounds
  const result = minimax(chess, depth, -Infinity, Infinity, isWhite);

  return result.bestMove || legalMoves[0];
}

/**
 * Converts centipawns to winning percentage (0 - 100)
 */
export function centipawnsToWinProb(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
}

/**
 * Analyzes an entire game and calculates move classifications and accuracy
 */
export function analyzeGame(historyMoves: { from: string; to: string; promotion?: string }[]): {
  analyzedMoves: AnalyzedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteBlunders: number;
  blackBlunders: number;
  whiteBrilliants: number;
  blackBrilliants: number;
} {
  const sim = new Chess();
  const analyzed: AnalyzedMove[] = [];

  let whiteAccSum = 0;
  let whiteMoveCount = 0;
  let blackAccSum = 0;
  let blackMoveCount = 0;

  let whiteBlunders = 0;
  let blackBlunders = 0;
  let whiteBrilliants = 0;
  let blackBrilliants = 0;

  for (let i = 0; i < historyMoves.length; i++) {
    const m = historyMoves[i];
    const turn = sim.turn(); // Turn BEFORE move
    const evalBefore = evaluateBoard(sim);

    // Calculate best move before player moved
    const bestMoveResult = minimax(sim, 2, -Infinity, Infinity, turn === 'w');
    const bestMoveSan = bestMoveResult.bestMove?.san || '';

    // Execute player move
    const moveResult = sim.move(m);
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
      classification = 'excellent';
      commentary = 'A strong, accurate move maintaining positional balance.';
    } else if (evalDelta >= -60) {
      classification = 'good';
      commentary = 'A solid practical choice.';
    } else if (evalDelta >= -150) {
      classification = 'inaccuracy';
      commentary = `Slight inaccuracy. ${bestMoveSan ? `Consider ${bestMoveSan} instead.` : ''}`;
    } else if (evalDelta >= -300) {
      classification = 'mistake';
      commentary = `A notable mistake losing tactical initiative. Best was ${bestMoveSan}.`;
    } else {
      classification = 'blunder';
      commentary = `A critical blunder that swings the evaluation! Better was ${bestMoveSan}.`;
      if (turn === 'w') whiteBlunders++; else blackBlunders++;
    }

    // Accuracy formula: 100 * exp(-0.003 * |loss in CP|)
    const cpLoss = Math.max(0, -evalDelta);
    const accuracyForMove = Math.min(100, Math.max(0, 100 * Math.exp(-0.0025 * cpLoss)));

    if (turn === 'w') {
      whiteAccSum += accuracyForMove;
      whiteMoveCount++;
    } else {
      blackAccSum += accuracyForMove;
      blackMoveCount++;
    }

    analyzed.push({
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece as any,
      color: moveResult.color as any,
      captured: moveResult.captured as any,
      promotion: moveResult.promotion as any,
      fen: sim.fen(),
      eval: evalAfter / 100, // in pawns e.g. +1.4
      bestMoveSan,
      classification,
      commentary,
    });
  }

  const whiteAccuracy = whiteMoveCount > 0 ? +(whiteAccSum / whiteMoveCount).toFixed(1) : 100;
  const blackAccuracy = blackMoveCount > 0 ? +(blackAccSum / blackMoveCount).toFixed(1) : 100;

  return {
    analyzedMoves: analyzed,
    whiteAccuracy,
    blackAccuracy,
    whiteBlunders,
    blackBlunders,
    whiteBrilliants,
    blackBrilliants
  };
}
