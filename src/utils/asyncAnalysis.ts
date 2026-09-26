/**
 * High-Performance Asynchronous Non-Blocking Chess Game Analyzer
 * 
 * Powered by Stockfish 19 WebAssembly in Web Worker
 * - Analyzes every played move independently with Stockfish (including move 1 and all opening moves).
 * - "Book / Theory" describes opening database theory and NEVER overrides Stockfish.
 * - Progressive streaming: results appear immediately as each move finishes.
 * - Never blocks the main UI thread.
 */

import { Chess, Move } from 'chess.js';
import { AnalyzedGame, AnalyzedMove, PieceType } from '../types/chess';
import { stockfish, StockfishEvaluation } from './stockfishWorker';
import { detectOpening } from './openings';
import { classifyEngineMove, calculateGameAccuracy, MOVE_QUALITY_SIGNS } from './moveClassification';

// Global In-Memory LRU Game Analysis Cache (max 100 games)
const gameAnalysisCache = new Map<string, AnalyzedGame>();
const MAX_CACHE_GAMES = 100;

export function getCachedGameAnalysis(cacheKey: string): AnalyzedGame | undefined {
  return gameAnalysisCache.get(cacheKey);
}

export function setCachedGameAnalysis(cacheKey: string, result: AnalyzedGame): void {
  if (gameAnalysisCache.size >= MAX_CACHE_GAMES) {
    const oldestKey = gameAnalysisCache.keys().next().value;
    if (oldestKey) gameAnalysisCache.delete(oldestKey);
  }
  gameAnalysisCache.set(cacheKey, result);
}

/**
 * Instantly parses moves from PGN or move array in <2ms with zero main-thread blockage.
 * Generates valid FENs, SANs, and piece movements immediately so UI displays right away.
 * IMPORTANT: Move classification and Book marks remain UNASSIGNED until Stockfish evaluates them!
 */
export function parseGameMovesInstantly(
  moves: { from: string; to: string; promotion?: string }[],
  initialPgn?: string
): AnalyzedGame {
  const sim = new Chess();
  if (initialPgn && initialPgn.trim()) {
    try {
      sim.loadPgn(initialPgn.trim());
      const history = sim.history({ verbose: true });
      if (history.length > 0) {
        moves = history.map((h) => ({
          from: h.from,
          to: h.to,
          promotion: h.promotion,
        }));
      }
    } catch {}
  }

  sim.reset();
  const analyzedMoves: AnalyzedMove[] = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    let moveResult: Move | null = null;
    try {
      moveResult = sim.move(m);
    } catch {
      break;
    }
    if (!moveResult) break;

    analyzedMoves.push({
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece as PieceType,
      color: moveResult.color as 'w' | 'b',
      captured: moveResult.captured as PieceType | undefined,
      promotion: moveResult.promotion as PieceType | undefined,
      fen: sim.fen(),
      eval: 0,
      evalBefore: 0,
      evalLoss: 0,
      classification: undefined, // Strictly assigned when Stockfish evaluates
      isBookMove: false, // Never mark as Book Move fallback!
      openingName: undefined,
      commentary: undefined,
    });
  }

  return {
    analyzedMoves,
    whiteAccuracy: 95.0,
    blackAccuracy: 95.0,
    whiteBrilliants: 0,
    blackBrilliants: 0,
    whiteBests: 0,
    blackBests: 0,
    whiteExcellents: 0,
    blackExcellents: 0,
    whiteGoods: 0,
    blackGoods: 0,
    whiteInaccuracies: 0,
    blackInaccuracies: 0,
    whiteMistakes: 0,
    blackMistakes: 0,
    whiteBlunders: 0,
    blackBlunders: 0,
  };
}

export interface ProgressiveAnalysisController {
  abort: () => void;
  isAborted: boolean;
}

/**
 * Converts a parsed Stockfish UCI move (e.g. { from: 'e2', to: 'e4' }) into SAN notation (e.g. 'e4')
 */
