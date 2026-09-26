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
    if (currentMove?.bestMove) {
      return { from: currentMove.bestMove.from, to: currentMove.bestMove.to };
    }
    if (stockfishEval.bestMove) {
      return { from: stockfishEval.bestMove.from, to: stockfishEval.bestMove.to };
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
        setAnalysisProgress(progressPercent);
      },
      (finalGame) => {
        setAnalyzedData(finalGame);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Toolbar */}
      <AnalysisHeader
        opening={opening}
        isProgressivelyAnalyzing={isProgressivelyAnalyzing}
        analysisProgress={analysisProgress}
        showChessCom={showChessCom}
        showPgnImport={showPgnImport}
        isFlipped={isFlipped}
        copiedPgn={copiedPgn}
        copiedFen={copiedFen}
        onExitAnalysis={onExitAnalysis}
        onToggleChessCom={() => {
          setShowChessCom(!showChessCom);
          if (showPgnImport) setShowPgnImport(false);
        }}
        onTogglePgnImport={() => {
          setShowPgnImport(!showPgnImport);
          if (showChessCom) setShowChessCom(false);
        }}
        onToggleFlip={() => setIsFlipped(!isFlipped)}
        onCopyPgn={handleCopyPgn}
        onCopyFen={handleCopyFen}
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
          <div className="flex items-stretch gap-2 sm:gap-3 w-full max-w-[480px] justify-center">
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
                onMove={(m) => {
                  try {
                    const test = new Chess(chess.fen());
                    const res = test.move(m);
                    if (res) {
                      sound.playMove();
                      setChess(test);
                      setCurrentMoveIdx(-1);
                      return true;
                    }
                  } catch {
                    sound.playIllegal();
                  }
                  return false;
                }}
                lastMove={
                  currentMove ? { from: currentMove.from, to: currentMove.to } : null
                }
                moveQualityClassification={currentMove?.classification}
                bestMoveHint={activeBestMoveHint}
                disabled={false}
              />
            </div>
          </div>

          {/* Current Move Inspector & Quality Card */}
          <MoveInspector
            currentMove={currentMove}
            currentMoveIdx={currentMoveIdx}
            totalMoves={analyzedData?.analyzedMoves.length || 0}
            isProgressivelyAnalyzing={isProgressivelyAnalyzing}
            onPrevMove={() => jumpToMove(Math.max(0, currentMoveIdx - 1))}
            onNextMove={() => jumpToMove(Math.min((analyzedData?.analyzedMoves.length || 1) - 1, currentMoveIdx + 1))}
          />

          {/* Continuous Live Engine Evaluation HUD */}
          <EngineStatusHud
            stockfishEval={stockfishEval}
            livePvSan={livePvSan}
            displayEval={displayEval}
          />
        </div>

        {/* Right Column: Move History, Opening Explorer & Game Report */}
        <div className="lg:col-span-4 flex flex-col h-[580px] space-y-2">
          {/* Tab Switcher */}
          <div className="grid grid-cols-3 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => setRightPanelTab('moves')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                rightPanelTab === 'moves'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Moves</span>
            </button>
            <button
              onClick={() => setRightPanelTab('explorer')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                rightPanelTab === 'explorer'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explorer</span>
            </button>
            <button
              onClick={() => setRightPanelTab('report')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                rightPanelTab === 'report'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
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
                  try {
                    const test = new Chess(chess.fen());
                    const res = test.move(san);
                    if (res) {
                      sound.playMove();
                      setChess(test);
                      setCurrentMoveIdx(-1);
                    }
                  } catch {
                    sound.playIllegal();
                  }
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
