import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { AnalyzedMove } from '../../types/chess';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { MoveHistory } from '../ChessBoard/MoveHistory';
import { analyzeGame } from '../../utils/engine';
import { detectOpening } from '../../utils/openings';
import { sound } from '../../utils/sound';
import { stockfish, StockfishEvaluation } from '../../utils/stockfishWorker';
import { 
  Copy, 
  Upload, 
  Check, 
  Cpu,
  ArrowRight,
  Sparkles,
  Zap
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
  const [analyzedData, setAnalyzedData] = useState<{
    analyzedMoves: AnalyzedMove[];
    whiteAccuracy: number;
    blackAccuracy: number;
    whiteBlunders: number;
    blackBlunders: number;
    whiteBrilliants: number;
    blackBrilliants: number;
  } | null>(null);

  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [customPgnInput, setCustomPgnInput] = useState('');
  const [showPgnImport, setShowPgnImport] = useState(false);

  // Live Stockfish Engine Evaluation State
  const [stockfishEval, setStockfishEval] = useState<StockfishEvaluation>({
    depth: 0,
    scoreCp: 0,
  });
  const [isEngineEvaluating, setIsEngineEvaluating] = useState<boolean>(false);

  // Initialize or re-analyze game
  useEffect(() => {
    if (initialPgn && initialPgn.trim()) {
      try {
        const temp = new Chess();
        temp.loadPgn(initialPgn);
        const history = temp.history({ verbose: true });
        const rawMoves = history.map((h) => ({
          from: h.from,
          to: h.to,
          promotion: h.promotion,
        }));
        const result = analyzeGame(rawMoves);
        setAnalyzedData(result);
        jumpToMove(rawMoves.length - 1, result.analyzedMoves);
        return;
      } catch {}
    }

    if (initialMoves.length > 0) {
      const result = analyzeGame(initialMoves);
      setAnalyzedData(result);
      jumpToMove(initialMoves.length - 1, result.analyzedMoves);
    } else {
      setChess(new Chess());
      setCurrentMoveIdx(-1);
      evaluateWithStockfish(new Chess().fen());
    }
  }, [initialMoves, initialPgn]);

  // Run real Stockfish evaluation whenever the position changes
  const evaluateWithStockfish = async (fen: string) => {
    setIsEngineEvaluating(true);
    try {
      const result = await stockfish.evaluatePosition(fen, 12);
      setStockfishEval(result);
    } catch (e) {
      console.warn('Stockfish eval error:', e);
    } finally {
      setIsEngineEvaluating(false);
    }
  };

  const jumpToMove = (index: number, movesList?: AnalyzedMove[]) => {
    try {
      const moves = movesList || analyzedData?.analyzedMoves || [];
      if (index >= 0 && moves[index] && moves[index].fen) {
        const newChess = new Chess(moves[index].fen);
        setChess(newChess);
        setCurrentMoveIdx(index);
        sound.playMove();
        evaluateWithStockfish(newChess.fen());
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

  // Best move hint from real Stockfish evaluation
  const bestMoveHint = stockfishEval.bestMove
    ? { from: stockfishEval.bestMove.from, to: stockfishEval.bestMove.to }
    : null;

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
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="text-sm font-bold text-slate-100">Stockfish 19 Review</span>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              NNUE WASM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPgnImport(!showPgnImport)}
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

      {/* PGN Import Box */}
      {showPgnImport && (
        <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Paste PGN Game String</span>
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
              Analyze PGN
            </button>
          </div>
        </div>
      )}

      {/* Accuracy Header if game analyzed */}
      {analyzedData && (
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
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Brilliant Moves</div>
            <div className="text-xl font-mono font-black text-cyan-400">
              💎 {analyzedData.whiteBrilliants + analyzedData.blackBrilliants}
            </div>
          </div>
          <div className="text-center p-2 rounded-xl bg-slate-950/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Blunders</div>
            <div className="text-xl font-mono font-black text-rose-400">
              ❌ {analyzedData.whiteBlunders + analyzedData.blackBlunders}
            </div>
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
                evalScore={stockfishEval.scoreCp / 100}
                isFlipped={isFlipped}
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
                    evaluateWithStockfish(test.fen());
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
              bestMoveHint={bestMoveHint}
              disabled={false}
            />
          </div>

          {/* Real Stockfish Engine Live Output Card */}
          <div className="w-full max-w-[540px] bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${isEngineEvaluating ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
                <span className="text-xs font-bold text-slate-200">Stockfish 19 Engine</span>
                <span className="text-[11px] font-mono text-slate-400">
                  (Depth {stockfishEval.depth})
                </span>
              </div>
              <span className={`text-sm font-mono font-black px-2.5 py-0.5 rounded-lg ${
                stockfishEval.scoreCp > 50
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : stockfishEval.scoreCp < -50
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {displayEval}
              </span>
            </div>

            {/* Principal Variation (PV) */}
            {stockfishEval.rawPv && stockfishEval.rawPv.length > 0 && (
              <div className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2 overflow-x-auto">
                <span className="text-amber-400 font-bold shrink-0">Best line:</span>
                <span className="text-slate-300 whitespace-nowrap">
                  {stockfishEval.rawPv.slice(0, 6).join(' ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Move History Column */}
        <div className="lg:col-span-4 h-[440px] sm:h-[540px]">
          <MoveHistory
            moves={analyzedData?.analyzedMoves || []}
            currentMoveIndex={currentMoveIdx}
            onSelectMove={(idx) => jumpToMove(idx)}
            openingName={opening?.name}
          />
        </div>
      </div>
    </div>
  );
};