function getBestMoveSan(fen: string, bestMove?: { from: string; to: string; promotion?: string }): string {
  if (!bestMove) return '';
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: bestMove.from,
      to: bestMove.to,
      promotion: bestMove.promotion,
    });
    return m ? m.san : '';
  } catch {
    return '';
  }
}

/**
 * Analyzes full chess game asynchronously through the Stockfish Web Worker.
 * 
 * Pipeline:
 * 1. Generates position FEN immediately before and after every move.
 * 2. Runs Stockfish calculation on all positions (including move 1 and opening moves).
 * 3. Calculates evaluation before vs. after from moving player's perspective:
 *    - For White: evalLoss = beforeScore - playedMoveScore
 *    - For Black: evalLoss = playedMoveScore - beforeScore
 * 4. Assigns genuine Stockfish move mark (Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, Blunder).
 * 5. Opening theory is tracked as a separate informational badge and NEVER overrides Stockfish.
 * 6. Progressively streams results move-by-move.
 */
export function analyzeGameProgressively(
  rawMoves: { from: string; to: string; promotion?: string }[],
  initialPgn: string | undefined,
  cacheKey: string,
  onProgress: (game: AnalyzedGame, currentMoveIdx: number, progressPercent: number) => void,
  onComplete: (game: AnalyzedGame) => void,
  options?: {
    maxBudgetMs?: number;
    stockfishDepth?: number;
    movetimeMs?: number;
  }
): ProgressiveAnalysisController {
  let isAborted = false;
  const maxBudgetMs = options?.maxBudgetMs || 45000;
  const stockfishDepth = options?.stockfishDepth || 14;
  const movetimeMs = options?.movetimeMs || 100;
  const startTime = performance.now();

  // 1. Check in-memory LRU cache first (only if it has fully evaluated moves)
  const cached = getCachedGameAnalysis(cacheKey);
  if (cached && cached.analyzedMoves.length > 0 && cached.analyzedMoves[0].classification) {
    setTimeout(() => {
      if (!isAborted) {
        onProgress(cached, cached.analyzedMoves.length - 1, 100);
        onComplete(cached);
      }
    }, 0);
    return {
      abort: () => { isAborted = true; },
      isAborted: false,
    };
  }

  // 2. Extract verified moves and FEN sequence from PGN or move array
  const sim = new Chess();
  if (initialPgn && initialPgn.trim()) {
    try {
      sim.loadPgn(initialPgn.trim());
    } catch (e) {
      console.warn('[Stockfish Analysis] PGN load error:', e);
    }
  }

  let verboseHistory = sim.history({ verbose: true });
  // Fall back to rawMoves if PGN had no history
  if (verboseHistory.length === 0 && rawMoves.length > 0) {
    sim.reset();
    for (const m of rawMoves) {
      try {
        sim.move(m);
      } catch {
        break;
      }
    }
    verboseHistory = sim.history({ verbose: true });
  }

  // Rebuild replay positions from initial starting FEN
  const replayChess = new Chess();
  const fens: string[] = [replayChess.fen()]; // fens[0] = starting position
  const moveResults: Move[] = [];
  const sanHistory: string[] = [];

  for (const h of verboseHistory) {
    try {
      const res = replayChess.move({ from: h.from, to: h.to, promotion: h.promotion });
      if (!res) break;
      moveResults.push(res);
      fens.push(replayChess.fen());
      sanHistory.push(res.san);
    } catch {
      break;
    }
  }

  const validMovesCount = moveResults.length;

  // 3. Produce instant baseline game representation in <2ms
  const initialMoves: AnalyzedMove[] = moveResults.map((m, i) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    piece: m.piece as PieceType,
    color: m.color as 'w' | 'b',
    captured: m.captured as PieceType | undefined,
    promotion: m.promotion as PieceType | undefined,
    fen: fens[i + 1],
    eval: 0,
    evalBefore: 0,
    evalLoss: 0,
    classification: undefined, // Pending Stockfish evaluation
    isBookMove: false,
    openingName: undefined,
    commentary: undefined,
  }));

  const initialGame: AnalyzedGame = {
    analyzedMoves: initialMoves,
    whiteAccuracy: 95.0,
    blackAccuracy: 95.0,
    whiteBrilliants: 0,
    blackBrilliants: 0,
    whiteBests: 0,
    blackBests: 0,
    whiteExcellents: 0,
    blackExcellents: 0,
    whiteGoods: 0,
    blackGoods: 0,
    whiteInaccuracies: 0,
    blackInaccuracies: 0,
    whiteMistakes: 0,
    blackMistakes: 0,
    whiteBlunders: 0,
    blackBlunders: 0,
  };

  if (validMovesCount === 0) {
    setTimeout(() => {
      if (!isAborted) {
        onProgress(initialGame, -1, 100);
        onComplete(initialGame);
      }
    }, 0);
    return {
      abort: () => { isAborted = true; },
      isAborted: false,
    };
  }

  // Broadcast instant initial layout immediately
  onProgress(initialGame, 0, 5);

  const analyzedMoves: AnalyzedMove[] = [...initialMoves];

  // Cumulative Classification Counters
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

  // Asynchronous Worker Loop
  const runAsyncAnalysis = async () => {
    try {
      console.log('ANALYZE START');

      // Step A: Evaluate initial starting position (FEN 0) with Stockfish (depth 16-24)
      const initialFen = fens[0];
      let prevEval: StockfishEvaluation = await stockfish.evaluatePosition(initialFen, stockfishDepth, movetimeMs);
      let prevBestMoveSan = getBestMoveSan(initialFen, prevEval.bestMove);

      for (let i = 0; i < validMovesCount; i++) {
        if (isAborted) return;

        // Check budget timeout
        if (performance.now() - startTime > maxBudgetMs) {
          console.warn('[Stockfish Analysis] Budget timeout reached after', Math.round(performance.now() - startTime), 'ms');
          break;
        }

        const moveResult = moveResults[i];
        const fenBefore = fens[i];
        const fenAfter = fens[i + 1];
        const moveNumber = Math.floor(i / 2) + 1;
        const turn = moveResult.color;

        // Required debug logging for the first 5 moves
        if (i < 5) {
          console.log('ANALYZE START');
          console.log('moveNumber:', moveNumber);
          console.log('SAN:', moveResult.san);
          console.log('FEN before:', fenBefore);
          console.log('FEN after:', fenAfter);
          console.log('STOCKFISH REQUEST SENT:', fenAfter);
        }

        // Step B: Run Stockfish evaluation on position AFTER the move (fast opening moves, deep middlegame)
        const moveDepth = moveNumber <= 4 ? Math.min(stockfishDepth, 12) : stockfishDepth;
        const moveTime = moveNumber <= 4 ? Math.min(movetimeMs, 75) : movetimeMs;
        const currentEval: StockfishEvaluation = await stockfish.evaluatePosition(fenAfter, moveDepth, moveTime);
        const currentBestMoveSan = getBestMoveSan(fenAfter, currentEval.bestMove);

        // Before score (from White's perspective) and After score (from White's perspective)
        const beforeScore = prevEval.scoreCp;
        const playedMoveScore = currentEval.scoreCp;
        const bestMoveSan = prevBestMoveSan;

        // Evaluations are in White's perspective (+ = White advantage, - = Black advantage).
        // Calculate evaluation loss strictly from the perspective of the player who made the move:
        // - For White: loss = beforeScore - playedMoveScore (evalBefore - evalAfter)
        // - For Black: loss = playedMoveScore - beforeScore (evalAfter - evalBefore)
        const isWhite = turn === 'w';
        const rawLoss = isWhite
          ? (beforeScore - playedMoveScore)
          : (playedMoveScore - beforeScore);
        const evalLoss = Math.max(0, rawLoss);

        // Check opening theory separately for informational display only
        const openingInfo = moveNumber <= 15 ? detectOpening(sanHistory.slice(0, i + 1)) : undefined;
        const isBookMove = Boolean(openingInfo);
        const openingName = openingInfo?.name;

        // Clone position before move for tactical checks
        const beforeClone = new Chess(fenBefore);

        // Step C: Classify move with genuine Stockfish evaluation delta
        const { classification, commentary } = classifyEngineMove(
          beforeClone,
          moveResult,
          beforeScore,
          playedMoveScore,
          bestMoveSan,
          moveNumber
        );

        // Required debug logging for first 5 moves
        if (i < 5) {
          console.log('STOCKFISH SCORE RECEIVED:', currentEval.scoreCp);
          console.log('bestmove:', bestMoveSan || currentBestMoveSan || 'none');
          console.log('evalBefore:', +(beforeScore / 100).toFixed(2));
          console.log('evalAfter:', +(playedMoveScore / 100).toFixed(2));
          console.log('evalLoss:', +(evalLoss / 100).toFixed(2));
          console.log('FINAL CLASSIFICATION:', classification);
        }

        // Aggregate classification metrics
        if (turn === 'w') {
          if (classification === 'brilliant') whiteBrilliants++;
          else if (classification === 'great' || classification === 'best') whiteBests++;
          else if (classification === 'excellent') whiteExcellents++;
          else if (classification === 'good') whiteGoods++;
          else if (classification === 'inaccuracy') whiteInaccuracies++;
          else if (classification === 'mistake') whiteMistakes++;
          else if (classification === 'blunder' || classification === 'missed_win') whiteBlunders++;
        } else {
          if (classification === 'brilliant') blackBrilliants++;
          else if (classification === 'great' || classification === 'best') blackBests++;
          else if (classification === 'excellent') blackExcellents++;
          else if (classification === 'good') blackGoods++;
          else if (classification === 'inaccuracy') blackInaccuracies++;
          else if (classification === 'mistake') blackMistakes++;
          else if (classification === 'blunder' || classification === 'missed_win') blackBlunders++;
        }

        analyzedMoves[i] = {
          san: moveResult.san,
          from: moveResult.from,
          to: moveResult.to,
          piece: moveResult.piece as PieceType,
          color: moveResult.color as 'w' | 'b',
          captured: moveResult.captured as PieceType | undefined,
          promotion: moveResult.promotion as PieceType | undefined,
          fen: fenAfter,
          eval: +(playedMoveScore / 100).toFixed(2),
          evalBefore: +(beforeScore / 100).toFixed(2),
          evalLoss: +(evalLoss / 100).toFixed(2),
          bestMoveSan,
          bestMove: prevEval.bestMove,
          depth: currentEval.depth,
          mate: currentEval.mate,
          classification,
          isBookMove,
          openingName,
          commentary,
        };

        // Advance before evaluation to current position for next move
        prevEval = currentEval;
        prevBestMoveSan = currentBestMoveSan;

        // Step D: Progressive UI broadcast
        const { whiteAccuracy, blackAccuracy } = calculateGameAccuracy(analyzedMoves.slice(0, i + 1));
        const progressPercent = Math.min(100, Math.round(((i + 1) / validMovesCount) * 100));

        const updatedResult: AnalyzedGame = {
          analyzedMoves: [...analyzedMoves],
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

        if (!isAborted) {
          onProgress(updatedResult, i, progressPercent);
        }

        // Yield to browser UI thread
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Step E: Completion
      const finalAccuracy = calculateGameAccuracy(analyzedMoves);
      const finalResult: AnalyzedGame = {
        analyzedMoves: [...analyzedMoves],
        whiteAccuracy: finalAccuracy.whiteAccuracy,
        blackAccuracy: finalAccuracy.blackAccuracy,
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

      if (!isAborted) {
        setCachedGameAnalysis(cacheKey, finalResult);
        onComplete(finalResult);
      }
    } catch (err) {
      console.warn('[Stockfish Analysis] Error in progressive analysis pipeline:', err);
    }
  };

  // Launch async worker pipeline
  setTimeout(runAsyncAnalysis, 0);

  return {
    abort: () => {
      isAborted = true;
    },
    get isAborted() {
      return isAborted;
    },
  };
}
