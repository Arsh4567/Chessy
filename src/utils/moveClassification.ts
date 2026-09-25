import { Chess, Move } from 'chess.js';
import { MoveClassification, PieceType, AnalyzedMove } from '../types/chess';

export interface MoveQualitySign {
  classification: MoveClassification;
  symbol: string;
  label: string;
  colorName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glowColor: string;
  description: string;
}

export const MOVE_QUALITY_SIGNS: Record<MoveClassification, MoveQualitySign> = {
  brilliant: {
    classification: 'brilliant',
    symbol: '!!',
    label: 'Brilliant',
    colorName: 'cyan',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-400/50',
    glowColor: 'shadow-cyan-500/50',
    description: 'A spectacular move finding the only winning resource or sacrificing material for a decisive advantage.',
  },
  great: {
    classification: 'great',
    symbol: '!',
    label: 'Great',
    colorName: 'teal',
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-400/50',
    glowColor: 'shadow-teal-500/50',
    description: 'A critical move finding the only good continuation.',
  },
  best: {
    classification: 'best',
    symbol: '!',
    label: 'Best',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    glowColor: 'shadow-emerald-500/40',
    description: 'The top engine recommendation in the position.',
  },
  excellent: {
    classification: 'excellent',
    symbol: '★',
    label: 'Excellent',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    glowColor: 'shadow-emerald-500/30',
    description: 'Almost as strong as the best move, preserving the advantage.',
  },
  good: {
    classification: 'good',
    symbol: '✓',
    label: 'Good',
    colorName: 'blue',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/30',
    description: 'A solid, healthy move that maintains the position.',
  },
  book: {
    classification: 'book',
    symbol: '📖',
    label: 'Book',
    colorName: 'indigo',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-400/40',
    glowColor: 'shadow-indigo-500/30',
    description: 'Established opening theory.',
  },
  inaccuracy: {
    classification: 'inaccuracy',
    symbol: '?!',
    label: 'Inaccuracy',
    colorName: 'yellow',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-500/40',
    glowColor: 'shadow-yellow-500/30',
    description: 'A slight slip that concedes a bit of advantage or allows opponent counterplay.',
  },
  mistake: {
    classification: 'mistake',
    symbol: '?',
    label: 'Mistake',
    colorName: 'amber',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/50',
    glowColor: 'shadow-amber-500/40',
    description: 'A noticeable error that significantly worsens the evaluation or gives away the initiative.',
  },
  blunder: {
    classification: 'blunder',
    symbol: '??',
    label: 'Blunder',
    colorName: 'rose',
    badgeBg: 'bg-rose-500/25',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/50',
    glowColor: 'shadow-rose-500/50',
    description: 'A fatal mistake that blunders material or loses the game immediately.',
  },
  missed_win: {
    classification: 'missed_win',
    symbol: '≠',
    label: 'Missed Win',
    colorName: 'rose',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-400/40',
    glowColor: 'shadow-rose-500/30',
    description: 'Missed a decisive winning tactic or forced mate sequence.',
  },
};

export interface ClassificationThresholds {
  bestMaxLoss: number;
  excellentMaxLoss: number;
  goodMaxLoss: number;
  inaccuracyMaxLoss: number;
  mistakeMaxLoss: number;
  blunderMinLoss: number;
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  bestMaxLoss: 20,
  excellentMaxLoss: 60,
  goodMaxLoss: 120,
  inaccuracyMaxLoss: 220,
  mistakeMaxLoss: 380,
  blunderMinLoss: 380,
};

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

/**
 * Evaluates whether a move qualifies for strict "Brilliant" classification
 */
export function evaluateBrilliantCriteria(
  chessBefore: Chess,
  moveResult: Move,
  evalLoss: number,
  userEvalAfter: number,
  isTopEngineMove: boolean,
  moveNumber: number
): { isBrilliant: boolean; reason?: string } {
  // Opening moves (first 3 moves) cannot be brilliant
  if (moveNumber <= 3) return { isBrilliant: false };

  // Must not have significant eval loss (must be top move or nearly top move)
  if (!isTopEngineMove && evalLoss > 15) {
    return { isBrilliant: false };
  }

  // Must not lead to a lost position
  if (userEvalAfter < -30) {
    return { isBrilliant: false };
  }

  const playedPiece = moveResult.piece;
  const pieceVal = PIECE_VALUES[playedPiece] || 0;

  // Clone position after move
  const chessAfter = new Chess(chessBefore.fen());
  try {
    chessAfter.move(moveResult);
  } catch {
    return { isBrilliant: false };
  }

  // 1. Piece Sacrifice Detection
  const capturedVal = moveResult.captured ? PIECE_VALUES[moveResult.captured] || 0 : 0;
  const materialSacrificed = pieceVal - capturedVal;

  if (materialSacrificed >= 200) {
    const oppMoves = chessAfter.moves({ verbose: true });
    const canBeCapturedByOpponent = oppMoves.some((m) => m.to === moveResult.to);

    if (canBeCapturedByOpponent && userEvalAfter >= 80) {
      return {
        isBrilliant: true,
        reason: `Brilliant ${moveResult.piece.toUpperCase()} sacrifice creating a decisive tactical advantage!`,
      };
    }
  }

  // 2. Exchange Sacrifice: Rook sacrificed for Minor Piece / Pawn with crushing advantage
  if (playedPiece === 'r' && capturedVal <= 330 && userEvalAfter >= 150) {
    const oppMoves = chessAfter.moves({ verbose: true });
    const canBeCaptured = oppMoves.some((m) => m.to === moveResult.to);
    if (canBeCaptured) {
      return {
        isBrilliant: true,
        reason: 'Brilliant exchange sacrifice that shatters opponent defenses!',
      };
    }
  }

  // 3. Forced Mate Sequence
  if (chessAfter.isCheckmate() && !moveResult.captured && userEvalAfter >= 1000) {
    return {
      isBrilliant: true,
      reason: 'Brilliant quiet move delivering checkmate!',
    };
  }

  return { isBrilliant: false };
}

