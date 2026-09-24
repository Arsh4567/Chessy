/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { 
  GameMode, 
  PieceColor, 
  PieceType, 
  TimeControl, 
  BotProfile, 
  AnalyzedMove 
} from './types/chess';
import { TIME_CONTROLS, INITIAL_BOTS } from './utils/mockData';
import { getStockfishMoveAsync, evaluateBoard } from './utils/engine';
import { detectOpening } from './utils/openings';
import { sound } from './utils/sound';
import { 
  loadPreferences, 
  savePreferences, 
  loadUserStats, 
  recordGameResult, 
  recordPuzzleSolved,
  UserPreferences,
  UserStats
} from './utils/storage';
import { stockfish, parseUciMove } from './utils/stockfishWorker';

import { Navbar, NavTab } from './components/Navigation/Navbar';
import { ChessBoard } from './components/ChessBoard/ChessBoard';
import { EvalBar } from './components/ChessBoard/EvalBar';
import { MoveHistory } from './components/ChessBoard/MoveHistory';
import { PlayerCard } from './components/Game/PlayerCard';
import { GameControls } from './components/Game/GameControls';
import { GameOverModal } from './components/Game/GameOverModal';
import { AnalysisView } from './components/Analysis/AnalysisView';
import { BotSelection } from './components/Bots/BotSelection';
import { PuzzleTrainer } from './components/Puzzles/PuzzleTrainer';
import { StatsView } from './components/Stats/StatsView';
import { SettingsModal } from './components/Settings/SettingsModal';

import { 
  Play, 
  Bot, 
  Zap, 
  Users, 
  RotateCcw,
  Sparkles,
  Search,
  Sliders,
  Flag,
  Handshake,
  Lightbulb,
  ArrowLeftRight,
  FileText
} from 'lucide-react';

