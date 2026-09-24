import { Chess, Move, Square } from 'chess.js';
import { MoveClassification, PieceType, PieceColor } from '../types/chess';
import { evaluateBoard } from './engine';

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
  /** Maximum evaluation loss (in centipawns) allowed for Best move (default: 5) */
  bestMaxLoss: number;
  /** Maximum evaluation loss (in centipawns) allowed for Excellent move (default: 22) */
  excellentMaxLoss: number;
  /** Maximum evaluation loss (in centipawns) allowed for Good move (default: 55) */
  goodMaxLoss: number;
  /** Maximum evaluation loss (in centipawns) allowed for Inaccuracy (default: 135) */
  inaccuracyMaxLoss: number;
  /** Maximum evaluation loss (in centipawns) allowed for Mistake (default: 280) */
  mistakeMaxLoss: number;
  /** Minimum evaluation loss (in centipawns) to be considered a Blunder (default: 280) */
  blunderMinLoss: number;
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  bestMaxLoss: 5,
  excellentMaxLoss: 22,
  goodMaxLoss: 55,
  inaccuracyMaxLoss: 135,
  mistakeMaxLoss: 280,
  blunderMinLoss: 280,
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
  evalDelta: number,
  userEvalAfter: number,
  isTopEngineMove: boolean,
  moveNumber: number
): { isBrilliant: boolean; reason?: string } {
  // Opening moves (first 4 moves) cannot be brilliant
  if (moveNumber <= 4) return { isBrilliant: false };

  // Must be top engine move or negligible delta
  if (!isTopEngineMove && evalDelta < -5) {
    return { isBrilliant: false };
  }

  // Must not lead to a lost position
  if (userEvalAfter < -50) {
    return { isBrilliant: false };
  }

  const userColor = moveResult.color;
  const oppColor = userColor === 'w' ? 'b' : 'w';
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

    if (canBeCapturedByOpponent) {
      if (userEvalAfter >= 80 || evalDelta >= 50) {
        return {
          isBrilliant: true,
          reason: `Brilliant ${moveResult.piece.toUpperCase()} sacrifice creating a decisive tactical advantage!`,
        };
      }
    }
  }

  // 2. Exchange Sacrifice: Rook sacrificed for Minor Piece / Pawn with crushing positional domination
  if (playedPiece === 'r' && (capturedVal <= 330) && userEvalAfter >= 150 && evalDelta >= 30) {
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

  // 4. Ignoring a Major Threat
  const userPiecesAttackedBefore = chessBefore.moves({ verbose: true }).filter((m) => m.captured);
  const wasMajorPieceHanging = userPiecesAttackedBefore.some(
    (m) => (m.captured === 'q' || m.captured === 'r') && m.color === oppColor
  );

  if (wasMajorPieceHanging && moveResult.piece !== 'q' && moveResult.piece !== 'r' && userEvalAfter >= 200 && evalDelta >= 60) {
    return {
      isBrilliant: true,
      reason: 'Brilliant counter-threat ignoring enemy pressure to win by force!',
    };
  }

  return { isBrilliant: false };
}

/**
 * Classifies a played move based on the actual evaluation loss (centipawn/position swing)
 * from the position before the move to the position after the move.
 *
 * Missing Stockfish's #1 move does NOT automatically make a move a blunder.
 * A move is evaluated against configurable thresholds and dynamically scaled
 * based on whether the position is winning, equal, or losing.
 */
