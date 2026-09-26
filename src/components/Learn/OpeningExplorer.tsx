import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { 
  fetchLichessOpeningStats, 
  LichessExplorerResult, 
  LichessExplorerMove, 
  ExplorerDatabase 
} from '../../utils/lichessExplorer';
import { stockfish, StockfishEvaluation } from '../../utils/stockfishWorker';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { detectOpening } from '../../utils/openings';
import { sound } from '../../utils/sound';
import { 
  BookOpen, 
  RotateCcw, 
  ChevronLeft, 
  Database, 
  Sparkles, 
  Compass, 
  Swords, 
  Cpu, 
  Info,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  Lightbulb,
  Share2
} from 'lucide-react';

interface OpeningExplorerProps {
  initialFen?: string;
  onAnalyzeOpening?: (fen: string) => void;
  onPracticeOpening?: (pgn: string) => void;
}

interface PopularOpeningPreset {
  name: string;
  eco: string;
  moves: string[];
  description: string;
  tag: 'open' | 'semi-open' | 'closed' | 'flank';
}

const POPULAR_OPENING_PRESETS: PopularOpeningPreset[] = [
  // First Moves
  {
    name: "1. e4 (King's Pawn)",
    eco: 'B00',
    moves: ['e4'],
    description: "The most popular opening move in chess. Browse common responses: 1...c5, 1...e5, 1...e6, 1...c6...",
    tag: 'open',
  },
  {
    name: "1. d4 (Queen's Pawn)",
    eco: 'A40',
    moves: ['d4'],
    description: "Classical center control with immediate Queen file defense. Browse responses: 1...Nf6, 1...d5, 1...e6, 1...f5...",
    tag: 'closed',
  },
  {
    name: "1. c4 (English)",
    eco: 'A10',
    moves: ['c4'],
    description: "Flank strategy exerting early diagonal influence over the central d5 square.",
    tag: 'flank',
  },
  {
    name: "1. Nf3 (Réti)",
    eco: 'A04',
    moves: ['Nf3'],
    description: "Hypermodern and flexible move preserving central pawn structure choices.",
    tag: 'flank',
  },
  // Famous Systems
  {
    name: 'Sicilian Defense',
    eco: 'B20',
    moves: ['e4', 'c5'],
    description: "The most dynamic and sharpest counter to 1.e4, fighting asymmetrically for the d4 square.",
    tag: 'semi-open',
  },
  {
    name: 'French Defense',
    eco: 'C00',
    moves: ['e4', 'e6'],
    description: 'Solid and resilient counter-attacking structure targeting White’s d4 pawn center.',
    tag: 'semi-open',
  },
  {
    name: 'Caro-Kann Defense',
    eco: 'B10',
    moves: ['e4', 'c6'],
    description: 'Extremely durable pawn chain supporting ...d5 without trapping the light-squared bishop.',
    tag: 'semi-open',
  },
  {
    name: 'Ruy Lopez',
    eco: 'C60',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    description: 'The foundational master opening putting direct pressure on the c6 knight defending e5.',
    tag: 'open',
  },
  {
    name: 'Italian Game',
    eco: 'C50',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'Active minor piece development targeting the delicate f7 weakness.',
    tag: 'open',
  },
  {
    name: "Queen's Gambit",
    eco: 'D06',
    moves: ['d4', 'd5', 'c4'],
    description: 'Offering a flank pawn to deflect Black’s central d5 pawn and dominate the board.',
    tag: 'closed',
  },
  {
    name: "King's Indian",
    eco: 'E60',
    moves: ['d4', 'Nf6', 'c4', 'g6'],
    description: 'Hypermodern fighting system allowing White space before unleashing a kingside storm.',
    tag: 'closed',
  },
  {
    name: 'London System',
    eco: 'D00',
    moves: ['d4', 'd5', 'Bf4'],
    description: 'Solid, harmonious setup establishing active bishop development outside the pawn chain.',
    tag: 'closed',
  },
  {
    name: 'Scandinavian',
    eco: 'B01',
    moves: ['e4', 'd5'],
    description: 'Immediate central challenge forcing open lines on move one.',
    tag: 'semi-open',
  },
];

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  initialFen,
  onAnalyzeOpening,
  onPracticeOpening,
}) => {
  // Current board state and move history
  const [chess, setChess] = useState<Chess>(() => new Chess(initialFen || undefined));
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Selected database: Masters vs Community
  const [database, setDatabase] = useState<ExplorerDatabase>('masters');

  // Lichess API responses state
  const [explorerData, setExplorerData] = useState<LichessExplorerResult | null>(null);
  const [isLoadingResponses, setIsLoadingResponses] = useState<boolean>(false);

  // Live Stockfish Evaluation state
  const [stockfishEval, setStockfishEval] = useState<StockfishEvaluation>({
    depth: 0,
    scoreCp: 0,
    displayEval: '0.00',
  });
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // AI Move Explanation state
  const [selectedMoveExplanation, setSelectedMoveExplanation] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);

  const currentFen = chess.fen();

  // Detect current opening from played moves
  const detectedOpening = useMemo(() => {
    return detectOpening(moveHistory);
  }, [moveHistory]);

  // Fetch responses from Lichess / Masters API on position or database change
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingResponses(true);
    setSelectedMoveExplanation(null);
    setExplanationText(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetchLichessOpeningStats(currentFen, database);
        if (isCancelled) return;
        if (res.status === 'success' && res.data) {
          setExplorerData(res.data);
        } else {
          setExplorerData(null);
        }
      } catch {
        if (!isCancelled) setExplorerData(null);
      } finally {
        if (!isCancelled) setIsLoadingResponses(false);
      }
    }, 60);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentFen, database]);

  // Evaluate position with Stockfish WebAssembly
  useEffect(() => {
    let isCancelled = false;
    setIsEvaluating(true);

    stockfish.evaluatePosition(currentFen, 14, 1200, (liveEval) => {
      if (!isCancelled) setStockfishEval(liveEval);
    })
      .then((evalResult) => {
        if (!isCancelled && evalResult) setStockfishEval(evalResult);
      })
      .finally(() => {
        if (!isCancelled) setIsEvaluating(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentFen]);

  // Play a move on the board with audio feedback
  const makeMove = useCallback((move: { from: string; to: string; promotion?: string } | string) => {
    try {
      const nextChess = new Chess(chess.fen());
      const res = nextChess.move(move);
      if (res) {
        if (res.captured) {
          sound.playCapture();
        } else {
          sound.playMove();
        }
        setChess(nextChess);
        setMoveHistory((prev) => [...prev, res.san]);
        return true;
      }
    } catch {
      // illegal move
    }
    return false;
  }, [chess]);

  // Step backward 1 move
  const handleUndoMove = () => {
    if (moveHistory.length === 0) return;
    try {
      const nextChess = new Chess();
      const newHistory = moveHistory.slice(0, -1);
      for (const m of newHistory) {
        nextChess.move(m);
      }
      sound.playMove();
      setChess(nextChess);
      setMoveHistory(newHistory);
    } catch {}
  };

  // Reset to root startpos
  const handleResetToStart = () => {
    sound.playMove();
    setChess(new Chess());
    setMoveHistory([]);
  };

  // Jump to specific point in move history
  const handleJumpToMove = (index: number) => {
    try {
      const nextChess = new Chess();
      const targetHistory = moveHistory.slice(0, index + 1);
      for (const m of targetHistory) {
        nextChess.move(m);
      }
      sound.playMove();
      setChess(nextChess);
      setMoveHistory(targetHistory);
    } catch {}
  };

  // Load a popular opening preset
  const handleLoadPreset = (preset: PopularOpeningPreset) => {
    try {
      const nextChess = new Chess();
      const appliedMoves: string[] = [];
      for (const m of preset.moves) {
        const res = nextChess.move(m);
        if (res) appliedMoves.push(res.san);
      }
      sound.playMove();
      setChess(nextChess);
      setMoveHistory(appliedMoves);
    } catch {}
  };

  // Derive SAN for Stockfish's suggested best move
  const stockfishBestMoveSan = useMemo(() => {
    if (!stockfishEval?.bestMove) return null;
    const bm: any = stockfishEval.bestMove;
    if (typeof bm === 'string') return bm;
    if (bm.from && bm.to) {
      try {
        const c = new Chess(currentFen);
        const res = c.move({ from: bm.from, to: bm.to, promotion: bm.promotion });
        return res ? res.san : null;
      } catch {
        return null;
      }
    }
    return null;
  }, [stockfishEval?.bestMove, currentFen]);

  // Request Gemini move explanation
  const handleExplainMove = async (move: LichessExplorerMove, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMoveExplanation === move.san) {
      setSelectedMoveExplanation(null);
      setExplanationText(null);
      return;
    }

    setSelectedMoveExplanation(move.san);
    setIsExplaining(true);
    setExplanationText(null);

    try {
      const res = await fetch('/api/explain-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: currentFen,
          moveSan: move.san,
          openingName: move.opening?.name || detectedOpening?.name || explorerData?.opening?.name || 'Opening Variation',
          eco: move.opening?.eco || detectedOpening?.eco || explorerData?.opening?.eco || '',
          whiteWinPct: move.whiteWinPct,
          drawPct: move.drawPct,
          blackWinPct: move.blackWinPct,
          totalGames: move.totalGames,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExplanationText(data.explanation || null);
      } else {
        setExplanationText(`Master play favors ${move.san} to contest central presence, activate minor pieces harmoniously, and direct early initiative.`);
      }
    } catch {
      setExplanationText(`Master play favors ${move.san} to contest central squares and create sound tactical development.`);
    } finally {
      setIsExplaining(false);
    }
  };

  const movesList = explorerData?.moves || [];
  const totalPositionGames = explorerData?.totalGames || 0;
  const isWhiteTurn = chess.turn() === 'w';

  // Current opening display title
  const currentOpeningName = detectedOpening?.name || explorerData?.opening?.name || (moveHistory.length === 0 ? 'Starting Position' : 'Theoretical Opening');
  const currentOpeningEco = detectedOpening?.eco || explorerData?.opening?.eco || (moveHistory.length === 0 ? 'A00' : 'Book');

  // External opening links
  const chessComOpeningUrl = `https://www.chess.com/openings/${encodeURIComponent(currentOpeningName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''))}`;
  const lichessAnalysisUrl = `https://lichess.org/analysis/${encodeURIComponent(currentFen)}`;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-sky-400">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Interactive Opening Tree & Responses</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Opening Explorer & Response Navigator
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            Browse the most frequent responses to any popular opening move using live master statistics. Click any response in the table to explore deep branching lines, win percentages, and engine recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center flex-wrap">
          {onPracticeOpening && (
            <button
              onClick={() => onPracticeOpening(chess.pgn())}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 hover:border-slate-600 shadow-sm"
              title="Practice this position vs Stockfish bot"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Practice vs Bot</span>
            </button>
          )}

          {onAnalyzeOpening && (
            <button
              onClick={() => onAnalyzeOpening(chess.fen())}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/20"
              title="Open full Stockfish analysis studio"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Analyze in Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Popular Opening Starters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Popular Opening Starters (Click to inspect common responses)</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Grandmaster Systems & 1st Moves</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_OPENING_PRESETS.map((preset) => {
            const isCurrent = moveHistory.join(' ') === preset.moves.join(' ');
            return (
              <button
                key={preset.name}
                onClick={() => handleLoadPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isCurrent
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/50 shadow-sm ring-1 ring-sky-400/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60 hover:border-slate-600'
                }`}
                title={preset.description}
              >
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/40 text-slate-300">
                  {preset.moves.join(' ')}
                </span>
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center space-y-4">
            {/* Opening Name & ECO Banner */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-xs font-mono font-bold text-sky-300">
                  {currentOpeningEco}
                </span>
                <span className="font-bold text-sm text-white truncate" title={currentOpeningName}>
                  {currentOpeningName}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Flip board perspective"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                <button
                  onClick={handleUndoMove}
                  disabled={moveHistory.length === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Undo last move"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToStart}
                  disabled={moveHistory.length === 0}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Reset to starting board"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start</span>
                </button>
              </div>
            </div>

            {/* ChessBoard with Live EvalBar */}
            <div className="flex items-center justify-center gap-3 w-full max-w-[420px]">
              <div className="h-[340px] sm:h-[380px]">
                <EvalBar
                  evalScore={stockfishEval.evalPawns ?? (stockfishEval.scoreCp / 100)}
                  displayEval={stockfishEval.displayEval}
                  depth={stockfishEval.depth}
                  isEvaluating={isEvaluating}
                />
              </div>
              <div className="flex-1 max-w-[370px]">
                <ChessBoard
                  chess={chess}
                  isFlipped={isFlipped}
                  onMove={(m) => makeMove(m)}
                  boardTheme="emerald"
                  showCoordinates
                  showLegalMoves
                />
              </div>
            </div>

            {/* Turn & Status Bar */}
            <div className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isWhiteTurn ? 'bg-amber-100 ring-2 ring-amber-300/40' : 'bg-slate-900 border border-slate-600'}`} />
                <span className="font-semibold text-slate-300">
                  {isWhiteTurn ? 'White to move' : 'Black to move'}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <span>Stockfish:</span>
                <span className="font-bold text-emerald-400">{stockfishEval.displayEval}</span>
                {stockfishBestMoveSan && (
                  <span className="text-slate-500">
                    (Best: <span className="text-emerald-300 font-semibold">{stockfishBestMoveSan}</span>)
                  </span>
                )}
              </div>
            </div>

            {/* Move Breadcrumbs Trail */}
            <div className="w-full space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Variation Path:</span>
                <span className="font-mono text-slate-500">{moveHistory.length} ply</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300 flex flex-wrap gap-1.5 min-h-[38px] items-center">
                {moveHistory.length === 0 ? (
                  <span className="text-slate-500 italic">No moves played yet. Click any response on the right to start exploring!</span>
                ) : (
                  moveHistory.map((san, idx) => {
                    const moveNum = Math.floor(idx / 2) + 1;
                    const isWhite = idx % 2 === 0;
                    return (
                      <button
                        key={`${idx}_${san}`}
                        onClick={() => handleJumpToMove(idx)}
                        className="px-1.5 py-0.5 rounded hover:bg-sky-500/20 hover:text-sky-300 transition-colors cursor-pointer"
                        title={`Jump to move ${moveNum}${isWhite ? '.' : '...'}${san}`}
                      >
                        {isWhite && <span className="text-slate-500 mr-0.5">{moveNum}.</span>}
                        <span className="font-bold text-slate-200">{san}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Deep Study Links */}
            <div className="w-full pt-1 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500">External Databases:</span>
              <div className="flex items-center gap-3">
                <a
                  href={chessComOpeningUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 text-[11px]"
                >
                  <span>Chess.com Book</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-700">•</span>
                <a
                  href={lichessAnalysisUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 text-[11px]"
                >
                  <span>Lichess Analysis</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Responses Explorer Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
            {/* Header: Database Switcher & Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>{isWhiteTurn ? "White's" : "Black's"} Most Common Responses</span>
                  {isLoadingResponses && (
                    <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {totalPositionGames > 0 ? (
                    <span>Analyzed from <strong className="text-slate-200">{totalPositionGames.toLocaleString()}</strong> games in this exact position</span>
                  ) : (
                    <span>Select a move below to navigate responses</span>
                  )}
                </p>
              </div>

              {/* Database Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
                <button
                  onClick={() => setDatabase('masters')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    database === 'masters'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="FIDE Masters & Grandmaster Tournament Games (2200+ Elo)"
                >
                  FIDE Masters
                </button>
                <button
                  onClick={() => setDatabase('lichess')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    database === 'lichess'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Lichess Rated Games (Millions of Online Games)"
                >
                  Online Rated
                </button>
              </div>
            </div>

            {/* Explanation Banner (When clicked) */}
            {selectedMoveExplanation && (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-xs text-sky-100 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-sky-300">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Grandmaster Strategic Concept for {selectedMoveExplanation}:</span>
                  </span>
                  <button
                    onClick={() => setSelectedMoveExplanation(null)}
                    className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                {isExplaining ? (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <span className="w-3 h-3 border border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing grandmaster strategic purpose...</span>
                  </div>
                ) : (
                  <p className="leading-relaxed text-slate-200">{explanationText}</p>
                )}
              </div>
            )}

            {/* Responses Table */}
            {movesList.length === 0 && !isLoadingResponses ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">Position Outside Opening Book</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  No recorded master or rated games found for this exact FEN position. Use the back button or reset to re-enter theoretical opening lines.
                </p>
                <button
                  onClick={handleResetToStart}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 transition-colors cursor-pointer"
                >
                  Return to Starting Position
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pb-1 border-b border-slate-800/60">
                  <div className="col-span-4 sm:col-span-4">Move & Variation</div>
                  <div className="col-span-5 sm:col-span-5 text-center">Win / Draw / Loss %</div>
                  <div className="col-span-3 sm:col-span-3 text-right">Games & Idea</div>
                </div>

                {/* Move Rows */}
                <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                  {movesList.map((move, idx) => {
                    const isBestEngineMove = Boolean(
                      stockfishBestMoveSan && (
                        move.san === stockfishBestMoveSan ||
                        move.san.replace(/[+#x]/g, '') === stockfishBestMoveSan.replace(/[+#x]/g, '')
                      )
                    );

                    return (
                      <div
                        key={`${move.san}_${move.uci}_${idx}`}
                        onClick={() => makeMove(move.san)}
                        className={`group p-3 rounded-2xl border transition-all cursor-pointer grid grid-cols-12 gap-2 items-center ${
                          isBestEngineMove
                            ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                            : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Col 1: Move SAN, Variation name & Frequency */}
                        <div className="col-span-4 sm:col-span-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
                              {move.san}
                            </span>
                            {isBestEngineMove && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Engine Best</span>
                              </span>
                            )}
                          </div>

                          {move.opening?.name ? (
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]" title={move.opening.name}>
                              {move.opening.name}
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500">
                              Mainline response
                            </div>
                          )}

                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <span className="font-bold text-sky-400">{move.playPct}%</span>
                            <span>frequency</span>
                          </div>
                        </div>

                        {/* Col 2: Win / Draw / Loss Visual Bar */}
                        <div className="col-span-5 sm:col-span-5 space-y-1">
                          <div className="h-4 rounded-md overflow-hidden flex text-[10px] font-bold font-mono shadow-inner border border-slate-800/80">
                            {/* White Win */}
                            {move.whiteWinPct > 0 && (
                              <div
                                style={{ width: `${move.whiteWinPct}%` }}
                                className="bg-amber-100 text-slate-950 flex items-center justify-center transition-all truncate"
                                title={`White wins: ${move.whiteWinPct}%`}
                              >
                                {move.whiteWinPct >= 18 && `${move.whiteWinPct}%`}
                              </div>
                            )}

                            {/* Draw */}
                            {move.drawPct > 0 && (
                              <div
                                style={{ width: `${move.drawPct}%` }}
                                className="bg-slate-600 text-slate-200 flex items-center justify-center transition-all truncate"
                                title={`Draw: ${move.drawPct}%`}
                              >
                                {move.drawPct >= 18 && `${move.drawPct}%`}
                              </div>
                            )}

                            {/* Black Win */}
                            {move.blackWinPct > 0 && (
                              <div
                                style={{ width: `${move.blackWinPct}%` }}
                                className="bg-slate-900 text-slate-300 border-l border-slate-700/50 flex items-center justify-center transition-all truncate"
                                title={`Black wins: ${move.blackWinPct}%`}
                              >
                                {move.blackWinPct >= 18 && `${move.blackWinPct}%`}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-0.5">
                            <span>W: {move.whiteWinPct}%</span>
                            <span>D: {move.drawPct}%</span>
                            <span>B: {move.blackWinPct}%</span>
                          </div>
                        </div>

                        {/* Col 3: Games count & AI Idea Button */}
                        <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2 text-right">
                          <div className="space-y-0.5">
                            <span className="text-xs font-mono font-bold text-slate-300 block">
                              {move.totalGames.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                              Games
                            </span>
                          </div>

                          <button
                            onClick={(e) => handleExplainMove(move, e)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors shrink-0"
                            title="Why is this move played? Ask Grandmaster Coach"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
