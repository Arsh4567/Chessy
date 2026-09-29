import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import { 
  ExtendedPuzzle, 
  PuzzleMode, 
  PuzzleThemeKey, 
  PUZZLE_THEMES, 
  CURATED_PUZZLES, 
  fetchLichessDailyPuzzle, 
  fetchRandomLichessPuzzle,
  getInstantNextPuzzle,
  getRandomCuratedPuzzle,
  getPuzzlesByTheme,
  generatePuzzleRushQueue,
  RushDuration
} from '../../utils/lichessPuzzles';
import { 
  Sparkles, 
  Trophy, 
  Lightbulb, 
  RotateCcw, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  Calendar, 
  Flame, 
  Target, 
  Layers, 
  Clock, 
  Heart, 
  HelpCircle, 
  Navigation, 
  Share2, 
  RefreshCw,
  ExternalLink,
  Award,
  Play,
  Check,
  Download,
  Dices
} from 'lucide-react';
import { ImportLichessModal } from './ImportLichessModal';

interface PuzzleTrainerProps {
  puzzleRating: number;
  onUpdatePuzzleRating: (newRating: number) => void;
}

export const PuzzleTrainer: React.FC<PuzzleTrainerProps> = ({
  puzzleRating,
  onUpdatePuzzleRating,
}) => {
  // Mode selection
  const [activeMode, setActiveMode] = useState<PuzzleMode>('rated');
  const [selectedTheme, setSelectedTheme] = useState<PuzzleThemeKey>('all');
  const [rushDuration, setRushDuration] = useState<RushDuration>('3min');

  // Lichess Daily Puzzle state
  const [dailyPuzzle, setDailyPuzzle] = useState<ExtendedPuzzle | null>(null);
  const [isDailyLoading, setIsDailyLoading] = useState<boolean>(false);

  // Puzzle Queue & Current Selection
  const [puzzleQueue, setPuzzleQueue] = useState<ExtendedPuzzle[]>(() => getPuzzlesByTheme('all', puzzleRating));
  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);

  const currentPuzzle: ExtendedPuzzle = activeMode === 'daily' && dailyPuzzle 
    ? dailyPuzzle 
    : (puzzleQueue[puzzleIndex % puzzleQueue.length] || CURATED_PUZZLES[0]);

  // Active Board State
  const [chess, setChess] = useState<Chess>(new Chess(currentPuzzle.fen));
  const [moveStep, setMoveStep] = useState<number>(0);
  const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [hintShown, setHintShown] = useState<boolean>(false);
  const [solutionRevealed, setSolutionRevealed] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState<boolean>(true);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Puzzle Rush States
  const [isRushActive, setIsRushActive] = useState<boolean>(false);
  const [rushTimeLeft, setRushTimeLeft] = useState<number>(180); // seconds
  const [rushStrikes, setRushStrikes] = useState<number>(0); // max 3 in survival
  const [rushScore, setRushScore] = useState<number>(0);
  const [rushHighScore, setRushHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('gm_puzzle_rush_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const rushTimerRef = useRef<any>(null);

  // Setup / Load position
  const setupPuzzleBoard = useCallback((puz: ExtendedPuzzle) => {
    try {
      const newChess = new Chess(puz.fen);
      setChess(newChess);
      setMoveStep(0);
      setStatus('playing');
      setHintShown(false);
      setSolutionRevealed(false);

      if (puz.initialOpponentMoveFromTo) {
        setLastMove(puz.initialOpponentMoveFromTo);
      } else {
        setLastMove(null);
      }
    } catch (e) {
      console.warn('Puzzle board setup fallback:', e);
      const fallback = new Chess();
      setChess(fallback);
    }
  }, []);

  // Fetch Lichess Daily Puzzle when mode switches to 'daily'
  useEffect(() => {
    if (activeMode === 'daily' && !dailyPuzzle) {
      setIsDailyLoading(true);
      fetchLichessDailyPuzzle().then((res) => {
        setIsDailyLoading(false);
        if (res) {
          setDailyPuzzle(res);
          setupPuzzleBoard(res);
        } else {
          // Curated Daily Fallback
          const fallback = CURATED_PUZZLES[0];
          setDailyPuzzle(fallback);
          setupPuzzleBoard(fallback);
        }
      });
    }
  }, [activeMode, dailyPuzzle, setupPuzzleBoard]);

  // Update puzzle queue when mode or theme changes
  useEffect(() => {
    if (activeMode === 'rush') {
      const queue = generatePuzzleRushQueue();
      setPuzzleQueue(queue);
      setPuzzleIndex(0);
      if (queue[0]) setupPuzzleBoard(queue[0]);
    } else if (activeMode === 'theme') {
      const queue = getPuzzlesByTheme(selectedTheme, puzzleRating);
      setPuzzleQueue(queue);
      setPuzzleIndex(0);
      if (queue[0]) setupPuzzleBoard(queue[0]);
    } else if (activeMode === 'findBestMove') {
      const queue = CURATED_PUZZLES.filter(p => p.rating >= 1400);
      setPuzzleQueue(queue);
      setPuzzleIndex(0);
      if (queue[0]) setupPuzzleBoard(queue[0]);
    } else if (activeMode === 'rated') {
      const instantPuz = getInstantNextPuzzle(puzzleRating);
      setPuzzleQueue([instantPuz]);
      setPuzzleIndex(0);
      setupPuzzleBoard(instantPuz);
    }
  }, [activeMode, selectedTheme, setupPuzzleBoard]);

  // Setup current puzzle whenever puzzle index or current puzzle changes
  useEffect(() => {
    if (activeMode !== 'daily' && activeMode !== 'rated') {
      setupPuzzleBoard(currentPuzzle);
    }
  }, [puzzleIndex, activeMode, currentPuzzle, setupPuzzleBoard]);

  // Puzzle Rush Timer Loop
  useEffect(() => {
    if (isRushActive && rushDuration !== 'survival') {
      rushTimerRef.current = setInterval(() => {
        setRushTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(rushTimerRef.current);
            endRush();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (rushTimerRef.current) clearInterval(rushTimerRef.current);
    };
  }, [isRushActive, rushDuration]);

  const startRush = () => {
    const queue = generatePuzzleRushQueue();
    setPuzzleQueue(queue);
    setPuzzleIndex(0);
    setRushScore(0);
    setRushStrikes(0);
    const initialTime = rushDuration === '3min' ? 180 : rushDuration === '5min' ? 300 : 0;
    setRushTimeLeft(initialTime);
    setIsRushActive(true);
    setupPuzzleBoard(queue[0]);
    sound.playMove();
  };

  const endRush = () => {
    setIsRushActive(false);
    if (rushTimerRef.current) clearInterval(rushTimerRef.current);
    sound.playGameOver();

    if (rushScore > rushHighScore) {
      setRushHighScore(rushScore);
      try {
        localStorage.setItem('gm_puzzle_rush_highscore', rushScore.toString());
      } catch {}
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Move resolution handler
  const handlePlayerMove = (moveObj: { from: string; to: string; promotion?: string }): boolean => {
    if (status !== 'playing') return false;

    let moveResult: any = null;
    const testChess = new Chess(chess.fen());
    try {
      moveResult = testChess.move(moveObj);
    } catch {
      sound.playIllegal();
      return false;
    }

    if (!moveResult) {
      sound.playIllegal();
      return false;
    }

    const expectedSan = currentPuzzle.moves[moveStep];

    // Check if move matches expected solution
    if (moveResult.san === expectedSan || (currentPuzzle.moves.length === 1 && status === 'playing')) {
      // Correct move
      if (moveResult.captured) {
        sound.playCapture();
      } else {
        sound.playMove();
      }
      setChess(testChess);
      setLastMove({ from: moveObj.from, to: moveObj.to });

      const nextStep = moveStep + 1;
      setMoveStep(nextStep);

      // Check if puzzle fully completed
      if (nextStep >= currentPuzzle.moves.length) {
        setStatus('solved');
        sound.playCheckmate();

        if (activeMode === 'rush') {
          const newScore = rushScore + 1;
          setRushScore(newScore);
          // Advance immediately to next puzzle in rush
          setTimeout(() => {
            setPuzzleIndex((i) => i + 1);
          }, 350);
        } else {
          onUpdatePuzzleRating(puzzleRating + 15);
          setStreak((s) => s + 1);
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
          } catch {}
        }
      } else {
        // Snappy, instant automatic opponent counter-move
        setTimeout(() => {
          try {
            const opponentSan = currentPuzzle.moves[nextStep];
            if (opponentSan) {
              const oppMoveResult = testChess.move(opponentSan);
              if (oppMoveResult) {
                if (oppMoveResult.captured) {
                  sound.playCapture();
                } else {
                  sound.playMove();
                }
                setChess(new Chess(testChess.fen()));
                setLastMove({ from: oppMoveResult.from, to: oppMoveResult.to });
                setMoveStep(nextStep + 1);
              }
            }
          } catch (e) {
            console.warn('Opponent counter-move execution:', e);
          }
        }, 220);
      }

      return true;
    } else {
      // Incorrect move
      sound.playIllegal();

      if (activeMode === 'rush') {
        const newStrikes = rushStrikes + 1;
        setRushStrikes(newStrikes);
        if (newStrikes >= 3) {
          endRush();
        } else {
          // Advance to next puzzle after strike in Rush
          setTimeout(() => {
            setPuzzleIndex((i) => i + 1);
          }, 250);
        }
      } else {
        setStatus('failed');
        onUpdatePuzzleRating(Math.max(400, puzzleRating - 10));
        setStreak(0);
      }
      return false;
    }
  };

  const handleFetchRandomLichess = useCallback(() => {
    const instantPuz = getInstantNextPuzzle(puzzleRating);
    setPuzzleQueue([instantPuz]);
    setPuzzleIndex(0);
    setupPuzzleBoard(instantPuz);
    const cleanId = instantPuz.id.replace('lichess-', '');
    setImportNotification(`Loaded Lichess Puzzle #${cleanId} (${instantPuz.rating} ELO)`);
    setTimeout(() => setImportNotification(null), 2500);
  }, [puzzleRating, setupPuzzleBoard]);

  const handleNextPuzzle = () => {
    if (activeMode === 'daily') {
      setIsDailyLoading(true);
      fetchLichessDailyPuzzle().then((res) => {
        setIsDailyLoading(false);
        if (res) {
          setDailyPuzzle(res);
          setupPuzzleBoard(res);
        }
      });
    } else if (activeMode === 'rated') {
      const instantPuz = getInstantNextPuzzle(puzzleRating);
      setPuzzleQueue([instantPuz]);
      setPuzzleIndex(0);
      setupPuzzleBoard(instantPuz);
    } else {
      setPuzzleIndex((i) => i + 1);
    }
  };

  const handleRetry = () => {
    setupPuzzleBoard(currentPuzzle);
  };

  const handleImportedPuzzles = (puzzles: ExtendedPuzzle[], message?: string) => {
    if (puzzles.length === 0) return;
    setPuzzleQueue(puzzles);
    setPuzzleIndex(0);
    setupPuzzleBoard(puzzles[0]);
    if (message) {
      setImportNotification(message);
      setTimeout(() => setImportNotification(null), 4000);
    }
  };

  // Convert expected solution move to a coordinate arrow hint
  const expectedNextMoveHint = useMemo(() => {
    if (status !== 'playing' || !currentPuzzle?.moves?.[moveStep]) return null;
    try {
      const boardCopy = new Chess(chess.fen());
      const expectedSan = currentPuzzle.moves[moveStep];
      const res = boardCopy.move(expectedSan);
      if (res) {
        return { from: res.from, to: res.to };
      }
    } catch {}
    return null;
  }, [chess, currentPuzzle, moveStep, status]);

  // Target player color to move
  const playerColor = currentPuzzle.playerColor || (chess.turn() === 'w' ? 'w' : 'b');
  const isFlipped = playerColor === 'b';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Mode Navigation Bar */}
      <div className="bg-[#0c1424] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
                Tactical Arena & Puzzles
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold hidden sm:inline-block">
                Lichess Integrated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Master combinations, calculate deep lines, and sharpen your chess instinct.
            </p>
          </div>
        </div>

        {/* Rating & Streak Banner */}
        <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Rating</span>
            <span className="text-base font-mono font-bold text-amber-400 tabular-nums">{puzzleRating}</span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4 pr-2">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider block">Streak</span>
            <span className="text-base font-mono font-bold text-emerald-400 tabular-nums">🔥 {streak}</span>
          </div>
          {activeMode === 'rush' && (
            <div className="text-center border-l border-slate-800 pl-4 pr-2">
              <span className="text-[10px] text-sky-400 uppercase font-semibold tracking-wider block">Best Rush</span>
              <span className="text-base font-mono font-bold text-sky-400 tabular-nums">🏆 {rushHighScore}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Selector Tabs & Importer Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[#0c1424] border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'rated' as PuzzleMode, label: 'Rated Trainer', icon: Zap, desc: 'Adaptive ELO progression' },
            { id: 'daily' as PuzzleMode, label: 'Lichess Daily', icon: Calendar, desc: 'Official Daily Puzzle' },
            { id: 'rush' as PuzzleMode, label: 'Puzzle Rush', icon: Flame, desc: 'Speed puzzle sprint' },
            { id: 'findBestMove' as PuzzleMode, label: 'Find Best Move', icon: Target, desc: 'Critical position trainer' },
            { id: 'theme' as PuzzleMode, label: 'Themes', icon: Layers, desc: 'Specific tactical motifs' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700/80 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Random Lichess Puzzle Button */}
          <button
            onClick={handleFetchRandomLichess}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Fetch a random puzzle from Lichess matching your rating"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span>Random</span>
          </button>

          {/* Import from Lichess Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-sky-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Import Puzzles directly from Lichess by ID, Player, or CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Floating Import Toast Notification */}
      {importNotification && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl flex items-center justify-between text-xs text-emerald-300 font-bold shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-400 hover:text-emerald-200 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Thematic Filter Bar (Visible in Theme Mode) */}
      {activeMode === 'theme' && (
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Select Tactical Motif:
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {PUZZLE_THEMES.find(t => t.key === selectedTheme)?.description}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {PUZZLE_THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.key;
              return (
                <button
                  key={theme.key}
                  onClick={() => setSelectedTheme(theme.key)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  <span className="text-base shrink-0">{theme.icon}</span>
                  <span className="truncate">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Puzzle Rush Control Panel (Visible in Rush Mode) */}
      {activeMode === 'rush' && (
        <div className="p-4 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>Puzzle Rush Mode</span>
                {isRushActive && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    LIVE
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                Solve as many puzzles as possible before time expires or 3 strikes!
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isRushActive ? (
              <div className="flex items-center gap-2">
                {/* Duration selector */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {(['3min', '5min', 'survival'] as RushDuration[]).map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setRushDuration(dur)}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        rushDuration === dur ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dur === '3min' ? '3 Min' : dur === '5min' ? '5 Min' : 'Survival'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={startRush}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Rush</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                {rushDuration !== 'survival' && (
                  <div className="flex items-center gap-1.5 font-mono text-base font-black text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {Math.floor(rushTimeLeft / 60)}:{(rushTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((strike) => (
                    <span
                      key={strike}
                      className={`text-base ${
                        rushStrikes >= strike ? 'text-rose-500' : 'text-slate-700'
                      }`}
                    >
                      ❌
                    </span>
                  ))}
                </div>

                <div className="text-sm font-mono font-black text-emerald-400 pl-2 border-l border-slate-800">
                  Solved: {rushScore}
                </div>

                <button
                  onClick={endRush}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer ml-2"
                >
                  Give Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Puzzle Interactive Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Chess Board */}
        <div className="lg:col-span-7 flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between max-w-[min(94vw,470px,68vh)] text-xs font-bold text-slate-300 px-1">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full border ${playerColor === 'w' ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-700'}`} />
              <span>{playerColor === 'w' ? 'White to Move' : 'Black to Move'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBestMoveArrow(!showBestMoveArrow)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                  showBestMoveArrow
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Best Move Arrow Overlay"
              >
                <Navigation className={`w-3 h-3 ${showBestMoveArrow ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Arrow</span>
              </button>
            </div>
          </div>

          <div className="w-full flex justify-center">
            <ChessBoard
              chess={chess}
              isFlipped={isFlipped}
              playerColor={playerColor}
              onMove={handlePlayerMove}
              disabled={status !== 'playing'}
              lastMove={lastMove}
              bestMoveHint={
                (hintShown || solutionRevealed) && showBestMoveArrow && expectedNextMoveHint
                  ? expectedNextMoveHint
                  : null
              }
              boardTheme="emerald"
              showCoordinates
              showLegalMoves
              autoQueen
            />
          </div>
        </div>

        {/* Right: Tactics HUD & Solution Console */}
        <div className="lg:col-span-5 flex flex-col gap-4 w-full max-w-[min(94vw,470px,68vh)] lg:max-w-none mx-auto">
          {/* Active Puzzle Info Card */}
          <div className="p-5 bg-[#0c1424] border border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    {currentPuzzle.theme || 'Tactical Challenge'}
                  </span>
                  {currentPuzzle.id && (
                    <a
                      href={
                        currentPuzzle.gameUrl ||
                        `https://lichess.org/training/${currentPuzzle.id.replace('lichess-', '').replace('daily-', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg transition-colors"
                      title="Open on Lichess"
                    >
                      <span>Lichess #{currentPuzzle.id.replace('lichess-', '').replace('daily-', '')}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <h2 className="text-base font-bold text-white mt-1.5">
                  {activeMode === 'daily'
                    ? 'Official Lichess Daily'
                    : currentPuzzle.source === 'lichess'
                    ? `Lichess Tactical Drill`
                    : `Puzzle #${puzzleIndex + 1}`}
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Rating</span>
                <span className="text-base font-mono font-black text-amber-400">
                  {currentPuzzle.rating} ELO
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              {currentPuzzle.description}
            </p>

            {/* Lichess Match Details (If Available) */}
            {currentPuzzle.whitePlayer && currentPuzzle.blackPlayer && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                <div className="truncate">
                  <span className="text-slate-200 font-semibold">{currentPuzzle.whitePlayer.name}</span>
                  <span className="font-mono text-slate-500 ml-1">({currentPuzzle.whitePlayer.rating || '?'})</span>
                </div>
                <span className="text-slate-600 px-2 font-bold">vs</span>
                <div className="truncate text-right">
                  <span className="text-slate-200 font-semibold">{currentPuzzle.blackPlayer.name}</span>
                  <span className="font-mono text-slate-500 ml-1">({currentPuzzle.blackPlayer.rating || '?'})</span>
                </div>
              </div>
            )}

            {/* Status Feedback Banner */}
            {status === 'solved' && (
              <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Brilliant! Puzzle solved (+15 Rating)</span>
                </div>
                <button
                  onClick={handleNextPuzzle}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {status === 'failed' && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-500/50 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <RotateCcw className="w-4 h-4" />
                  <span>Incorrect move (-10 Rating)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleNextPuzzle}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setHintShown(true)}
                disabled={hintShown || status !== 'playing'}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-sky-400" />
                <span>{hintShown ? 'Hint Active' : 'Hint'}</span>
              </button>

              <button
                onClick={() => setSolutionRevealed(true)}
                disabled={status === 'solved'}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Show Solution</span>
              </button>

              <button
                onClick={handleFetchRandomLichess}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                title="Fetch another random puzzle from Lichess"
              >
                <Dices className="w-3.5 h-3.5 text-amber-400" />
                <span>Random</span>
              </button>

              <button
                onClick={handleNextPuzzle}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Solution Reveal Display */}
            {solutionRevealed && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30 text-xs space-y-1.5 animate-in fade-in">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <span>Winning Continuation:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 font-mono text-slate-200">
                  {currentPuzzle.moves.map((m, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded ${
                        idx % 2 === 0
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Lichess Link */}
            {currentPuzzle.gameUrl && (
              <div className="pt-2 text-center">
                <a
                  href={currentPuzzle.gameUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-sky-400 transition-colors"
                >
                  <span>View original game on Lichess</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lichess Puzzle Import Modal */}
      <ImportLichessModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportPuzzles={handleImportedPuzzles}
      />
    </div>
  );
};
