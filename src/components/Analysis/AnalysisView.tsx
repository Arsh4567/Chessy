import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { AnalyzedMove, AnalyzedGame, MoveClassification } from '../../types/chess';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { MoveHistory } from '../ChessBoard/MoveHistory';
import { ChessComExplorer } from '../ChessCom/ChessComExplorer';
import { OpeningExplorer } from './OpeningExplorer';
import { AnalysisHeader } from './AnalysisHeader';
import { PgnImportModal } from './PgnImportModal';
import { AnalysisClassificationSummary } from './AnalysisClassificationSummary';
import { MoveInspector } from './MoveInspector';
import { EngineStatusHud } from './EngineStatusHud';
import { GameAnalysisReportTab } from './GameAnalysisReportTab';
import { parseGameMovesInstantly, analyzeGameProgressively, ProgressiveAnalysisController } from '../../utils/asyncAnalysis';
import { detectOpening } from '../../utils/openings';
import { sound } from '../../utils/sound';
import { stockfish, StockfishEvaluation, formatPvToSan } from '../../utils/stockfishWorker';
import { classifyEngineMove } from '../../utils/moveClassification';
import { 
  Layers, 
  BookOpen, 
  FileText 
} from 'lucide-react';

interface AnalysisViewProps {
  initialMoves: { from: string; to: string; promotion?: string }[];
  initialPgn?: string;
  onExitAnalysis: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  initialMoves,
  initialPgn,
  onExitAnalysis,
}) => {
  const [chess, setChess] = useState<Chess>(new Chess());
  const [currentMoveIdx, setCurrentMoveIdx] = useState<number>(-1);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedGame | null>(null);

  // Mainline game cache to allow users to freely explore variations and return
  const [mainlineGame, setMainlineGame] = useState<AnalyzedGame | null>(null);
  const [isVariationActive, setIsVariationActive] = useState<boolean>(false);
  const [variationOriginIdx, setVariationOriginIdx] = useState<number>(-1);

  const [showBestMoveArrow, setShowBestMoveArrow] = useState<boolean>(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [customPgnInput, setCustomPgnInput] = useState('');
  const [showPgnImport, setShowPgnImport] = useState(false);
  const [showChessCom, setShowChessCom] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'moves' | 'explorer' | 'report'>('moves');

  // Live Stockfish Engine Evaluation State
  const [stockfishEval, setStockfishEval] = useState<StockfishEvaluation>({
    depth: 0,
    scoreCp: 0,
    displayEval: '0.00',
  });
  const [isEngineEvaluating, setIsEngineEvaluating] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(100);
  const [isProgressivelyAnalyzing, setIsProgressivelyAnalyzing] = useState<boolean>(() => {
    return Boolean(initialPgn?.trim() || (initialMoves && initialMoves.length > 0));
  });
  const analysisControllerRef = useRef<ProgressiveAnalysisController | null>(null);

  const currentMove =
    currentMoveIdx >= 0 && analyzedData?.analyzedMoves
      ? analyzedData.analyzedMoves[currentMoveIdx]
      : null;

  // Update evaluation bar instantly from analyzed move data when stepping through positions
  useEffect(() => {
    if (currentMoveIdx >= 0 && analyzedData?.analyzedMoves[currentMoveIdx]) {
      const move = analyzedData.analyzedMoves[currentMoveIdx];
      const cp = Math.round(move.eval * 100);
      setStockfishEval((prev) => ({
        ...prev,
        scoreCp: cp,
        evalPawns: move.eval,
        depth: move.depth || prev.depth || 16,
        mate: move.mate,
        displayEval: move.mate !== undefined
          ? (move.mate > 0 ? `M${move.mate}` : `-M${Math.abs(move.mate)}`)
          : (move.eval >= 0 ? `+${move.eval.toFixed(2)}` : move.eval.toFixed(2)),
        bestMove: move.bestMove || prev.bestMove,
      }));
    } else if (currentMoveIdx === -1) {
      setStockfishEval((prev) => ({
        ...prev,
        scoreCp: 0,
        evalPawns: 0,
        displayEval: '0.00',
      }));
    }
  }, [currentMoveIdx, analyzedData]);

  // Continuous Live Stockfish Engine Evaluation for currently selected position (when idle or progressive analysis is complete)
  useEffect(() => {
    if (isProgressivelyAnalyzing) {
      return;
    }

    const currentFen = chess.fen();
    setIsEngineEvaluating(true);

    const stopContinuousSearch = stockfish.startContinuousAnalysis(
      currentFen,
      (liveEval) => {
        setStockfishEval((prev) => {
          if (prev.depth > liveEval.depth && liveEval.depth < 10) {
            return prev;
          }
          return liveEval;
        });
        if (liveEval.depth >= 1) {
          setIsEngineEvaluating(false);
        }
      }
    );

    return () => {
      stopContinuousSearch();
    };
  }, [chess.fen(), isProgressivelyAnalyzing]);

  // Live formatted Principal Variation line in SAN notation
  const livePvSan = useMemo(() => {
    return formatPvToSan(chess.fen(), stockfishEval.rawPv);
  }, [chess.fen(), stockfishEval.rawPv]);

  // Dynamic live best move hint from Stockfish
  const activeBestMoveHint = useMemo(() => {
    if (stockfishEval.bestMove) {
      return { from: stockfishEval.bestMove.from, to: stockfishEval.bestMove.to };
    }
    if (currentMove?.bestMove) {
      return { from: currentMove.bestMove.from, to: currentMove.bestMove.to };
    }
    return null;
  }, [currentMove?.bestMove, stockfishEval.bestMove]);

  // Helper to start progressive analysis safely
  const startProgressiveGameAnalysis = useCallback((
    rawMoves: { from: string; to: string; promotion?: string }[],
    pgnText?: string
  ) => {
    if (analysisControllerRef.current) {
      analysisControllerRef.current.abort();
    }

    setIsVariationActive(false);
    setVariationOriginIdx(-1);

    const rawPgn = pgnText?.trim() || '';
    
    let movesToAnalyze = rawMoves;
    if (rawPgn) {
      try {
        const temp = new Chess();
        temp.loadPgn(rawPgn);
        const parsed = temp.history({ verbose: true }).map((h) => ({
          from: h.from,
          to: h.to,
          promotion: h.promotion,
        }));
        if (parsed.length > 0) {
          movesToAnalyze = parsed;
        }
      } catch (err) {
        console.warn('PGN parse warning:', err);
      }
    }

    const movesKey = movesToAnalyze.map((m) => `${m.from}-${m.to}`).join(',');
    const currentKey = `${rawPgn}::${movesKey}`;

    const instantResult = parseGameMovesInstantly(movesToAnalyze, rawPgn || undefined);
    setAnalyzedData(instantResult);
    setMainlineGame(instantResult);

    if (instantResult.analyzedMoves.length > 0) {
      const firstFen = instantResult.analyzedMoves[0]?.fen;
      if (firstFen) {
        setChess(new Chess(firstFen));
        setCurrentMoveIdx(0);
      }
    } else {
      setChess(new Chess());
      setCurrentMoveIdx(-1);
    }

    if (movesToAnalyze.length === 0) {
      setIsProgressivelyAnalyzing(false);
      setAnalysisProgress(100);
      return null;
    }

    setIsProgressivelyAnalyzing(true);
    setAnalysisProgress(5);

    const controller = analyzeGameProgressively(
      movesToAnalyze,
      rawPgn || undefined,
      currentKey,
      (updatedGame, currentIdx, progressPercent) => {
        setAnalyzedData(updatedGame);
        setMainlineGame(updatedGame);
        setAnalysisProgress(progressPercent);
      },
      (finalGame) => {
        setAnalyzedData(finalGame);
        setMainlineGame(finalGame);
        setAnalysisProgress(100);
        setIsProgressivelyAnalyzing(false);
      },
      { stockfishDepth: 16, movetimeMs: 150, maxBudgetMs: 45000 }
    );

    analysisControllerRef.current = controller;
    return controller;
  }, []);

  const movesSignature = useMemo(() => {
    return initialMoves.map((m) => `${m.from}-${m.to}${m.promotion || ''}`).join(',');
  }, [initialMoves]);

  const pgnSignature = initialPgn?.trim() || '';

  useEffect(() => {
    if (!pgnSignature && !movesSignature) return;

    const controller = startProgressiveGameAnalysis(initialMoves, pgnSignature);

    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [pgnSignature, movesSignature, startProgressiveGameAnalysis]);

  const jumpToMove = (index: number, movesList?: AnalyzedMove[]) => {
    try {
      const moves = movesList || analyzedData?.analyzedMoves || [];
      if (index >= 0 && moves[index] && moves[index].fen) {
        const newChess = new Chess(moves[index].fen);
        setChess(newChess);
        setCurrentMoveIdx(index);
        sound.playMove();
        return;
      }
      const newChess = new Chess();
      setChess(newChess);
      setCurrentMoveIdx(-1);
    } catch (e) {
      console.warn('Analysis jumpToMove error:', e);
    }
  };

  /**
   * Execute and deep-analyze player moves in analysis mode (branching & variations)
   */
  const handleUserMove = useCallback((m: { from: string; to: string; promotion?: string } | string) => {
    try {
      const currentBoard = new Chess(chess.fen());
      const fenBefore = chess.fen();
      const moveRes = currentBoard.move(m);

      if (!moveRes) {
        sound.playIllegal();
        return false;
      }

      if (moveRes.captured) {
        sound.playCapture();
      } else {
        sound.playMove();
      }

      const fenAfter = currentBoard.fen();

      // Check if user is simply following the mainline next move
      const nextMainlineMove = mainlineGame?.analyzedMoves[currentMoveIdx + 1];
      if (
        !isVariationActive &&
        nextMainlineMove &&
        (nextMainlineMove.san === moveRes.san ||
          (nextMainlineMove.from === moveRes.from && nextMainlineMove.to === moveRes.to))
      ) {
        jumpToMove(currentMoveIdx + 1, mainlineGame.analyzedMoves);
        return true;
      }

      // User has branched into a new move or alternative line!
      if (!isVariationActive) {
        if (!mainlineGame && analyzedData) {
          setMainlineGame(analyzedData);
        }
        setIsVariationActive(true);
        setVariationOriginIdx(currentMoveIdx);
      }

      const moveNum = Math.floor(currentBoard.history().length / 2) + 1;
      const evalBeforePawns = currentMove?.eval ?? (stockfishEval.evalPawns ?? (stockfishEval.scoreCp / 100));
      const bestMoveBeforeSan = livePvSan[0] || currentMove?.bestMoveSan || '';

      const baseMoves = (analyzedData?.analyzedMoves || []).slice(0, currentMoveIdx + 1);

      const newMoveItem: AnalyzedMove = {
        from: moveRes.from,
        to: moveRes.to,
        san: moveRes.san,
        piece: moveRes.piece as any,
        color: moveRes.color as any,
        captured: moveRes.captured as any,
        promotion: moveRes.promotion as any,
        fen: fenAfter,
        eval: evalBeforePawns,
        evalBefore: evalBeforePawns,
        isVariation: true,
        branchFromIndex: isVariationActive ? variationOriginIdx : currentMoveIdx,
      };

      const updatedMoves = [...baseMoves, newMoveItem];
      const targetMoveIdx = updatedMoves.length - 1;

      setAnalyzedData((prev) => {
        if (!prev) {
          return {
            whiteAccuracy: 95,
            blackAccuracy: 95,
            analyzedMoves: updatedMoves,
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
        return {
          ...prev,
          analyzedMoves: updatedMoves,
        };
      });

      setChess(currentBoard);
      setCurrentMoveIdx(targetMoveIdx);

      // Instantly evaluate the played move and the new position with Stockfish
      stockfish.evaluatePosition(fenAfter, 16).then((evalRes) => {
        if (evalRes) {
          const accurateEval = evalRes.evalPawns ?? +(evalRes.scoreCp / 100).toFixed(2);
          const classification = classifyEngineMove(
            new Chess(fenBefore),
            moveRes,
            Math.round(evalBeforePawns * 100),
            evalRes.scoreCp,
            bestMoveBeforeSan,
            moveNum
          );

          setAnalyzedData((prev) => {
            if (!prev) return prev;
            const updated = [...prev.analyzedMoves];
            if (updated[targetMoveIdx]) {
              updated[targetMoveIdx] = {
                ...updated[targetMoveIdx],
                eval: accurateEval,
                classification: classification.classification,
                commentary: classification.commentary,
                bestMoveSan: evalRes.bestMove ? formatPvToSan(fenAfter, [evalRes.bestMove.from + evalRes.bestMove.to])[0] : undefined,
                bestMove: evalRes.bestMove ? { from: evalRes.bestMove.from, to: evalRes.bestMove.to } : undefined,
                depth: evalRes.depth,
              };
            }
            return {
              ...prev,
              analyzedMoves: updated,
            };
          });

          setStockfishEval(evalRes);
        }
      });

      return true;
    } catch {
      sound.playIllegal();
      return false;
    }
  }, [
    chess,
    currentMoveIdx,
    mainlineGame,
    isVariationActive,
    analyzedData,
    variationOriginIdx,
    currentMove,
    stockfishEval,
    livePvSan,
  ]);

  /**
   * Return to the pristine mainline game
   */
  const handleReturnToMainline = useCallback(() => {
    if (mainlineGame) {
      setAnalyzedData(mainlineGame);
      setIsVariationActive(false);
      const returnIdx = variationOriginIdx >= 0 ? variationOriginIdx : 0;
      jumpToMove(returnIdx, mainlineGame.analyzedMoves);
    }
  }, [mainlineGame, variationOriginIdx]);

  /**
   * Play the Stockfish top recommended move directly
   */
  const handlePlayBestMove = useCallback(() => {
    if (activeBestMoveHint) {
      handleUserMove({
        from: activeBestMoveHint.from,
        to: activeBestMoveHint.to,
      });
    }
  }, [activeBestMoveHint, handleUserMove]);

  const handleImportPgn = () => {
    const pgn = customPgnInput.trim();
    if (!pgn) return;
    try {
      const importedChess = new Chess();
      importedChess.loadPgn(pgn);
      const history = importedChess.history({ verbose: true });
      const rawMoves = history.map((h) => ({
        from: h.from,
        to: h.to,
        promotion: h.promotion,
      }));

      startProgressiveGameAnalysis(rawMoves, pgn);
      setShowPgnImport(false);
      setCustomPgnInput('');
    } catch {
      alert('Invalid PGN format. Please check the text and try again.');
    }
  };

  const handleCopyPgn = () => {
    const pgn = chess.pgn();
    navigator.clipboard.writeText(pgn || '1. e4');
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const displayEval = stockfishEval.mate !== undefined
    ? `M${Math.abs(stockfishEval.mate)}`
    : `${stockfishEval.scoreCp > 0 ? '+' : ''}${(stockfishEval.scoreCp / 100).toFixed(2)}`;

  const opening = detectOpening(analyzedData?.analyzedMoves.map((m) => m.san) || []);

  const variationOriginMoveNum = variationOriginIdx >= 0 ? Math.floor(variationOriginIdx / 2) + 1 : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Toolbar */}
      <AnalysisHeader
        opening={opening}
        isProgressivelyAnalyzing={isProgressivelyAnalyzing}
        analysisProgress={analysisProgress}
        showChessCom={showChessCom}
        showPgnImport={showPgnImport}
        showBestMoveArrow={showBestMoveArrow}
        isFlipped={isFlipped}
        copiedPgn={copiedPgn}
        copiedFen={copiedFen}
        isVariationActive={isVariationActive}
        variationOriginMoveNum={variationOriginMoveNum}
        onExitAnalysis={onExitAnalysis}
        onToggleChessCom={() => {
          setShowChessCom(!showChessCom);
          if (showPgnImport) setShowPgnImport(false);
        }}
        onTogglePgnImport={() => {
          setShowPgnImport(!showPgnImport);
          if (showChessCom) setShowChessCom(false);
        }}
        onToggleBestMoveArrow={() => setShowBestMoveArrow(!showBestMoveArrow)}
        onToggleFlip={() => setIsFlipped(!isFlipped)}
        onCopyPgn={handleCopyPgn}
        onCopyFen={handleCopyFen}
        onReturnToMainline={handleReturnToMainline}
      />

      {/* Chess.com Games Explorer Drawer */}
      {showChessCom && (
        <div className="p-4 bg-slate-900 border border-sky-500/40 rounded-2xl space-y-3 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200">Import from Chess.com Public Games</span>
            <button
              onClick={() => setShowChessCom(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <ChessComExplorer
            onSelectGame={(pgn) => {
              try {
                const temp = new Chess();
                temp.loadPgn(pgn);
                const history = temp.history({ verbose: true });
                const rawMoves = history.map((h) => ({
                  from: h.from,
                  to: h.to,
                  promotion: h.promotion,
                }));
                startProgressiveGameAnalysis(rawMoves, pgn);
                setShowChessCom(false);
              } catch {
                alert('Invalid PGN format in selected Chess.com game.');
              }
            }}
          />
        </div>
      )}

      {/* PGN Import Box Drawer */}
      <PgnImportModal
        isOpen={showPgnImport}
        value={customPgnInput}
        onChange={setCustomPgnInput}
        onImport={handleImportPgn}
        onClose={() => setShowPgnImport(false)}
      />

      {/* Accuracy Summary & Move Quality Filter Ribbon */}
      {analyzedData && (
        <AnalysisClassificationSummary
          analyzedData={analyzedData}
          currentMoveIdx={currentMoveIdx}
          onJumpToMove={jumpToMove}
        />
      )}

      {/* Main Analysis Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column: Board & Engine Status HUD */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center gap-3">
          <div className="flex items-stretch gap-2 sm:gap-3 w-full max-w-[540px] justify-center">
            <div className="shrink-0 flex items-stretch">
              <EvalBar
                evalScore={stockfishEval.evalPawns ?? (stockfishEval.scoreCp / 100)}
                rawScore={stockfishEval.rawUciScore}
                displayEval={stockfishEval.displayEval}
                depth={stockfishEval.depth}
                isFlipped={isFlipped}
                isEvaluating={isEngineEvaluating}
              />
            </div>

            <div className="flex-1 min-w-0">
              <ChessBoard
                chess={chess}
                isFlipped={isFlipped}
                onMove={handleUserMove}
                lastMove={
                  currentMove ? { from: currentMove.from, to: currentMove.to } : null
                }
                moveQualityClassification={currentMove?.classification}
                bestMoveHint={activeBestMoveHint}
                showBestMoveArrow={showBestMoveArrow}
                disabled={false}
              />
            </div>
          </div>

          {/* Current Move Inspector & Quality Card */}
          <div className="w-full max-w-[540px]">
            <MoveInspector
              currentMove={currentMove}
              currentMoveIdx={currentMoveIdx}
              totalMoves={analyzedData?.analyzedMoves.length || 0}
              isProgressivelyAnalyzing={isProgressivelyAnalyzing}
              currentFen={chess.fen()}
              activeBestMoveSan={livePvSan[0]}
              isVariationActive={isVariationActive}
              onPrevMove={() => jumpToMove(Math.max(0, currentMoveIdx - 1))}
              onNextMove={() => jumpToMove(Math.min((analyzedData?.analyzedMoves.length || 1) - 1, currentMoveIdx + 1))}
              onPlayBestMove={handlePlayBestMove}
              onReturnToMainline={handleReturnToMainline}
            />
          </div>

          {/* Continuous Live Engine Evaluation HUD */}
          <div className="w-full max-w-[540px]">
            <EngineStatusHud
              stockfishEval={stockfishEval}
              livePvSan={livePvSan}
              displayEval={displayEval}
            />
          </div>
        </div>

        {/* Right Column: Move History, Opening Explorer & Game Report */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-[580px] space-y-2 w-full max-w-[540px] lg:max-w-none mx-auto">
          {/* Tab Switcher */}
          <div className="grid grid-cols-3 p-1 bg-[#0c1424] border border-slate-800 rounded-xl">
            <button
              onClick={() => setRightPanelTab('moves')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                rightPanelTab === 'moves'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/80 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Moves</span>
            </button>
            <button
              onClick={() => setRightPanelTab('explorer')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                rightPanelTab === 'explorer'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/80 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explorer</span>
            </button>
            <button
              onClick={() => setRightPanelTab('report')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                rightPanelTab === 'report'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/80 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'moves' && (
              <MoveHistory
                moves={analyzedData?.analyzedMoves || []}
                currentMoveIndex={currentMoveIdx}
                onSelectMove={(idx) => jumpToMove(idx)}
                openingName={opening?.name}
              />
            )}

            {rightPanelTab === 'explorer' && (
              <OpeningExplorer
                fen={chess.fen()}
                onSelectMove={(san) => {
                  handleUserMove(san);
                }}
                stockfishEval={stockfishEval}
                bestMoveSan={livePvSan[0]}
              />
            )}

            {rightPanelTab === 'report' && (
              <GameAnalysisReportTab analyzedData={analyzedData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
