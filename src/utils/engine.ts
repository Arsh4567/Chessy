import { Chess, Move } from 'chess.js';
import { BotProfile, MoveClassification, AnalyzedGame, AnalyzedMove, PieceType } from '../types/chess';
import { stockfish } from './stockfishWorker';
import { classifyEngineMove } from './moveClassification';

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

export interface EngineEloTuning {
  elo: number;
  skillLevel: number;
  depth: number;
  moveTimeMs: number;
  blunderRate: number;
  description: string;
}

/**
 * Calibrates Stockfish engine parameters to match a selected Elo rating (400 - 2800)
 */
export function tuneStockfishForElo(elo: number): EngineEloTuning {
  const clampedElo = Math.max(400, Math.min(2800, Math.round(elo)));
  const skillLevel = Math.max(0, Math.min(20, Math.round(((clampedElo - 400) / 2400) * 20)));
  const depth = Math.max(2, Math.min(22, Math.round(2 + ((clampedElo - 400) / 2400) * 20)));
  const moveTimeMs = Math.round(400 + ((clampedElo - 400) / 2400) * 1600);
  const blunderRate = Math.max(0, (2600 - clampedElo) / 3000);

  let description = 'Calibrated Engine';
  if (clampedElo < 800) description = 'Beginner: occasional mistakes, natural human pace';
  else if (clampedElo < 1200) description = 'Casual: solid basics, handles fundamental tactics';
  else if (clampedElo < 1600) description = 'Club: active positional play, standard openings';
  else if (clampedElo < 2000) description = 'Expert: sharp tactical calculation and defense';
  else if (clampedElo < 2400) description = 'Master: deep strategic plans, high precision';
  else description = 'Grandmaster: ruthless tactical accuracy and endgame mastery';

  return { elo: clampedElo, skillLevel, depth, moveTimeMs, blunderRate, description };
}

/**
 * Gets real Stockfish move using WebAssembly worker calibrated to the bot's Elo
 */
export async function getStockfishMoveAsync(
  chess: Chess,
  bot: BotProfile,
  customMoveTimeMs?: number
): Promise<{ from: string; to: string; promotion?: string }> {
  try {
    const tuning = tuneStockfishForElo(bot.elo);
    const moveTime = customMoveTimeMs || tuning.moveTimeMs;

    const sfMove = await stockfish.getBestMove(chess.fen(), tuning.skillLevel, tuning.depth, moveTime);
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

  for (let i = 0; i < historyMoves.length; i++) {
    const m = historyMoves[i];
    const turn = sim.turn(); // Turn BEFORE move
    const evalBefore = evaluateBoard(sim);
    const moveNumber = Math.floor(i / 2) + 1;

    // Calculate best move before player moved
    const bestMoveResult = minimax(sim, 2, -Infinity, Infinity, turn === 'w');
    const bestMoveSan = bestMoveResult.bestMove?.san || '';

    // Position clone before move for tactical checks
    const beforeClone = new Chess(sim.fen());

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

    // Classify move with real engine rules, actual eval loss & context scaling
    const { classification, commentary, evalLoss } = classifyEngineMove(
      beforeClone,
      moveResult,
      evalBefore,
      evalAfter,
      bestMoveSan,
      moveNumber
    );

    // Track classification counts
    if (turn === 'w') {
      if (classification === 'brilliant') whiteBrilliants++;
      else if (classification === 'best') whiteBests++;
      else if (classification === 'excellent') whiteExcellents++;
      else if (classification === 'good') whiteGoods++;
      else if (classification === 'inaccuracy') whiteInaccuracies++;
      else if (classification === 'mistake') whiteMistakes++;
      else if (classification === 'blunder') whiteBlunders++;
    } else {
      if (classification === 'brilliant') blackBrilliants++;
      else if (classification === 'best') blackBests++;
      else if (classification === 'excellent') blackExcellents++;
      else if (classification === 'good') blackGoods++;
      else if (classification === 'inaccuracy') blackInaccuracies++;
      else if (classification === 'mistake') blackMistakes++;
      else if (classification === 'blunder') blackBlunders++;
    }

    // Move accuracy calculation based on actual evaluation loss
    const moveAcc = Math.max(0, Math.min(100, 100 - evalLoss * 0.35));
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

export const analyzeGame = analyzeMatch;

