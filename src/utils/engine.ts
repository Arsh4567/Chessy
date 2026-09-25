import { Chess, Move } from 'chess.js';
import { BotProfile, MoveClassification, AnalyzedGame, AnalyzedMove, PieceType } from '../types/chess';
import { stockfish } from './stockfishWorker';
import { classifyEngineMove } from './moveClassification';
import { detectOpening } from './openings';

// Standard piece valuation
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional bonuses (Piece-Square Tables normalized for White / flipped for Black)
const PAWN_TABLE = [
  0,   0,   0,   0,   0,   0,   0,   0,
  50,  50,  50,  50,  50,  50,  50,  50,
  10,  10,  20,  30,  30,  20,  10,  10,
  5,   5,  10,  25,  25,  10,   5,   5,
  0,   0,   0,  20,  20,   0,   0,   0,
  5,  -5, -10,   0,   0, -10,  -5,   5,
  5,  10,  10, -20, -20,  10,  10,   5,
  0,   0,   0,   0,   0,   0,   0,   0
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20,   0,   0,   0,   0, -20, -40,
  -30,   0,  10,  15,  15,  10,   0, -30,
  -30,   5,  15,  20,  20,  15,   5, -30,
  -30,   0,  15,  20,  20,  15,   0, -30,
  -30,   5,  10,  15,  15,  10,   5, -30,
  -40, -20,   0,   5,   5,   0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10,   0,   0,   0,   0,   0,   0, -10,
  -10,   0,   5,  10,  10,   5,   0, -10,
  -10,   5,   5,  10,  10,   5,   5, -10,
  -10,   0,  10,  10,  10,  10,   0, -10,
  -10,  10,  10,  10,  10,  10,  10, -10,
  -10,   5,   0,   0,   0,   0,   5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0,   0,   0,   0,   0,   0,   0,   0,
  5,  10,  10,  10,  10,  10,  10,   5,
 -5,   0,   0,   0,   0,   0,   0,  -5,
 -5,   0,   0,   0,   0,   0,   0,  -5,
 -5,   0,   0,   0,   0,   0,   0,  -5,
 -5,   0,   0,   0,   0,   0,   0,  -5,
 -5,   0,   0,   0,   0,   0,   0,  -5,
  0,   0,   0,   5,   5,   0,   0,   0
];

const KING_MIDDLE_TABLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
   20,  20,   0,   0,   0,   0,  20,  20,
   20,  30,  10,   0,   0,  10,  30,  20
];

/**
 * Fast static evaluation in centipawns
 * Symmetrical and turn-invariant: Positive = White advantage, Negative = Black advantage
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

      if (piece.type === 'p') posVal = PAWN_TABLE[squareIdx] || 0;
      else if (piece.type === 'n') posVal = KNIGHT_TABLE[squareIdx] || 0;
      else if (piece.type === 'b') posVal = BISHOP_TABLE[squareIdx] || 0;
      else if (piece.type === 'r') posVal = ROOK_TABLE[squareIdx] || 0;
      else if (piece.type === 'k') posVal = KING_MIDDLE_TABLE[squareIdx] || 0;

      const pieceTotal = baseVal + posVal;
      if (piece.color === 'w') {
        evaluation += pieceTotal;
      } else {
        evaluation -= pieceTotal;
      }
    }
  }

  return evaluation;
}

/**
 * Quiescence search to avoid the horizon effect
 */
function quiescence(chess: Chess, alpha: number, beta: number, depth: number): number {
  const isWhite = chess.turn() === 'w';
  const standPat = isWhite ? evaluateBoard(chess) : -evaluateBoard(chess);
  if (depth > 3) return standPat;

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const captureMoves = chess.moves({ verbose: true }).filter((m) => m.captured);
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

/**
 * Minimax search with alpha-beta pruning and move ordering
 */
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
  if (moves.length === 0) {
    return { score: evaluateBoard(chess) };
  }

  // Move ordering: sort captures and promotions first
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0);
    if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0);
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
    // Pick random non-optimal move among legal moves
    const sortedMoves = [...legalMoves].sort(() => Math.random() - 0.5);
    return sortedMoves[0];
  }

  // Calculate move using minimax
  const isWhite = chess.turn() === 'w';
  const depth = Math.max(1, Math.min(bot.depth, 3));
  const result = minimax(chess, depth, -Infinity, Infinity, isWhite);
  return result.bestMove || legalMoves[0];
}

/**
 * High-performance bot move dispatcher
 */
