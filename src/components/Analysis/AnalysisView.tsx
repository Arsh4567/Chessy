import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { AnalyzedMove, AnalyzedGame, MoveClassification } from '../../types/chess';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { MoveHistory } from '../ChessBoard/MoveHistory';
import { ChessComExplorer } from '../ChessCom/ChessComExplorer';
import { OpeningExplorer } from './OpeningExplorer';
import { analyzeGame } from '../../utils/engine';
import { detectOpening } from '../../utils/openings';
import { sound } from '../../utils/sound';
import { stockfish, StockfishEvaluation, formatPvToSan } from '../../utils/stockfishWorker';
import { MOVE_QUALITY_SIGNS } from '../../utils/moveClassification';
import { 
  Copy, 
  Upload, 
  Check, 
  Cpu,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  ChevronRight,
  ChevronLeft,
  Info,
  Activity,
  Layers,
  BookOpen
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
  const [selectedQualityFilter, setSelectedQualityFilter] = useState<MoveClassification | 'all'>('all');
  const [rightPanelTab, setRightPanelTab] = useState<'moves' | 'explorer'>('moves');

  // Live Stockfish Engine Evaluation State
  const [stockfishEval, setStockfishEval] = useState<StockfishEvaluation>({
    depth: 0,
    scoreCp: 0,
  });
  const [isEngineEvaluating, setIsEngineEvaluating] = useState<boolean>(false);

  // Continuous Live Stockfish Engine Evaluation for currently selected position
  useEffect(() => {
    const currentFen = chess.fen();
    setIsEngineEvaluating(true);

    const stopContinuousSearch = stockfish.startContinuousAnalysis(
      currentFen,
      (liveEval) => {
        setStockfishEval(liveEval);
        if (liveEval.depth >= 1) {
          setIsEngineEvaluating(false);
        }
      }
    );

    return () => {
      stopContinuousSearch();
    };
  }, [chess.fen()]);

  // Live formatted Principal Variation line in SAN notation
  const livePvSan = useMemo(() => {
    return formatPvToSan(chess.fen(), stockfishEval.rawPv);
  }, [chess.fen(), stockfishEval.rawPv]);

  // Dynamic live best move hint from Stockfish
  const activeBestMoveHint = useMemo(() => {
    if (stockfishEval.bestMove) {
      return { from: stockfishEval.bestMove.from, to: stockfishEval.bestMove.to };
    }
    return null;
  }, [stockfishEval.bestMove]);

  // Initialize or re-analyze game safely without triggering infinite render loops
  const initializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const rawPgn = initialPgn?.trim() || '';
    const movesKey = initialMoves.map(m => `${m.from}-${m.to}`).join(',');
    const currentKey = `${rawPgn}::${movesKey}`;

    if (initializedKeyRef.current === currentKey) {
      return;
    }
    initializedKeyRef.current = currentKey;

    if (rawPgn) {
      try {
        const temp = new Chess();
        temp.loadPgn(rawPgn);
        const history = temp.history({ verbose: true });
        const rawMoves = history.map((h) => ({
          from: h.from,
          to: h.to,
          promotion: h.promotion,
        }));
        const result = analyzeGame(rawMoves);
        setAnalyzedData(result);
        if (result.analyzedMoves.length > 0) {
          const lastIdx = result.analyzedMoves.length - 1;
          const targetFen = result.analyzedMoves[lastIdx]?.fen;
          if (targetFen) {
            setChess(new Chess(targetFen));
            setCurrentMoveIdx(lastIdx);
            return;
          }
        }
      } catch (err) {
        console.warn('Analysis PGN parse warning:', err);
      }
    }

    if (initialMoves.length > 0) {
      try {
        const result = analyzeGame(initialMoves);
        setAnalyzedData(result);
        const lastIdx = result.analyzedMoves.length - 1;
        if (lastIdx >= 0 && result.analyzedMoves[lastIdx]?.fen) {
          setChess(new Chess(result.analyzedMoves[lastIdx].fen));
          setCurrentMoveIdx(lastIdx);
          return;
        }
      } catch (err) {
        console.warn('Analysis initialMoves warning:', err);
      }
    }

    setChess(new Chess());
    setCurrentMoveIdx(-1);
  }, [initialMoves, initialPgn]);

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
    try {
      const importedChess = new Chess();
      importedChess.loadPgn(customPgnInput.trim());
      const history = importedChess.history({ verbose: true });
      const rawMoves = history.map((h) => ({
        from: h.from,
        to: h.to,
        promotion: h.promotion,
      }));

      const result = analyzeGame(rawMoves);
      setAnalyzedData(result);
      jumpToMove(rawMoves.length - 1, result.analyzedMoves);
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

  // Format evaluation score
  const displayEval = stockfishEval.mate !== undefined
    ? `M${Math.abs(stockfishEval.mate)}`
    : `${stockfishEval.scoreCp > 0 ? '+' : ''}${(stockfishEval.scoreCp / 100).toFixed(2)}`;

  const currentMove =
    currentMoveIdx >= 0 && analyzedData?.analyzedMoves
      ? analyzedData.analyzedMoves[currentMoveIdx]
      : null;

  const opening = detectOpening(analyzedData?.analyzedMoves.map((m) => m.san) || []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitAnalysis}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">Analysis</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowChessCom(!showChessCom);
              if (showPgnImport) setShowPgnImport(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              showChessCom
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Chess.com</span>
          </button>
          <button
            onClick={() => {
              setShowPgnImport(!showPgnImport);
              if (showChessCom) setShowChessCom(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            onClick={handleCopyPgn}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>PGN</span>
          </button>
          <button
            onClick={handleCopyFen}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>FEN</span>
          </button>
        </div>
      </div>

      {/* Chess.com Games Explorer */}
      {showChessCom && (
        <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200">Chess.com Public Games</span>
            <button
              onClick={() => setShowChessCom(false)}
              className="text-xs text-slate-400 hover:text-white"
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
                const result = analyzeGame(rawMoves);
                setAnalyzedData(result);
                jumpToMove(rawMoves.length - 1, result.analyzedMoves);
                setShowChessCom(false);
              } catch {
                alert('Invalid PGN format in selected Chess.com game.');
              }
            }}
          />
        </div>
      )}

      {/* PGN Import Box */}
      {showPgnImport && (
        <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Import PGN</span>
            <button
              onClick={() => setShowPgnImport(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <textarea
            value={customPgnInput}
            onChange={(e) => setCustomPgnInput(e.target.value)}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 ..."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
          />
          <div className="flex justify-end">
            <button
              onClick={handleImportPgn}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {/* Accuracy & Move Quality Breakdown Banner */}
      {analyzedData && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
            <div className="text-center p-2 rounded-xl bg-slate-950/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">White Accuracy</div>
              <div className="text-xl font-mono font-black text-slate-100">{analyzedData.whiteAccuracy}%</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-950/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Black Accuracy</div>
              <div className="text-xl font-mono font-black text-slate-100">{analyzedData.blackAccuracy}%</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-950/60">
              <div className="text-[10px] text-cyan-400 uppercase font-semibold flex items-center justify-center gap-1">
                <span>Brilliant</span>
                <span className="font-mono font-black text-xs px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">!!</span>
              </div>
              <div className="text-xl font-mono font-black text-cyan-400">
                {analyzedData.whiteBrilliants + analyzedData.blackBrilliants}
              </div>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-950/60">
              <div className="text-[10px] text-rose-400 uppercase font-semibold flex items-center justify-center gap-1">
                <span>Blunders</span>
                <span className="font-mono font-black text-xs px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40">??</span>
              </div>
              <div className="text-xl font-mono font-black text-rose-400">
                {analyzedData.whiteBlunders + analyzedData.blackBlunders}
              </div>
            </div>
          </div>

          {/* Detailed Quality Signs Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/60 border border-slate-800/80 p-2 rounded-2xl text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-2">Move Quality Signs:</span>
            
            {/* Brilliant !! */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'brilliant'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'brilliant');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">!!</span>
              <span className="font-semibold">Brilliant</span>
              <span className="font-mono bg-cyan-950 px-1.5 py-0.2 rounded text-[10px] text-cyan-300">
                {analyzedData.whiteBrilliants + analyzedData.blackBrilliants}
              </span>
            </button>

            {/* Best ! */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'best'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'best');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">!</span>
              <span className="font-semibold">Best</span>
              <span className="font-mono bg-emerald-950 px-1.5 py-0.2 rounded text-[10px] text-emerald-300">
                {analyzedData.whiteBests + analyzedData.blackBests}
              </span>
            </button>

            {/* Excellent ★ */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'excellent'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'excellent');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">★</span>
              <span className="font-semibold">Excellent</span>
              <span className="font-mono bg-emerald-950 px-1.5 py-0.2 rounded text-[10px] text-emerald-400">
                {analyzedData.whiteExcellents + analyzedData.blackExcellents}
              </span>
            </button>

            {/* Good ✓ */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'good'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'good');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">✓</span>
              <span className="font-semibold">Good</span>
              <span className="font-mono bg-blue-950 px-1.5 py-0.2 rounded text-[10px] text-blue-300">
                {analyzedData.whiteGoods + analyzedData.blackGoods}
              </span>
            </button>

            {/* Inaccuracy ?! */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'inaccuracy'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'inaccuracy');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">?!</span>
              <span className="font-semibold">Inaccuracy</span>
              <span className="font-mono bg-yellow-950 px-1.5 py-0.2 rounded text-[10px] text-yellow-300">
                {analyzedData.whiteInaccuracies + analyzedData.blackInaccuracies}
              </span>
            </button>

            {/* Mistake ? */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'mistake'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'mistake');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">?</span>
              <span className="font-semibold">Mistake</span>
              <span className="font-mono bg-amber-950 px-1.5 py-0.2 rounded text-[10px] text-amber-300">
                {analyzedData.whiteMistakes + analyzedData.blackMistakes}
              </span>
            </button>

            {/* Blunder ?? */}
            <button
              onClick={() => {
                const idx = analyzedData.analyzedMoves.findIndex(
                  (m, i) => i > currentMoveIdx && m.classification === 'blunder'
                );
                if (idx !== -1) jumpToMove(idx);
                else {
                  const firstIdx = analyzedData.analyzedMoves.findIndex((m) => m.classification === 'blunder');
                  if (firstIdx !== -1) jumpToMove(firstIdx);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-mono font-black text-[11px]">??</span>
              <span className="font-semibold">Blunder</span>
              <span className="font-mono bg-rose-950 px-1.5 py-0.2 rounded text-[10px] text-rose-300">
                {analyzedData.whiteBlunders + analyzedData.blackBlunders}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Review Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Board & Eval Bar */}
        <div className="lg:col-span-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 w-full justify-center">
            <div className="h-[340px] sm:h-[480px]">
              <EvalBar
                evalScore={stockfishEval.evalPawns ?? (stockfishEval.scoreCp / 100)}
                rawScore={stockfishEval.rawUciScore}
                displayEval={stockfishEval.displayEval}
                depth={stockfishEval.depth}
                isFlipped={isFlipped}
                isEvaluating={isEngineEvaluating}
              />
            </div>

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

          {/* Current Move Inspector & Engine Quality Card */}
          {currentMove && (
            <div className="w-full max-w-[540px] bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-2.5 shadow-xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Move {Math.floor(currentMoveIdx / 2) + 1}
                    {currentMove.color === 'w' ? '.' : '...'}
                  </span>
                  <span className="text-sm font-black font-mono text-slate-100 px-2 py-0.5 rounded-lg bg-slate-800">
                    {currentMove.san}
                  </span>

                  {/* Move Quality Sign Badge */}
                  {currentMove.classification && (() => {
                    const sign = MOVE_QUALITY_SIGNS[currentMove.classification];
                    if (!sign) return null;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono font-black text-xs ${sign.badgeBg} ${sign.badgeText} ${sign.badgeBorder}`}>
                        <span>{sign.symbol}</span>
                        <span className="font-sans font-bold text-[11px]">{sign.label}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => jumpToMove(Math.max(0, currentMoveIdx - 1))}
                    disabled={currentMoveIdx <= 0}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
                    title="Previous move"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => jumpToMove(Math.min((analyzedData?.analyzedMoves.length || 1) - 1, currentMoveIdx + 1))}
                    disabled={currentMoveIdx >= (analyzedData?.analyzedMoves.length || 0) - 1}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
                    title="Next move"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Commentary & Best Move suggestion */}
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <p>{currentMove.commentary || 'Stockfish engine evaluation.'}</p>
                {currentMove.bestMoveSan && currentMove.bestMoveSan !== currentMove.san && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-bold">Best engine line:</span>
                    <span className="font-mono font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
                      {currentMove.bestMoveSan}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continuous Live Engine Evaluation Dashboard */}
          <div className="w-full max-w-[540px] bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Stockfish Engine</span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>Depth</span>
                  <span className="font-black text-xs">{stockfishEval.depth > 0 ? stockfishEval.depth : '...'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {stockfishEval.nps && stockfishEval.nps > 0 && (
                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    {stockfishEval.nps >= 1000000
                      ? `${(stockfishEval.nps / 1000000).toFixed(1)}M nps`
                      : `${Math.round(stockfishEval.nps / 1000)}k nps`}
                  </span>
                )}
                <span className={`text-sm font-mono font-black px-2.5 py-0.5 rounded-lg ${
                  stockfishEval.scoreCp > 50
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : stockfishEval.scoreCp < -50
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {stockfishEval.displayEval || displayEval}
                </span>
              </div>
            </div>

            {/* Live PV (Principal Variation) Continuation */}
            {livePvSan.length > 0 && (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Live Engine PV Line
                  </span>
                  {stockfishEval.bestMove && (
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">
                      Top move: {livePvSan[0] || `${stockfishEval.bestMove.from}${stockfishEval.bestMove.to}`}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-300 flex flex-wrap gap-1.5 items-center leading-relaxed">
                  {livePvSan.slice(0, 10).map((san, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded ${
                        i === 0
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {san}
                    </span>
                  ))}
                  {livePvSan.length > 10 && (
                    <span className="text-[10px] text-slate-500 font-sans">
                      +{livePvSan.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Move History & Lichess Opening Explorer */}
        <div className="lg:col-span-4 flex flex-col h-[540px] space-y-2">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setRightPanelTab('moves')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                rightPanelTab === 'moves'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Move History</span>
            </button>
            <button
              onClick={() => setRightPanelTab('explorer')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                rightPanelTab === 'explorer'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Opening Explorer</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'moves' ? (
              <MoveHistory
                moves={analyzedData?.analyzedMoves || []}
                currentMoveIndex={currentMoveIdx}
                onSelectMove={(idx) => jumpToMove(idx)}
                openingName={opening?.name}
              />
            ) : (
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
                  } catch (err) {
                    sound.playIllegal();
                  }
                }}
                stockfishEval={stockfishEval}
                bestMoveSan={livePvSan[0]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
