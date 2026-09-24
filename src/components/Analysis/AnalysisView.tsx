import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { AnalyzedMove } from '../../types/chess';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { MoveHistory } from '../ChessBoard/MoveHistory';
import { analyzeGame, minimax, evaluateBoard } from '../../utils/engine';
import { detectOpening } from '../../utils/openings';
import { sound } from '../../utils/sound';
import { 
  Sparkles, 
  Star, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  BookOpen, 
  Copy, 
  Download, 
  Upload, 
  Check, 
  RefreshCw,
  TrendingUp,
  Cpu
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
  const [boardTheme, setBoardTheme] = useState<'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble'>('emerald');

  // Run full game analysis
  useEffect(() => {
    if (initialMoves.length > 0) {
      const result = analyzeGame(initialMoves);
      setAnalyzedData(result);
      // Set to last move
      setCurrentMoveIdx(initialMoves.length - 1);
      jumpToMove(initialMoves.length - 1, result.analyzedMoves);
    } else {
      setChess(new Chess());
      setCurrentMoveIdx(-1);
    }
  }, [initialMoves]);

  const jumpToMove = (index: number, movesList?: AnalyzedMove[]) => {
    const moves = movesList || analyzedData?.analyzedMoves || [];
    const newChess = new Chess();
    for (let i = 0; i <= index; i++) {
      if (moves[i]) {
        newChess.move({ from: moves[i].from, to: moves[i].to, promotion: moves[i].promotion });
      }
    }
    setChess(newChess);
    setCurrentMoveIdx(index);
    sound.playMove();
  };

  const handleImportPgn = () => {
    try {
      const importedChess = new Chess();
      importedChess.loadPgn(customPgnInput.trim());
      const history = importedChess.history({ verbose: true });
      const rawMoves = history.map(h => ({ from: h.from, to: h.to, promotion: h.promotion }));
      
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

  const currentMove = currentMoveIdx >= 0 && analyzedData?.analyzedMoves ? analyzedData.analyzedMoves[currentMoveIdx] : null;
  const currentEval = currentMove ? currentMove.eval : 0.0;
  
  // Best move hint from engine for the current board state
  const bestMove = minimax(chess, 2, -Infinity, Infinity, chess.turn() === 'w').bestMove;
  const bestMoveHint = bestMove ? { from: bestMove.from, to: bestMove.to } : null;

  const opening = detectOpening(analyzedData?.analyzedMoves.map(m => m.san) || []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitAnalysis}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            ← Back to Lobby
          </button>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold font-display text-slate-100">
              Stockfish Game Review & Analysis
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPgnImport(!showPgnImport)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import PGN</span>
          </button>
          <button
            onClick={handleCopyPgn}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPgn ? 'Copied PGN' : 'Export PGN'}</span>
          </button>
          <button
            onClick={handleCopyFen}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFen ? 'Copied FEN' : 'Copy FEN'}</span>
          </button>
        </div>
      </div>

      {/* PGN Import Modal / Drawer */}
      {showPgnImport && (
        <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl space-y-3 animate-in fade-in duration-150">
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
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5..."
            rows={4}
            className="w-full bg-slate-950 text-slate-100 text-xs font-mono p-3 rounded-lg border border-slate-800 outline-none focus:border-amber-500"
          />
          <button
            onClick={handleImportPgn}
            disabled={!customPgnInput.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            Analyze PGN
          </button>
        </div>
      )}

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Board & Eval Bar */}
        <div className="lg:col-span-7 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3 w-full justify-center">
            {/* Eval Bar */}
            <div className="h-[340px] sm:h-[480px]">
              <EvalBar evalScore={currentEval} isFlipped={isFlipped} />
            </div>

            {/* Chessboard */}
            <div className="w-full max-w-[480px]">
              <ChessBoard
                chess={chess}
                isFlipped={isFlipped}
                onMove={() => false} // Read-only / navigated via moves in analysis
                disabled={true}
                lastMove={currentMove ? { from: currentMove.from, to: currentMove.to } : null}
                bestMoveHint={bestMoveHint}
                boardTheme={boardTheme}
              />
            </div>
          </div>

          {/* Engine Commentary Panel */}
          {currentMove && (
            <div className="w-full max-w-[520px] bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-slate-100">
                    Move {Math.floor(currentMoveIdx / 2) + 1}
                    {currentMoveIdx % 2 === 0 ? ' (White)' : ' (Black)'}: {currentMove.san}
                  </span>
                  <span className="text-xs uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400">
                    {currentMove.classification}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-400">
                  Eval: {currentEval > 0 ? `+${currentEval}` : currentEval}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentMove.commentary}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Accuracy Summary, Move Tree & Eval Chart */}
        <div className="lg:col-span-5 space-y-4">
          {/* Accuracy Score Card */}
          {analyzedData && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Engine Accuracy Rating</span>
                <span className="text-xs text-slate-400 font-mono">Stockfish Depth 14</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">White (Player)</span>
                  <div className="text-2xl font-mono font-extrabold text-slate-100 mt-1">
                    {analyzedData.whiteAccuracy}%
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-slate-400">
                    <span>💎 {analyzedData.whiteBrilliants}</span>
                    <span>❌ {analyzedData.whiteBlunders}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Black (Opponent)</span>
                  <div className="text-2xl font-mono font-extrabold text-slate-100 mt-1">
                    {analyzedData.blackAccuracy}%
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-slate-400">
                    <span>💎 {analyzedData.blackBrilliants}</span>
                    <span>❌ {analyzedData.blackBlunders}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Move Evaluation Graph */}
          {analyzedData && analyzedData.analyzedMoves.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-200">Evaluation Curve</span>
                </div>
                <span className="text-[10px] font-mono">Advantage vs Turns</span>
              </div>

              {/* Sparkline / Bar Graph */}
              <div className="h-16 flex items-end gap-1 px-1 bg-slate-950/80 rounded-lg border border-slate-800/80 pt-2 pb-1 overflow-x-auto">
                {analyzedData.analyzedMoves.map((m, idx) => {
                  const clamped = Math.max(-5, Math.min(5, m.eval));
                  const heightPercent = Math.min(100, Math.max(10, ((clamped + 5) / 10) * 100));
                  const isCurrent = idx === currentMoveIdx;

                  return (
                    <div
                      key={idx}
                      onClick={() => jumpToMove(idx)}
                      className={`flex-1 min-w-[6px] rounded-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-amber-400 scale-y-110 shadow-sm shadow-amber-400'
                          : m.eval >= 0
                          ? 'bg-slate-300 hover:bg-slate-100'
                          : 'bg-slate-700 hover:bg-slate-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`Move ${Math.floor(idx / 2) + 1}: ${m.san} (${m.eval > 0 ? '+' : ''}${m.eval})`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Move History Table */}
          <div className="h-[300px]">
            <MoveHistory
              moves={analyzedData?.analyzedMoves || []}
              currentMoveIndex={currentMoveIdx}
              onSelectMove={(idx) => jumpToMove(idx)}
              openingName={opening?.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