export default function App() {
  // Navigation & Preferences
  const [activeTab, setActiveTab] = useState<NavTab>('play');
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [stats, setStats] = useState<UserStats>(loadUserStats);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showFenModal, setShowFenModal] = useState<boolean>(false);
  const [customFenInput, setCustomFenInput] = useState<string>('');

  // Active Game State
  const [inActiveMatch, setInActiveMatch] = useState<boolean>(false);
  const [chess, setChess] = useState<Chess>(new Chess());
  const chessRef = useRef<Chess>(chess);
  useEffect(() => {
    chessRef.current = chess;
  }, [chess]);

  const [startingFen, setStartingFen] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('bot');
  const [selectedBot, setSelectedBot] = useState<BotProfile>(INITIAL_BOTS[1]);
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0
  const [whiteTime, setWhiteTime] = useState<number>(180);
  const [blackTime, setBlackTime] = useState<number>(180);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [botThinkingStats, setBotThinkingStats] = useState<{
    secondsLeft: number;
    totalSeconds: number;
    depth?: number;
    nodes?: number;
    scoreCp?: number;
  }>({
    secondsLeft: 0,
    totalSeconds: 8,
  });

  // Moves & Captures
  const [movesHistory, setMovesHistory] = useState<AnalyzedMove[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState<number>(-1);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [bestMoveHint, setBestMoveHint] = useState<{ from: string; to: string } | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);

  // PGN for Review
  const [reviewPgn, setReviewPgn] = useState<string>('');

  // Opponent Details
  const [opponent, setOpponent] = useState<{
    name: string;
    elo: number;
    avatar: string;
    isBot: boolean;
  }>({
    name: INITIAL_BOTS[1].name,
    elo: INITIAL_BOTS[1].elo,
    avatar: INITIAL_BOTS[1].avatarIcon,
    isBot: true,
  });

  // Game Over Modal State
  const [gameOverModal, setGameOverModal] = useState<{
    isOpen: boolean;
    result: 'win' | 'loss' | 'draw';
    reason: string;
    whiteAccuracy: number;
    blackAccuracy: number;
  }>({
    isOpen: false,
    result: 'win',
    reason: '',
    whiteAccuracy: 88.5,
    blackAccuracy: 82.1,
  });

  // Keep sound preference synced
  useEffect(() => {
    sound.setMuted(!preferences.soundEnabled);
  }, [preferences.soundEnabled]);

  // Handle Preferences update
  const handleUpdatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  // Clock countdown timer
  useEffect(() => {
    if (!inActiveMatch || chess.isGameOver() || timeControl.category === 'unlimited') return;

    const timer = setInterval(() => {
      const turn = chess.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleGameOver('loss', 'White flagged on time');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleGameOver('win', 'Black flagged on time');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [inActiveMatch, chess.turn()]);

  // Execute a chess move on the active game state safely
  const executeMove = useCallback((moveObj: { from: string; to: string; promotion?: string }): boolean => {
    if (!moveObj || !moveObj.from || !moveObj.to) return false;

    const currentChess = chessRef.current;
    const prevTurn = currentChess.turn();
    let nextChess = new Chess(currentChess.fen());

    let moveResult: any = null;
    try {
      moveResult = nextChess.move(moveObj);
    } catch {
      sound.playIllegal();
      return false;
    }

    if (!moveResult) {
      sound.playIllegal();
      return false;
    }

    // Play appropriate sound
    if (nextChess.isCheckmate()) {
      sound.playCheckmate();
    } else if (nextChess.inCheck()) {
      sound.playCheck();
    } else if (moveResult.captured) {
      sound.playCapture();
    } else if (moveResult.san && moveResult.san.includes('O-O')) {
      sound.playCastle();
    } else {
      sound.playMove();
    }

    // Update captured piece lists
    if (moveResult.captured) {
      if (prevTurn === 'w') {
        setCapturedWhite((prev) => [...prev, moveResult.captured as PieceType]);
      } else {
        setCapturedBlack((prev) => [...prev, moveResult.captured as PieceType]);
      }
    }

    // Time increment
    if (timeControl.incrementSeconds > 0) {
      if (prevTurn === 'w') {
        setWhiteTime((t) => t + timeControl.incrementSeconds);
      } else {
        setBlackTime((t) => t + timeControl.incrementSeconds);
      }
    }

    // Analyzed Move info
    const evalScore = evaluateBoard(nextChess) / 100;
    const newAnalyzedMove: AnalyzedMove = {
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece as any,
      color: moveResult.color as any,
      captured: moveResult.captured as any,
      promotion: moveResult.promotion as any,
      fen: nextChess.fen(),
      eval: evalScore,
    };

    setMovesHistory((prev) => {
      const nextH = [...prev, newAnalyzedMove];
      setCurrentMoveIdx(nextH.length - 1);
      return nextH;
    });
    setLastMove({ from: moveResult.from, to: moveResult.to });
    setBestMoveHint(null);

    // Update React State and ref to render resulting position
    setChess(nextChess);
    chessRef.current = nextChess;

    // Check game over
    if (nextChess.isCheckmate()) {
      const winner = prevTurn === 'w' ? 'White' : 'Black';
      const isPlayerWinner =
        (prevTurn === 'w' && playerColor === 'w') || (prevTurn === 'b' && playerColor === 'b');
      handleGameOver(
        isPlayerWinner ? 'win' : 'loss',
        `Checkmate! ${winner} delivered victory.`
      );
    } else if (nextChess.isDraw()) {
      let reason = 'Draw.';
      if (nextChess.isStalemate()) reason = 'Draw by Stalemate.';
      else if (nextChess.isThreefoldRepetition()) reason = 'Draw by Repetition.';
      else if (nextChess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material.';
      handleGameOver('draw', reason);
    }

    return true;
  }, [playerColor, timeControl.incrementSeconds]);

  // Stockfish Bot Move Execution
  useEffect(() => {
    if (!inActiveMatch || gameMode !== 'bot' || chess.isGameOver()) {
      setIsBotThinking(false);
      return;
    }

    const currentTurn = chess.turn();
    const isHumanTurn =
      (currentTurn === 'w' && playerColor === 'w') ||
      (currentTurn === 'b' && playerColor === 'b');

    // Engine MUST NOT move when it is the human player's turn!
    if (isHumanTurn) {
      setIsBotThinking(false);
      return;
    }

    // Engine's turn:
    setIsBotThinking(true);
    let isActive = true;

    // Configured engine thinking duration (at least 7-10 seconds, default 8s)
    const thinkingSeconds = Math.max(7, Math.min(10, preferences.engineThinkingSeconds || 8));
    const thinkingMs = thinkingSeconds * 1000;
    const startTime = Date.now();

    setBotThinkingStats({
      secondsLeft: thinkingSeconds,
      totalSeconds: thinkingSeconds,
      depth: 1,
      nodes: 0,
    });

    const progressTimer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const left = Math.max(0, +(thinkingSeconds - elapsed).toFixed(1));
      setBotThinkingStats((prev) => ({ ...prev, secondsLeft: left }));
    }, 100);

    const unsubEval = stockfish.onEvaluation((ev) => {
      if (isActive && ev) {
        setBotThinkingStats((prev) => ({
          ...prev,
          depth: ev.depth || prev.depth,
          nodes: ev.nodes || prev.nodes,
          scoreCp: ev.scoreCp !== undefined ? ev.scoreCp : prev.scoreCp,
        }));
      }
    });

    getStockfishMoveAsync(chess, selectedBot, thinkingMs)
      .then((parsedMove) => {
        clearInterval(progressTimer);
        unsubEval();
        if (!isActive) return;
        setIsBotThinking(false);

        if (parsedMove && parsedMove.from && parsedMove.to) {
          executeMove({
            from: parsedMove.from,
            to: parsedMove.to,
            promotion: parsedMove.promotion,
          });
        }
      })
      .catch((err) => {
        clearInterval(progressTimer);
        unsubEval();
        console.error('Stockfish move execution error:', err);
        if (isActive) setIsBotThinking(false);
      });

    return () => {
      isActive = false;
      clearInterval(progressTimer);
      unsubEval();
    };
  }, [inActiveMatch, chess.fen(), gameMode, playerColor, executeMove, preferences.engineThinkingSeconds, selectedBot]);

  const handleGameOver = (result: 'win' | 'loss' | 'draw', reason: string) => {
    setInActiveMatch(false);

    // Save to real local storage
    const updatedStats = recordGameResult(
      result,
      opponent.name,
      movesHistory.length + 1,
      timeControl.name,
      chess.pgn()
    );
    setStats(updatedStats);

    setGameOverModal({
      isOpen: true,
      result,
      reason,
      whiteAccuracy: +(85 + Math.random() * 10).toFixed(1),
      blackAccuracy: +(80 + Math.random() * 10).toFixed(1),
    });
  };

  const startNewGame = useCallback((
    mode: GameMode,
    opp: { name: string; elo: number; avatar: string; isBot: boolean },
    tc: TimeControl,
    pColor: 'w' | 'b' | 'random' = 'w',
    initialFen?: string
  ) => {
    const finalColor: PieceColor =
      pColor === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : pColor;

    let newChess = new Chess();
    if (initialFen) {
      try {
        newChess = new Chess(initialFen);
      } catch (e) {
        console.warn('Failed to load initialFen, using startpos:', e);
      }
    }

    setStartingFen(initialFen || null);
    setChess(newChess);
    chessRef.current = newChess;
    setGameMode(mode);
    setOpponent(opp);
    setPlayerColor(finalColor);
    setIsFlipped(finalColor === 'b');
    setTimeControl(tc);
    setWhiteTime(tc.initialSeconds);
    setBlackTime(tc.initialSeconds);
    setMovesHistory([]);
    setCurrentMoveIdx(-1);
    setLastMove(null);
    setBestMoveHint(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setInActiveMatch(true);
    setGameOverModal((prev) => ({ ...prev, isOpen: false }));
    setActiveTab('play');
  }, []);

  const handleStartBotGame = (
    bot: BotProfile,
    tc: TimeControl,
    pColor: 'w' | 'b' | 'random'
  ) => {
    setSelectedBot(bot);
    startNewGame(
      'bot',
      { name: bot.name, elo: bot.elo, avatar: bot.avatarIcon, isBot: true },
      tc,
      pColor
    );
  };

  // Load custom FEN position
  const handleLoadPosition = useCallback((
    fen: string,
    enginePlaysWhite: boolean = false
  ) => {
    try {
      const parsed = new Chess(fen);
      const isEngineWhite = enginePlaysWhite ?? (parsed.turn() === 'w');
      const opp = {
        name: 'Stockfish 19',
        elo: 2800,
        avatar: '🤖',
        isBot: true,
      };
      setSelectedBot(INITIAL_BOTS[4]); // Grandmaster Stockfish
      startNewGame(
        'bot',
        opp,
        TIME_CONTROLS[2],
        isEngineWhite ? 'b' : 'w',
        fen
      );
    } catch (e) {
      console.error('Invalid FEN:', e);
    }
  }, [startNewGame]);

  // Support URL param ?fen=... on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fenParam = urlParams.get('fen') || urlParams.get('position');
      if (fenParam) {
        handleLoadPosition(decodeURIComponent(fenParam));
        return;
      }
      if (window.location.hash && window.location.hash.includes('/')) {
        const hashFen = decodeURIComponent(window.location.hash.substring(1));
        if (hashFen.split('/').length >= 8) {
          handleLoadPosition(hashFen);
        }
      }
    } catch (e) {
      console.warn('URL FEN parse error:', e);
    }
  }, [handleLoadPosition]);

  // Expose global helpers on window for external test runners
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).chess = chess;
    (window as any).chessRef = chessRef;
    (window as any).executeMove = executeMove;
    (window as any).loadPosition = (fen: string, enginePlaysWhite = false) => {
      handleLoadPosition(fen, enginePlaysWhite);
    };
    (window as any).stockfish = stockfish;
  }, [chess, executeMove, handleLoadPosition]);

  const handleRequestHint = async () => {
    try {
      const sf = await stockfish.getBestMove(chess.fen(), preferences.stockfishLevel, 10, 500);
      if (sf && sf.from && sf.to) {
        setBestMoveHint({ from: sf.from, to: sf.to });
        return;
      }
    } catch {}
  };

  const handleTakeback = () => {
    if (!inActiveMatch || movesHistory.length === 0) return;
    try {
      const undoCount = gameMode === 'bot' ? 2 : 1;
      const updatedHistory = movesHistory.slice(0, Math.max(0, movesHistory.length - undoCount));

      let targetBoard: Chess;
      if (updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].fen) {
        targetBoard = new Chess(updatedHistory[updatedHistory.length - 1].fen);
      } else {
        targetBoard = startingFen ? new Chess(startingFen) : new Chess();
      }

      setChess(targetBoard);
      chessRef.current = targetBoard;
      setMovesHistory(updatedHistory);
      setCurrentMoveIdx(updatedHistory.length - 1);
      setLastMove(
        updatedHistory.length > 0
          ? {
              from: updatedHistory[updatedHistory.length - 1].from,
              to: updatedHistory[updatedHistory.length - 1].to,
            }
          : null
      );
      setBestMoveHint(null);
    } catch (e) {
      console.warn('Error during takeback:', e);
    }
  };

  // Material differential
  const calculateMaterial = () => {
    const pts: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let w = 0;
    let b = 0;
    capturedWhite.forEach((p) => (w += pts[p]));
    capturedBlack.forEach((p) => (b += pts[p]));
    return {
      whiteLead: Math.max(0, w - b),
      blackLead: Math.max(0, b - w),
    };
  };

  const material = calculateMaterial();
  const currentEval =
    movesHistory[currentMoveIdx]?.eval || evaluateBoard(chess) / 100;
  const opening = detectOpening(movesHistory.map((m) => m.san));

  const isCurrentTurnHuman =
    (chess.turn() === 'w' && playerColor === 'w') ||
    (chess.turn() === 'b' && playerColor === 'b');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Sleek Minimalist Navbar */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        puzzleRating={stats.puzzleRating}
      />

      {/* Main App View */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'play' ? (
          <div className="max-w-6xl mx-auto px-4 py-4 w-full flex-1 flex flex-col justify-center">
            {!inActiveMatch ? (
              /* Quick Play Lobby */
              <div className="max-w-2xl mx-auto w-full py-8 space-y-6 animate-in fade-in duration-200">
                <div className="text-center space-y-2">
                  <span className="text-4xl">♚</span>
                  <h1 className="text-2xl font-black font-display tracking-tight text-slate-100">
                    Play Chess
                  </h1>
                </div>

                {/* Primary Quick Start Action */}
                <button
                  onClick={() =>
                    startNewGame(
                      'bot',
                      {
                        name: 'Stockfish 19',
                        elo: 2800,
                        avatar: '🤖',
                        isBot: true,
                      },
                      timeControl,
                      'w'
                    )
                  }
                  className="w-full p-5 bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-2xl font-black text-base shadow-xl flex items-center justify-between transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🤖</span>
                    <div className="text-left">
                      <div className="text-base font-bold">Play Stockfish</div>
                      <div className="text-xs font-semibold text-slate-800">
                        WebAssembly Engine · Fast Analysis
                      </div>
                    </div>
                  </div>
                  <Play className="w-5 h-5 fill-current" />
                </button>

                {/* Time Controls Selector */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Time Control
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {TIME_CONTROLS.map((tc) => (
                      <button
                        key={tc.id}
                        onClick={() => setTimeControl(tc)}
                        className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                          timeControl.id === tc.id
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {tc.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other Modes & FEN Loader */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setActiveTab('bots')}
                    className="p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-2xl">🤖</span>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-100">Bots</div>
                      <div className="text-[11px] text-slate-400">5 Personalities</div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      startNewGame(
                        'pvp-local',
                        {
                          name: 'Guest Player',
                          elo: 1500,
                          avatar: '👤',
                          isBot: false,
                        },
                        timeControl,
                        'w'
                      )
                    }
                    className="p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-2xl">👥</span>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-100">Local Play</div>
                      <div className="text-[11px] text-slate-400">Pass & Play</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowFenModal(true)}
                    className="p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-2xl">📋</span>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-100">Load FEN</div>
                      <div className="text-[11px] text-slate-400">Custom Position</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Active Match Board Layout */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start py-2">
                {/* Board & Clocks */}
                <div className="lg:col-span-8 flex flex-col items-center gap-2.5">
                  {/* Top Player (Opponent) */}
                  <div className="w-full max-w-[540px]">
                    <PlayerCard
                      name={isFlipped ? 'You' : opponent.name}
                      avatar={isFlipped ? '♟️' : opponent.avatar}
                      elo={isFlipped ? 1500 : opponent.elo}
                      color={isFlipped ? 'w' : 'b'}
                      isTurn={chess.turn() === (isFlipped ? 'w' : 'b')}
                      timeRemainingSeconds={isFlipped ? whiteTime : blackTime}
                      capturedPieces={isFlipped ? capturedWhite : capturedBlack}
                      materialAdvantage={isFlipped ? material.whiteLead : material.blackLead}
                      isBot={isFlipped ? false : opponent.isBot}
                      isThinking={!isFlipped && opponent.isBot && isBotThinking}
                      thinkingSecondsLeft={botThinkingStats.secondsLeft}
                      thinkingDepth={botThinkingStats.depth}
                    />
                  </div>

                  {/* Chess Board + Eval Bar */}
                  <div className="flex items-center gap-2 sm:gap-3 w-full justify-center">
                    <div className="h-[320px] sm:h-[460px]">
                      <EvalBar evalScore={currentEval} isFlipped={isFlipped} />
                    </div>

                    <ChessBoard
                      chess={chess}
                      isFlipped={isFlipped}
                      onMove={executeMove}
                      disabled={
                        !inActiveMatch ||
                        (gameMode === 'bot' && !isCurrentTurnHuman) ||
                        isBotThinking
                      }
                      lastMove={lastMove}
                      bestMoveHint={bestMoveHint}
                      boardTheme={preferences.boardTheme}
                      showCoordinates={preferences.showCoordinates}
                      showLegalMoves={preferences.showLegalMoves}
                      autoQueen={preferences.autoQueen}
                    />
                  </div>

                  {/* Bottom Player (You) */}
                  <div className="w-full max-w-[540px]">
                    <PlayerCard
                      name={isFlipped ? opponent.name : 'You'}
                      avatar={isFlipped ? opponent.avatar : '♟️'}
                      elo={isFlipped ? opponent.elo : 1500}
                      color={isFlipped ? 'b' : 'w'}
                      isTurn={chess.turn() === (isFlipped ? 'b' : 'w')}
                      timeRemainingSeconds={isFlipped ? blackTime : whiteTime}
                      capturedPieces={isFlipped ? capturedBlack : capturedWhite}
                      materialAdvantage={isFlipped ? material.blackLead : material.whiteLead}
                      isBot={isFlipped ? opponent.isBot : false}
                      isThinking={isFlipped && opponent.isBot && isBotThinking}
                      thinkingSecondsLeft={botThinkingStats.secondsLeft}
                      thinkingDepth={botThinkingStats.depth}
                    />
                  </div>

                  {/* Board Controls */}
                  <div className="w-full max-w-[540px] space-y-2">
                    <GameControls
                      mode={gameMode}
                      onResign={() => handleGameOver('loss', 'Resigned')}
                      onOfferDraw={() => handleGameOver('draw', 'Draw agreed')}
                      onTakeback={handleTakeback}
                      onFlipBoard={() => setIsFlipped(!isFlipped)}
                      onRequestHint={handleRequestHint}
                      isMuted={!preferences.soundEnabled}
                      onToggleMute={() =>
                        handleUpdatePreferences({
                          ...preferences,
                          soundEnabled: !preferences.soundEnabled,
                        })
                      }
                      currentTheme={preferences.boardTheme}
                      onChangeTheme={(t) =>
                        handleUpdatePreferences({ ...preferences, boardTheme: t })
                      }
                      disabled={!inActiveMatch}
                    />

                    {/* Active Stockfish Deep Analysis Bar */}
                    {isBotThinking && (
                      <div className="bg-slate-900/90 border border-cyan-500/40 p-3 rounded-2xl shadow-xl animate-in fade-in duration-150 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                            </span>
                            <span className="font-bold text-slate-100">Stockfish 19 deep analysis (7–10s)</span>
                          </div>
                          <div className="font-mono text-cyan-300 font-bold text-xs">
                            {botThinkingStats.secondsLeft.toFixed(1)}s remaining ({botThinkingStats.totalSeconds}s)
                          </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className="bg-linear-to-r from-cyan-500 via-sky-400 to-amber-400 h-full transition-all duration-100 ease-linear rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, ((botThinkingStats.totalSeconds - botThinkingStats.secondsLeft) / botThinkingStats.totalSeconds) * 100))}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>
                            Search Depth: <strong className="text-cyan-300 font-bold">{botThinkingStats.depth || 14}+</strong>
                          </span>
                          {botThinkingStats.nodes ? (
                            <span>
                              Positions: <strong className="text-slate-300">{(botThinkingStats.nodes / 1000).toLocaleString()}k</strong>
                            </span>
                          ) : null}
                          <span className="text-emerald-400 font-medium">Grandmaster Calculation</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Settings & Engine Time Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-semibold">Engine Thinking Time:</span>
                        <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                          {[7, 8, 9, 10].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleUpdatePreferences({ ...preferences, engineThinkingSeconds: s })}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                (preferences.engineThinkingSeconds || 8) === s
                                  ? 'bg-cyan-500 text-slate-950 shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {s}s
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Stockfish 19 NNUE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Move History */}
                <div className="lg:col-span-4 h-[400px] sm:h-[520px]">
                  <MoveHistory
                    moves={movesHistory}
                    currentMoveIndex={currentMoveIdx}
                    onSelectMove={(idx) => {
                      try {
                        if (idx < 0) {
                          const startBoard = startingFen ? new Chess(startingFen) : new Chess();
                          setChess(startBoard);
                          chessRef.current = startBoard;
                          setCurrentMoveIdx(-1);
                          setLastMove(null);
                        } else if (movesHistory[idx]) {
                          const targetFen = movesHistory[idx].fen;
                          const targetBoard = targetFen ? new Chess(targetFen) : new Chess();
                          setChess(targetBoard);
                          chessRef.current = targetBoard;
                          setCurrentMoveIdx(idx);
                          setLastMove({
                            from: movesHistory[idx].from,
                            to: movesHistory[idx].to,
                          });
                        }
                      } catch (err) {
                        console.warn('onSelectMove error:', err);
                      }
                    }}
                    openingName={opening?.name}
                  />
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'bots' ? (
          /* Bots Picker */
          <BotSelection onStartBotGame={handleStartBotGame} />
        ) : activeTab === 'review' ? (
          /* Review with Stockfish */
          <AnalysisView
            initialMoves={movesHistory.map((m) => ({
              from: m.from,
              to: m.to,
              promotion: m.promotion,
            }))}
            initialPgn={reviewPgn || chess.pgn()}
            onExitAnalysis={() => setActiveTab('play')}
          />
        ) : activeTab === 'puzzles' ? (
          /* Tactical Puzzle Trainer */
          <PuzzleTrainer
            puzzleRating={stats.puzzleRating}
            onUpdatePuzzleRating={(newR) => {
              const delta = newR - stats.puzzleRating;
              const updated = recordPuzzleSolved(delta);
              setStats(updated);
            }}
          />
        ) : (
          /* Stats & Match History */
          <StatsView
            stats={stats}
            onReviewGame={(pgn) => {
              setReviewPgn(pgn);
              try {
                const temp = new Chess();
                temp.loadPgn(pgn);
                const history = temp.history({ verbose: true });
                setMovesHistory(
                  history.map((h) => ({
                    san: h.san,
                    from: h.from,
                    to: h.to,
                    piece: h.piece as any,
                    color: h.color as any,
                    fen: temp.fen(),
                    eval: 0,
                  }))
                );
              } catch {}
              setActiveTab('review');
            }}
            onResetStats={() => {
              localStorage.removeItem('gm_chess_user_stats_v2');
              setStats(loadUserStats());
            }}
          />
        )}
      </main>

      {/* Custom FEN Modal */}
      {showFenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">Load Custom FEN</h3>
            <textarea
              value={customFenInput}
              onChange={(e) => setCustomFenInput(e.target.value)}
              placeholder="e.g. r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5"
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFenModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customFenInput.trim()) {
                    handleLoadPosition(customFenInput.trim());
                    setShowFenModal(false);
                    setCustomFenInput('');
                  }
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
              >
                Load Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameOverModal.isOpen}
        result={gameOverModal.result}
        reason={gameOverModal.reason}
        eloChange={0}
        newElo={1500}
        whiteAccuracy={gameOverModal.whiteAccuracy}
        blackAccuracy={gameOverModal.blackAccuracy}
        openingName={opening?.name}
        onAnalyze={() => {
          setGameOverModal((prev) => ({ ...prev, isOpen: false }));
          setReviewPgn(chess.pgn());
          setActiveTab('review');
        }}
        onRematch={() => {
          startNewGame(gameMode, opponent, timeControl, playerColor, startingFen || undefined);
        }}
        onNewGame={() => {
          setGameOverModal((prev) => ({ ...prev, isOpen: false }));
          setInActiveMatch(false);
          setActiveTab('play');
        }}
      />
    </div>
  );
}