export async function getBestMoveAsync(
  chess: Chess,
  bot: BotProfile
): Promise<{ from: string; to: string; promotion?: string }> {
  try {
    const tuning = getStockfishTuningForBot(bot);
    const moveTime = 350;

    const sfMove = await stockfish.getBestMove(chess.fen(), tuning.skillLevel, tuning.depth, moveTime);
    if (sfMove && sfMove.from && sfMove.to) {
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

export const getStockfishMoveAsync = getBestMoveAsync;

export function tuneStockfishForElo(elo: number): {
  skillLevel: number;
  depth: number;
  blunderRate: number;
  description: string;
} {
  if (elo <= 800) {
    return {
      skillLevel: 1,
      depth: 3,
      blunderRate: 0.25,
      description: 'Beginner-level play with occasional tactical oversights.',
    };
  }
  if (elo <= 1200) {
    return {
      skillLevel: 5,
      depth: 6,
      blunderRate: 0.12,
      description: 'Casual club player with basic tactical awareness.',
    };
  }
  if (elo <= 1600) {
    return {
      skillLevel: 10,
      depth: 9,
      blunderRate: 0.05,
      description: 'Intermediate player with strong piece coordination.',
    };
  }
  if (elo <= 2000) {
    return {
      skillLevel: 15,
      depth: 12,
      blunderRate: 0.01,
      description: 'Expert club player with high positional understanding.',
    };
  }
  return {
    skillLevel: 20,
    depth: 16,
    blunderRate: 0.0,
    description: 'Master/Grandmaster strength calculation with deep tactical depth.',
  };
}

function getStockfishTuningForBot(bot: BotProfile): { skillLevel: number; depth: number } {
  return tuneStockfishForElo(bot.elo);
}

/**
 * Converts centipawns to winning percentage (0 - 100)
 */
export function centipawnsToWinProb(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
}

/**
 * Full game analysis algorithm with accurate eval loss and blunder detection
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
  let whiteBests = 0;
  let blackBests = 0;
  let whiteExcellents = 0;
  let blackExcellents = 0;
  let whiteGoods = 0;
  let blackGoods = 0;
  let whiteInaccuracies = 0;
  let blackInaccuracies = 0;
  let whiteMistakes = 0;
  let blackMistakes = 0;
  let whiteBlunders = 0;
  let blackBlunders = 0;

  // Reset to start of moves
  sim.reset();

  const sanHistory: string[] = [];

  for (let i = 0; i < historyMoves.length; i++) {
    const m = historyMoves[i];
    const turn = sim.turn(); // Turn BEFORE move ('w' or 'b')
    const moveNumber = Math.floor(i / 2) + 1;

    // 1. Calculate best move and searched position evaluation before move
    const isWhite = turn === 'w';
    const bestMoveResult = minimax(sim, 2, -Infinity, Infinity, isWhite);
    const bestMoveSan = bestMoveResult.bestMove?.san || '';
    const bestMoveScore = bestMoveResult.score; // Centipawns from White's perspective

    // Clone position before move
    const beforeClone = new Chess(sim.fen());

    // Execute player move safely
    let moveResult: Move | null = null;
    try {
      moveResult = sim.move(m);
    } catch {
      break;
    }
    if (!moveResult) break;

    sanHistory.push(moveResult.san);

    // 2. Calculate searched evaluation of the position AFTER the move
    const playedMoveSearch = minimax(sim, 2, -Infinity, Infinity, sim.turn() === 'w');
    const playedMoveScore = playedMoveSearch.score; // Centipawns from White's perspective

    // 3. Check for standard opening theory in first 10 moves
    const isBookMove = moveNumber <= 10 && Boolean(detectOpening(sanHistory));

    // 4. Classify move with real engine rules, searched evaluations & context scaling
    const { classification, commentary, evalLoss, accuracy } = classifyEngineMove(
      beforeClone,
      moveResult,
      bestMoveScore,
      playedMoveScore,
      bestMoveSan,
      moveNumber,
      isBookMove ? { isBookOpeningMove: true } : undefined
    );

    // Track classification counts
    if (turn === 'w') {
      if (classification === 'brilliant') whiteBrilliants++;
      else if (classification === 'great') whiteBests++;
      else if (classification === 'best' || classification === 'book') whiteBests++;
      else if (classification === 'excellent') whiteExcellents++;
      else if (classification === 'good') whiteGoods++;
      else if (classification === 'inaccuracy') whiteInaccuracies++;
      else if (classification === 'mistake') whiteMistakes++;
      else if (classification === 'blunder' || classification === 'missed_win') whiteBlunders++;
    } else {
      if (classification === 'brilliant') blackBrilliants++;
      else if (classification === 'great') blackBests++;
      else if (classification === 'best' || classification === 'book') blackBests++;
      else if (classification === 'excellent') blackExcellents++;
      else if (classification === 'good') blackGoods++;
      else if (classification === 'inaccuracy') blackInaccuracies++;
      else if (classification === 'mistake') blackMistakes++;
      else if (classification === 'blunder' || classification === 'missed_win') blackBlunders++;
    }

    // Move accuracy calculation based on actual evaluation loss
    const moveAcc = accuracy;
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
      eval: +(playedMoveScore / 100).toFixed(2),
      bestMoveSan,
      classification,
      commentary,
    });
  }

  const whiteAccuracy = whiteMovesCount > 0 ? +(whiteAccuracySum / whiteMovesCount).toFixed(1) : 100;
  const blackAccuracy = blackMovesCount > 0 ? +(blackAccuracySum / blackMovesCount).toFixed(1) : 100;

  return {
    analyzedMoves,
    whiteAccuracy,
    blackAccuracy,
    whiteBrilliants,
    blackBrilliants,
    whiteBests,
    blackBests,
    whiteExcellents,
    blackExcellents,
    whiteGoods,
    blackGoods,
    whiteInaccuracies,
    blackInaccuracies,
    whiteMistakes,
    blackMistakes,
    whiteBlunders,
    blackBlunders,
  };
}

export function analyzeGame(
  historyMoves: { from: string; to: string; promotion?: string }[],
  initialPgn?: string
): AnalyzedGame {
  return analyzeMatch(historyMoves, initialPgn);
}