export function classifyEngineMove(
  chessBefore: Chess,
  moveResult: Move,
  evalBefore: number,
  evalAfter: number,
  bestMoveSan: string,
  moveNumber: number,
  customThresholds?: Partial<ClassificationThresholds>
): {
  classification: MoveClassification;
  commentary: string;
  sign: MoveQualitySign;
  evalLoss: number;
} {
  const thresholds: ClassificationThresholds = {
    ...DEFAULT_CLASSIFICATION_THRESHOLDS,
    ...customThresholds,
  };

  const turn = moveResult.color;
  // Centipawn evaluations from the active player's perspective
  const userEvalBefore = turn === 'w' ? evalBefore : -evalBefore;
  const userEvalAfter = turn === 'w' ? evalAfter : -evalAfter;

  // Evaluation delta (positive = position improved, negative = position worsened)
  const evalDelta = userEvalAfter - userEvalBefore;
  // Evaluation loss (how many centipawns of advantage were surrendered)
  const evalLoss = Math.max(0, -evalDelta);

  const isTopMove = bestMoveSan ? bestMoveSan === moveResult.san : false;

  // 1. Check strict Brilliant conditions first
  const brilliantCheck = evaluateBrilliantCriteria(
    chessBefore,
    moveResult,
    evalDelta,
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
    };
  }

  // 2. Exact #1 engine move or evaluation improvement / negligible loss
  if (isTopMove || evalLoss <= thresholds.bestMaxLoss) {
    return {
      classification: 'best',
      commentary: isTopMove
        ? 'The top engine recommendation in the position.'
        : `An optimal move maintaining full advantage (${(userEvalAfter / 100).toFixed(2)}).`,
      sign: MOVE_QUALITY_SIGNS.best,
      evalLoss,
    };
  }

  // --- Contextual scaling for Winning vs. Balanced vs. Losing positions ---
  // When ahead by +4.0 or more, losing 1.5 pawns while remaining at +6.0 is NOT a blunder.
  let scaleFactor = 1.0;
  if (userEvalBefore >= 400 && userEvalAfter >= 250) {
    // Decisively winning position where user remains decisively winning
    scaleFactor = 2.2;
  } else if (userEvalBefore >= 200 && userEvalAfter >= 120) {
    // Solid advantage where user maintains clear advantage
    scaleFactor = 1.5;
  } else if (userEvalBefore <= -400 && userEvalAfter <= -400) {
    // Already heavily lost position: minor slips shouldn't all be blunders
    scaleFactor = 1.8;
  }

  const effectiveExcellent = thresholds.excellentMaxLoss * scaleFactor;
  const effectiveGood = thresholds.goodMaxLoss * scaleFactor;
  const effectiveInaccuracy = thresholds.inaccuracyMaxLoss * scaleFactor;
  const effectiveMistake = thresholds.mistakeMaxLoss * scaleFactor;

  // 3. Excellent Move (minimal eval loss)
  if (evalLoss <= effectiveExcellent) {
    return {
      classification: 'excellent',
      commentary: `An excellent move. Keeps strong pressure. (Engine preferred: ${bestMoveSan || moveResult.san})`,
      sign: MOVE_QUALITY_SIGNS.excellent,
      evalLoss,
    };
  }

  // 4. Good Move (minor, acceptable eval loss, e.g. +1.2 -> +0.9)
  if (evalLoss <= effectiveGood) {
    return {
      classification: 'good',
      commentary: `A solid, playable move. Better was ${bestMoveSan || 'active piece coordination'}.`,
      sign: MOVE_QUALITY_SIGNS.good,
      evalLoss,
    };
  }

  // 5. Inaccuracy (conceding noticeable positional ground or initiative)
  if (evalLoss <= effectiveInaccuracy) {
    return {
      classification: 'inaccuracy',
      commentary: `Inaccuracy (${(evalLoss / 100).toFixed(2)} pawn loss). Allowed counterplay. Recommended: ${bestMoveSan}.`,
      sign: MOVE_QUALITY_SIGNS.inaccuracy,
      evalLoss,
    };
  }

  // 6. Mistake (giving up clear advantage or significant material)
  if (evalLoss <= effectiveMistake) {
    return {
      classification: 'mistake',
      commentary: `Mistake (-${(evalLoss / 100).toFixed(2)} pawns). Conceded the advantage. Best was ${bestMoveSan}.`,
      sign: MOVE_QUALITY_SIGNS.mistake,
      evalLoss,
    };
  }

  // 7. Blunder (genuinely large evaluation loss or throwing a winning/equal position into a loss)
  return {
    classification: 'blunder',
    commentary: `Blunder! Dropped decisive material or evaluation (-${(evalLoss / 100).toFixed(2)} pawns). Best was ${bestMoveSan}.`,
    sign: MOVE_QUALITY_SIGNS.blunder,
    evalLoss,
  };
}