/**
 * Calculate move accuracy percentage (0 - 100%) based on centipawn loss and win probability model
 */
export function calculateMoveAccuracy(evalLoss: number, isTopMove: boolean = false): number {
  if (isTopMove || evalLoss <= 5) return 100;
  // Standard non-linear logistic curve mapping centipawn loss to move accuracy
  const acc = 103.1668 * Math.exp(-0.00438 * evalLoss) - 3.1668;
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

/**
 * Calculates aggregate White and Black game accuracy from analyzed move sequence
 */
export function calculateGameAccuracy(moves: AnalyzedMove[]): { whiteAccuracy: number; blackAccuracy: number } {
  let whiteSum = 0;
  let whiteCount = 0;
  let blackSum = 0;
  let blackCount = 0;

  for (const m of moves) {
    // If classification is brilliant/great/best/book, count as 100% accuracy
    let moveAcc = 100;
    if (m.classification === 'brilliant' || m.classification === 'great' || m.classification === 'best' || m.classification === 'book') {
      moveAcc = 100;
    } else if (m.classification === 'excellent') {
      moveAcc = 94;
    } else if (m.classification === 'good') {
      moveAcc = 82;
    } else if (m.classification === 'inaccuracy') {
      moveAcc = 65;
    } else if (m.classification === 'mistake') {
      moveAcc = 40;
    } else if (m.classification === 'blunder' || m.classification === 'missed_win') {
      moveAcc = 15;
    }

    if (m.color === 'w') {
      whiteSum += moveAcc;
      whiteCount++;
    } else {
      blackSum += moveAcc;
      blackCount++;
    }
  }

  return {
    whiteAccuracy: whiteCount > 0 ? Math.round((whiteSum / whiteCount) * 10) / 10 : 95.0,
    blackAccuracy: blackCount > 0 ? Math.round((blackSum / blackCount) * 10) / 10 : 95.0,
  };
}

/**
 * Classifies a played move based on true searched evaluation loss from the moving player's perspective.
 */
export function classifyEngineMove(
  chessBefore: Chess,
  moveResult: Move,
  bestMoveScore: number, // Best possible score from White's perspective
  playedMoveScore: number, // Score achieved by the played move from White's perspective
  bestMoveSan: string,
  moveNumber: number,
  options?: {
    customThresholds?: Partial<ClassificationThresholds>;
    isBookOpeningMove?: boolean;
    isOnlyGoodMove?: boolean;
  }
): {
  classification: MoveClassification;
  commentary: string;
  sign: MoveQualitySign;
  evalLoss: number;
  accuracy: number;
} {
  const thresholds: ClassificationThresholds = {
    ...DEFAULT_CLASSIFICATION_THRESHOLDS,
    ...options?.customThresholds,
  };

  // Convert scores to active player's perspective (positive = good for active player)
  const turn = moveResult.color;
  const isWhite = turn === 'w';
  const userEvalBefore = isWhite ? bestMoveScore : -bestMoveScore;
  const userEvalAfter = isWhite ? playedMoveScore : -playedMoveScore;

  // True centipawn loss (how much of the best evaluation was lost by playing this move)
  const evalLoss = Math.max(0, userEvalBefore - userEvalAfter);
  const isTopMove = bestMoveSan ? bestMoveSan === moveResult.san : false;
  const accuracy = calculateMoveAccuracy(evalLoss, isTopMove);

  // 0. Book opening move check
  if (options?.isBookOpeningMove) {
    return {
      classification: 'book',
      commentary: 'Established opening theory.',
      sign: MOVE_QUALITY_SIGNS.book,
      evalLoss: 0,
      accuracy: 100,
    };
  }

  // 1. Check strict Brilliant conditions first (sacrifices, quiet winning moves)
  const brilliantCheck = evaluateBrilliantCriteria(
    chessBefore,
    moveResult,
    evalLoss,
    userEvalAfter,
    isTopMove,
    moveNumber
  );

  if (brilliantCheck.isBrilliant) {
    return {
      classification: 'brilliant',
      commentary: brilliantCheck.reason || 'A brilliant tactical breakthrough!',
      sign: MOVE_QUALITY_SIGNS.brilliant,
      evalLoss,
      accuracy: 100,
    };
  }

  // 2. Check Great move conditions (critical only-move, tactical find in complex position)
  if ((isTopMove || evalLoss <= 10) && (options?.isOnlyGoodMove || (moveNumber > 5 && userEvalBefore <= 50 && userEvalAfter >= 150))) {
    return {
      classification: 'great',
      commentary: 'A critical move finding the best tactical path!',
      sign: MOVE_QUALITY_SIGNS.great,
      evalLoss,
      accuracy: 100,
    };
  }

  // 3. Exact #1 engine move or negligible evaluation loss (< 25 cp)
  if (isTopMove || evalLoss <= thresholds.bestMaxLoss) {
    return {
      classification: 'best',
      commentary: isTopMove
        ? 'The top engine recommendation in the position.'
        : `An optimal move maintaining advantage (${(userEvalAfter / 100).toFixed(2)}).`,
      sign: MOVE_QUALITY_SIGNS.best,
      evalLoss,
      accuracy: 100,
    };
  }

  // --- Contextual dynamic scaling ---
  // If player was winning +6.0 and drops to +4.5, they are still completely winning (+4.5) -> NOT a blunder.
  // If player was already lost -8.0 and drops to -9.0, they were already lost -> NOT a blunder.
  let scaleFactor = 1.0;
  if (userEvalBefore >= 400 && userEvalAfter >= 250) {
    // Decisively winning position remaining decisively winning
    scaleFactor = 2.5;
  } else if (userEvalBefore >= 200 && userEvalAfter >= 120) {
    // Solid advantage remaining solid advantage
    scaleFactor = 1.6;
  } else if (userEvalBefore <= -400 && userEvalAfter <= -400) {
    // Already lost position
    scaleFactor = 2.5;
  }

  const effectiveExcellent = thresholds.excellentMaxLoss * scaleFactor;
  const effectiveGood = thresholds.goodMaxLoss * scaleFactor;
  const effectiveInaccuracy = thresholds.inaccuracyMaxLoss * scaleFactor;
  const effectiveMistake = thresholds.mistakeMaxLoss * scaleFactor;

  // 4. Excellent Move (minimal eval loss, e.g. <= 0.60 pawns)
  if (evalLoss <= effectiveExcellent) {
    return {
      classification: 'excellent',
      commentary: `An excellent move. Preserves strong position. (Alternative: ${bestMoveSan || moveResult.san})`,
      sign: MOVE_QUALITY_SIGNS.excellent,
      evalLoss,
      accuracy,
    };
  }

  // 5. Good Move (minor, playable loss, e.g. <= 1.20 pawns)
  if (evalLoss <= effectiveGood) {
    return {
      classification: 'good',
      commentary: `A solid, playable move. Better was ${bestMoveSan || 'active piece development'}.`,
      sign: MOVE_QUALITY_SIGNS.good,
      evalLoss,
      accuracy,
    };
  }

  // 6. Inaccuracy (noticeable positional ground conceded, e.g. <= 2.20 pawns)
  if (evalLoss <= effectiveInaccuracy) {
    return {
      classification: 'inaccuracy',
      commentary: `Inaccuracy (${(evalLoss / 100).toFixed(2)} pawn loss). Allowed counterplay. Recommended: ${bestMoveSan}.`,
      sign: MOVE_QUALITY_SIGNS.inaccuracy,
      evalLoss,
      accuracy,
    };
  }

  // 7. Mistake (giving up clear advantage or noticeable material)
  if (evalLoss <= effectiveMistake) {
    return {
      classification: 'mistake',
      commentary: `Mistake (-${(evalLoss / 100).toFixed(2)} pawns). Conceded the advantage. Best was ${bestMoveSan}.`,
      sign: MOVE_QUALITY_SIGNS.mistake,
      evalLoss,
      accuracy,
    };
  }

  // 8. Check for Missed Win (had decisive winning advantage >= +3.0 and dropped it to <= +0.5)
  if (userEvalBefore >= 300 && userEvalAfter <= 50) {
    return {
      classification: 'missed_win',
      commentary: `Missed Win! Squandered a decisive winning position. Best was ${bestMoveSan}.`,
      sign: MOVE_QUALITY_SIGNS.missed_win,
      evalLoss,
      accuracy,
    };
  }

  // 9. Blunder (genuinely large evaluation loss or losing game)
  return {
    classification: 'blunder',
    commentary: `Blunder! Dropped decisive material or evaluation (-${(evalLoss / 100).toFixed(2)} pawns). Best was ${bestMoveSan}.`,
    sign: MOVE_QUALITY_SIGNS.blunder,
    evalLoss,
    accuracy,
  };
}
