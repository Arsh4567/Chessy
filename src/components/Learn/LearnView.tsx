import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { OPENINGS_DATABASE, OpeningInfo } from '../../utils/openings';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { LichessMasters } from '../Analysis/LichessMasters';
import { LichessData, fetchLichessData } from '../../utils/lichessExplorer';
import { stockfish, StockfishEvaluation } from '../../utils/stockfishWorker';
import { OpeningExplorer } from './OpeningExplorer';
import { 
  BookOpen, 
  Search, 
  Compass, 
  RotateCcw, 
  ChevronRight, 
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

interface LearnViewProps {
  onStartGameWithOpening?: (pgn: string) => void;
  onAnalyzeOpening?: (fen: string) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  onStartGameWithOpening,
  onAnalyzeOpening,
}) => {
  // Learn Sub-tab: 'explorer' (Interactive Opening Explorer) vs 'encyclopedia' (Curated Theory Library)
  const [activeLearnTab, setActiveLearnTab] = useState<'explorer' | 'encyclopedia'>('explorer');
  const [explorerInitialFen, setExplorerInitialFen] = useState<string | undefined>(undefined);

  // Encyclopedia states
  const [selectedOpening, setSelectedOpening] = useState<OpeningInfo>(OPENINGS_DATABASE[9]); // Italian Game
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'open' | 'semi-open' | 'closed' | 'indian' | 'flank'>('all');

  // Interactive board state for exploring the selected encyclopedia opening
  const [chess, setChess] = useState<Chess>(() => {
    const c = new Chess();
    if (OPENINGS_DATABASE[9]?.moves) {
      try {
        const moves = OPENINGS_DATABASE[9].moves.split(' ');
        for (const m of moves) c.move(m);
      } catch {}
    }
    return c;
  });

  const [stockfishEval, setStockfishEval] = useState<StockfishEvaluation>({
    depth: 0,
    scoreCp: 0,
    displayEval: '0.00',
  });
  const [lichessData, setLichessData] = useState<LichessData | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Trigger evaluation and Lichess fetch when encyclopedia chess state updates
  React.useEffect(() => {
    if (activeLearnTab !== 'encyclopedia') return;

    const fen = chess.fen();
    setIsEvaluating(true);

    fetchLichessData(fen)
      .then((res) => {
        if (res.status === 'success' && res.data) {
          setLichessData(res.data);
        } else {
          setLichessData(null);
        }
      })
      .catch(() => setLichessData(null));

    stockfish.evaluatePosition(fen, 14, 1500, (liveEval) => {
      setStockfishEval(liveEval);
    })
      .then((res) => {
        if (res) setStockfishEval(res);
      })
      .finally(() => setIsEvaluating(false));
  }, [chess.fen(), activeLearnTab]);

  // Handle opening selection in encyclopedia
  const handleSelectOpening = (op: OpeningInfo) => {
    setSelectedOpening(op);
    const newChess = new Chess();
    if (op.moves) {
      try {
        const moves = op.moves.split(' ');
        for (const m of moves) {
          newChess.move(m);
        }
      } catch {}
    }
    setChess(newChess);
  };

  // Switch to explorer with this opening preloaded
  const handleOpenInExplorer = (op: OpeningInfo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const c = new Chess();
      if (op.moves) {
        const moves = op.moves.split(' ');
        for (const m of moves) c.move(m);
      }
      setExplorerInitialFen(c.fen());
    } catch {
      setExplorerInitialFen(undefined);
    }
    setActiveLearnTab('explorer');
  };

  // Filter encyclopedia openings
  const filteredOpenings = useMemo(() => {
    return OPENINGS_DATABASE.filter((op) => {
      const matchesSearch =
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.eco.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.moves.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'open') return op.moves.startsWith('e4 e5');
      if (activeCategory === 'semi-open') return op.moves.startsWith('e4') && !op.moves.startsWith('e4 e5');
      if (activeCategory === 'closed') return op.moves.startsWith('d4 d5') || (op.moves.startsWith('d4') && !op.moves.startsWith('d4 Nf6'));
      if (activeCategory === 'indian') return op.moves.startsWith('d4 Nf6');
      if (activeCategory === 'flank') return op.moves.startsWith('c4') || op.moves.startsWith('Nf3') || op.moves.startsWith('f4') || op.moves.startsWith('b3') || op.moves.startsWith('g3');

      return true;
    });
  }, [searchQuery, activeCategory]);

  const handleResetBoard = () => {
    if (selectedOpening) {
      handleSelectOpening(selectedOpening);
    } else {
      setChess(new Chess());
    }
  };

  const handleBoardMove = (move: { from: string; to: string; promotion?: string }): boolean => {
    try {
      const next = new Chess(chess.fen());
      const res = next.move(move);
      if (res) {
        setChess(next);
        return true;
      }
    } catch {}
    return false;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Mode Segmented Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800/80">
          <button
            onClick={() => setActiveLearnTab('explorer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeLearnTab === 'explorer'
                ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Opening Explorer</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
              activeLearnTab === 'explorer' ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-300'
            }`}>
              Interactive
            </span>
          </button>

          <button
            onClick={() => setActiveLearnTab('encyclopedia')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeLearnTab === 'encyclopedia'
                ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Theory Encyclopedia</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
              activeLearnTab === 'encyclopedia' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {OPENINGS_DATABASE.length}+
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-xs text-slate-400">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>FIDE Master Database & Lichess Live Stats</span>
        </div>
      </div>

      {/* Tab 1: Opening Explorer Component */}
      {activeLearnTab === 'explorer' ? (
        <OpeningExplorer
          initialFen={explorerInitialFen}
          onAnalyzeOpening={onAnalyzeOpening}
          onPracticeOpening={onStartGameWithOpening}
        />
      ) : (
        /* Tab 2: Opening Theory & Encyclopedia */
        <div className="space-y-6">
          {/* Encyclopedia Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400">
                <BookOpen className="w-4 h-4" />
                <span>Opening Repertoire & Encyclopedia</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
                Opening Theory & Variations
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                Explore fundamental opening concepts, key strategic plans, and win rate distributions derived from over 2,000,000 FIDE Master games.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleOpenInExplorer(selectedOpening)}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/20"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore in Explorer</span>
              </button>

              {onAnalyzeOpening && (
                <button
                  onClick={() => onAnalyzeOpening(chess.fen())}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700"
                >
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>Analyze in Studio</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Grid: Left Interactive Board, Right Opening Encyclopedia */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Board & Stats Panel (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center space-y-4">
                {/* Opening Title & ECO Header */}
                <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-xs font-mono font-bold text-sky-300">
                      {selectedOpening.eco}
                    </span>
                    <span className="font-bold text-sm text-white truncate">
                      {selectedOpening.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenInExplorer(selectedOpening)}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Open this variation in Opening Explorer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Explore Tree</span>
                    </button>
                    <button
                      onClick={handleResetBoard}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Reset to selected opening line"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* ChessBoard with EvalBar */}
                <div className="flex items-center justify-center gap-3 w-full max-w-[480px]">
                  <div className="h-[380px] sm:h-[440px]">
                    <EvalBar
                      evalScore={stockfishEval.evalPawns ?? (stockfishEval.scoreCp / 100)}
                      displayEval={stockfishEval.displayEval}
                      depth={stockfishEval.depth}
                      isEvaluating={isEvaluating}
                    />
                  </div>
                  <div className="flex-1 max-w-[440px]">
                    <ChessBoard
                      chess={chess}
                      onMove={handleBoardMove}
                      boardTheme="emerald"
                      showCoordinates
                      showLegalMoves
                    />
                  </div>
                </div>

                {/* Moves played line */}
                <div className="w-full p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                  <span className="text-slate-500 font-semibold">Notation:</span>
                  <span className="truncate">{chess.history().join(' ') || '1. (Start position)'}</span>
                </div>
              </div>

              {/* Lichess Masters Explorer Breakdown for current board */}
              <LichessMasters
                lichessData={lichessData}
                stockfishEval={stockfishEval}
                currentFen={chess.fen()}
                onSelectMove={(san) => {
                  try {
                    const next = new Chess(chess.fen());
                    if (next.move(san)) setChess(next);
                  } catch {}
                }}
              />
            </div>

            {/* Right Opening Library & Category Filter (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>Opening Library ({filteredOpenings.length})</span>
                  </h2>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search openings (e.g. Sicilian, Caro-Kann, B90)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors font-sans"
                  />
                </div>

                {/* Category Filter Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'open', label: 'Open (1.e4 e5)' },
                    { id: 'semi-open', label: 'Semi-Open' },
                    { id: 'closed', label: 'Closed (1.d4)' },
                    { id: 'indian', label: 'Indian (1.d4 Nf6)' },
                    { id: 'flank', label: 'Flank' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-sky-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Openings Scroll List */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredOpenings.map((op) => {
                    const isSelected = selectedOpening.eco === op.eco && selectedOpening.name === op.name;
                    return (
                      <div
                        key={`${op.eco}_${op.name}`}
                        onClick={() => handleSelectOpening(op)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500/60 shadow-md ring-1 ring-sky-500/30'
                            : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              isSelected ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {op.eco}
                            </span>
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-sky-200' : 'text-slate-200'}`}>
                              {op.name}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {op.moves || '1. (Root position)'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleOpenInExplorer(op, e)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Explore responses in Opening Explorer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-sky-400 translate-x-0.5' : 'text-slate-600'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
