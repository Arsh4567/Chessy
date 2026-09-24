/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { 
  GameMode, 
  PieceColor, 
  PieceType, 
  TimeControl, 
  BotProfile, 
  AnalyzedMove, 
  ChatMessage, 
  PlayerProfile, 
  Friend, 
  AppNotification, 
  TimeControlCategory 
} from './types/chess';
import { 
  TIME_CONTROLS, 
  INITIAL_BOTS, 
  INITIAL_PLAYER_PROFILE, 
  INITIAL_FRIENDS, 
  INITIAL_TOURNAMENTS, 
  INITIAL_FEED 
} from './utils/mockData';
import { getBotMove, evaluateBoard, minimax } from './utils/engine';
import { detectOpening } from './utils/openings';
import { sound } from './utils/sound';

import { Navbar } from './components/Navigation/Navbar';
import { ChessBoard } from './components/ChessBoard/ChessBoard';
import { EvalBar } from './components/ChessBoard/EvalBar';
import { MoveHistory } from './components/ChessBoard/MoveHistory';
import { PlayerCard } from './components/Game/PlayerCard';
import { GameControls } from './components/Game/GameControls';
import { InGameChat } from './components/Game/InGameChat';
import { GameOverModal } from './components/Game/GameOverModal';
import { AnalysisView } from './components/Analysis/AnalysisView';
import { BotSelection } from './components/Bots/BotSelection';
import { MatchmakingModal } from './components/Online/MatchmakingModal';
import { PuzzleTrainer } from './components/Puzzles/PuzzleTrainer';
import { EloDashboard } from './components/Dashboard/EloDashboard';
import { SocialFeed } from './components/Social/SocialFeed';
import { FriendsList } from './components/Social/FriendsList';
import { TournamentArena } from './components/Tournaments/TournamentArena';
import { NotificationCenter } from './components/Notifications/NotificationCenter';

import { 
  Play, 
  Bot, 
  Trophy, 
  Zap, 
  Users, 
  Sparkles, 
  ArrowRight,
  Flame,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';

export default function App() {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'play' | 'bots' | 'tournaments' | 'puzzles' | 'dashboard' | 'social'>('play');
  const [inActiveMatch, setInActiveMatch] = useState<boolean>(false);
  const [inAnalysisMode, setInAnalysisMode] = useState<boolean>(false);
  const [showMatchmakingModal, setShowMatchmakingModal] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // User Profile & Social Data
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(INITIAL_PLAYER_PROFILE);
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      title: 'Tournament Starting',
      message: 'Sunday Super Blitz Arena starts in 10 minutes! Prepare your opening.',
      type: 'tournament',
      timestamp: '5m ago',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Friend Challenge',
      message: 'HikaruFan_99 challenged you to a 3|0 Blitz rematch!',
      type: 'challenge',
      timestamp: '12m ago',
      read: false,
      data: { friendId: 'fr-1', timeControl: TIME_CONTROLS[2] }
    }
  ]);

  // Chess Game State
  const [chess, setChess] = useState<Chess>(new Chess());
  const [gameMode, setGameMode] = useState<GameMode>('bot');
  const [selectedBot, setSelectedBot] = useState<BotProfile>(INITIAL_BOTS[1]); // Nelson
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0 Blitz
  const [whiteTime, setWhiteTime] = useState<number>(180);
  const [blackTime, setBlackTime] = useState<number>(180);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [boardTheme, setBoardTheme] = useState<'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble'>('emerald');

  // Moves & Captures
  const [movesHistory, setMovesHistory] = useState<AnalyzedMove[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState<number>(-1);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [bestMoveHint, setBestMoveHint] = useState<{ from: string; to: string } | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);

  // Real-time Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-sys-1',
      sender: 'system',
      senderName: 'System',
      text: 'Game started. Good luck & have fun!',
      timestamp: 'Now'
    }
  ]);

  // Opponent Details
  const [opponent, setOpponent] = useState<{
    name: string;
    elo: number;
    avatar: string;
    title?: string;
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
    eloChange: number;
    newElo: number;
    whiteAccuracy: number;
    blackAccuracy: number;
  }>({
    isOpen: false,
    result: 'win',
    reason: '',
    eloChange: 0,
    newElo: 1645,
    whiteAccuracy: 88.5,
    blackAccuracy: 82.1,
  });

  // Clock countdown timer interval
  useEffect(() => {
    if (!inActiveMatch || chess.isGameOver() || timeControl.category === 'unlimited') return;

    const timer = setInterval(() => {
      const turn = chess.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleGameOver('loss', 'White ran out of time (Flagged)');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleGameOver('win', 'Black ran out of time (Flagged)');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [inActiveMatch, chess.turn()]);

  // Bot move trigger
  useEffect(() => {
    if (!inActiveMatch || gameMode !== 'bot' || chess.isGameOver()) return;

    const turn = chess.turn();
    const isBotTurn = (turn === 'w' && playerColor === 'b') || (turn === 'b' && playerColor === 'w');

    if (isBotTurn) {
      const delay = Math.floor(400 + Math.random() * 600);
      const timer = setTimeout(() => {
        const move = getBotMove(chess, selectedBot);
        if (move) {
          executeMove({ from: move.from, to: move.to, promotion: move.promotion });
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [inActiveMatch, chess.fen(), gameMode, playerColor]);

  // Execute a chess move
  const executeMove = (moveObj: { from: string; to: string; promotion?: string }): boolean => {
    const prevTurn = chess.turn();
    const testChess = new Chess(chess.fen());
    const moveResult = testChess.move(moveObj);

    if (!moveResult) {
      sound.playIllegal();
      return false;
    }

    // Play appropriate sound
    if (testChess.isCheckmate()) {
      sound.playCheckmate();
    } else if (testChess.inCheck()) {
      sound.playCheck();
    } else if (moveResult.captured) {
      sound.playCapture();
    } else if (moveResult.san.includes('O-O')) {
      sound.playCastle();
    } else {
      sound.playMove();
    }

    // Update captured piece lists
    if (moveResult.captured) {
      if (prevTurn === 'w') {
        setCapturedWhite(prev => [...prev, moveResult.captured as PieceType]);
      } else {
        setCapturedBlack(prev => [...prev, moveResult.captured as PieceType]);
      }
    }

    // Add time increment if applicable
    if (timeControl.incrementSeconds > 0) {
      if (prevTurn === 'w') {
        setWhiteTime(t => t + timeControl.incrementSeconds);
      } else {
        setBlackTime(t => t + timeControl.incrementSeconds);
      }
    }

    // Record analyzed move info
    const evalScore = evaluateBoard(testChess) / 100;
    const newAnalyzedMove: AnalyzedMove = {
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece as any,
      color: moveResult.color as any,
      captured: moveResult.captured as any,
      promotion: moveResult.promotion as any,
      fen: testChess.fen(),
      eval: evalScore,
    };

    const newHistory = [...movesHistory, newAnalyzedMove];
    setMovesHistory(newHistory);
    setCurrentMoveIdx(newHistory.length - 1);
    setLastMove({ from: moveObj.from, to: moveObj.to });
    setBestMoveHint(null);
    setChess(testChess);

    // Check for game ending conditions
    if (testChess.isCheckmate()) {
      const winner = prevTurn === 'w' ? 'White' : 'Black';
      const isPlayerWinner = (prevTurn === 'w' && playerColor === 'w') || (prevTurn === 'b' && playerColor === 'b');
      handleGameOver(
        isPlayerWinner ? 'win' : 'loss',
        `Checkmate! ${winner} delivered victory.`
      );
    } else if (testChess.isDraw()) {
      let reason = 'Draw by agreement or rule.';
      if (testChess.isStalemate()) reason = 'Draw by Stalemate.';
      else if (testChess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition.';
      else if (testChess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material.';
      handleGameOver('draw', reason);
    }

    return true;
  };

  const handleGameOver = (result: 'win' | 'loss' | 'draw', reason: string) => {
    setInActiveMatch(false);
    const eloChange = result === 'win' ? 14 : result === 'loss' ? -10 : 1;
    const newElo = playerProfile.ratingBlitz + eloChange;

    setPlayerProfile(prev => ({
      ...prev,
      ratingBlitz: newElo,
      wins: result === 'win' ? prev.wins + 1 : prev.wins,
      losses: result === 'loss' ? prev.losses + 1 : prev.losses,
      draws: result === 'draw' ? prev.draws + 1 : prev.draws,
      winStreak: result === 'win' ? prev.winStreak + 1 : 0,
      totalGames: prev.totalGames + 1,
    }));

    setGameOverModal({
      isOpen: true,
      result,
      reason,
      eloChange,
      newElo,
      whiteAccuracy: +(85 + Math.random() * 10).toFixed(1),
      blackAccuracy: +(80 + Math.random() * 10).toFixed(1),
    });
  };

  const startNewGame = (
    mode: GameMode,
    opp: { name: string; elo: number; avatar: string; title?: string; isBot: boolean },
    tc: TimeControl,
    pColor: 'w' | 'b' | 'random' = 'w'
  ) => {
    const finalColor: PieceColor = pColor === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : pColor;

    setChess(new Chess());
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
    setInAnalysisMode(false);
    setGameOverModal(prev => ({ ...prev, isOpen: false }));
    setActiveTab('play');

    setChatMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'system',
        senderName: 'System',
        text: `Match started vs ${opp.name} (${tc.name}). Good luck!`,
        timestamp: 'Now'
      }
    ]);
  };

  const handleStartBotGame = (bot: BotProfile, tc: TimeControl, pColor: 'w' | 'b' | 'random') => {
    setSelectedBot(bot);
    startNewGame('bot', { name: bot.name, elo: bot.elo, avatar: bot.avatarIcon, title: bot.title, isBot: true }, tc, pColor);
  };

  const handleOnlineMatchFound = (
    opp: { name: string; elo: number; avatar: string; title?: string },
    tc: TimeControl,
    isWhite: boolean
  ) => {
    setShowMatchmakingModal(false);
    startNewGame('online-match', { ...opp, isBot: false }, tc, isWhite ? 'w' : 'b');
  };

  const handleResign = () => {
    if (!inActiveMatch) return;
    handleGameOver('loss', 'You resigned the match.');
  };

  const handleOfferDraw = () => {
    if (!inActiveMatch) return;
    if (gameMode === 'bot') {
      // Bot decides based on evaluation
      const evalCp = evaluateBoard(chess);
      if (Math.abs(evalCp) < 100) {
        handleGameOver('draw', `${opponent.name} accepted your draw offer.`);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'opponent',
            senderName: opponent.name,
            text: 'I prefer to play on!',
            timestamp: 'Just now'
          }
        ]);
      }
    } else {
      handleGameOver('draw', 'Draw agreed by both players.');
    }
  };

  const handleTakeback = () => {
    if (!inActiveMatch || movesHistory.length === 0) return;
    const undoCount = gameMode === 'bot' ? 2 : 1;
    const newChess = new Chess();
    const updatedHistory = movesHistory.slice(0, Math.max(0, movesHistory.length - undoCount));

    for (const m of updatedHistory) {
      newChess.move({ from: m.from, to: m.to, promotion: m.promotion });
    }

    setChess(newChess);
    setMovesHistory(updatedHistory);
    setCurrentMoveIdx(updatedHistory.length - 1);
    setLastMove(updatedHistory.length > 0 ? { from: updatedHistory[updatedHistory.length - 1].from, to: updatedHistory[updatedHistory.length - 1].to } : null);
    setBestMoveHint(null);
  };

  const handleRequestHint = () => {
    const isWhite = chess.turn() === 'w';
    const result = minimax(chess, 2, -Infinity, Infinity, isWhite);
    if (result.bestMove) {
      setBestMoveHint({ from: result.bestMove.from, to: result.bestMove.to });
    }
  };

  const handleSendMessage = (text: string, isEmote?: boolean) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'player',
      senderName: playerProfile.username,
      text,
      timestamp: 'Just now',
      isEmote
    };
    setChatMessages(prev => [...prev, newMsg]);

    // Bot automated conversational response
    if (gameMode === 'bot' && !isEmote) {
      setTimeout(() => {
        const botResponses = [
          'Good move!',
          'Let’s see how this develops...',
          'Interesting tactical approach!',
          'The position is razor-sharp!'
        ];
        const reply: ChatMessage = {
          id: `msg-bot-${Date.now()}`,
          sender: 'opponent',
          senderName: opponent.name,
          text: botResponses[Math.floor(Math.random() * botResponses.length)],
          timestamp: 'Just now'
        };
        setChatMessages(prev => [...prev, reply]);
      }, 1000);
    }
  };

  // Material differential calculation
  const calculateMaterialAdvantage = () => {
    const piecePoints: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let whiteScore = 0;
    let blackScore = 0;
    capturedWhite.forEach(p => whiteScore += piecePoints[p]);
    capturedBlack.forEach(p => blackScore += piecePoints[p]);

    return {
      whiteLead: Math.max(0, whiteScore - blackScore),
      blackLead: Math.max(0, blackScore - whiteScore),
    };
  };

  const materialAdv = calculateMaterialAdvantage();
  const currentEval = movesHistory[currentMoveIdx]?.eval || (evaluateBoard(chess) / 100);
  const opening = detectOpening(movesHistory.map(m => m.san));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Strict 3-zone Header Navigation */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setInAnalysisMode(false);
          setShowNotifications(false);
        }}
        profile={playerProfile}
        notifications={notifications}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
        onQuickPlay={() => setShowMatchmakingModal(true)}
      />

      {/* Push Notification Drawer */}
      <div className="max-w-7xl mx-auto w-full relative">
        <NotificationCenter
          notifications={notifications}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
          onClearAll={() => setNotifications([])}
          onAcceptChallenge={(notif) => {
            setShowNotifications(false);
            startNewGame('online-match', { name: 'HikaruFan_99', elo: 1740, avatar: '♛', isBot: false }, TIME_CONTROLS[2], 'w');
          }}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: FULL STOCKFISH ANALYSIS VIEW */}
        {inAnalysisMode ? (
          <AnalysisView
            initialMoves={movesHistory.map(m => ({ from: m.from, to: m.to, promotion: m.promotion }))}
            onExitAnalysis={() => {
              setInAnalysisMode(false);
              setActiveTab('play');
            }}
          />
        ) : activeTab === 'play' ? (
          /* VIEW 2: ACTIVE GAME PLAYBOARD / LOBBY */
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
            {/* Quick Hero Banner if not in active match */}
            {!inActiveMatch && (
              <div className="bg-linear-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      Season IV Grandmaster Arena
                    </span>
                    <span className="text-xs text-slate-400">· Over 24,000 Live Matches Today</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-100 tracking-tight">
                    Play Chess, Master Tactics & Analyze with Stockfish
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Challenge adaptive bots from novice to GM level, compete in real-time online matchmaking, and review every game move with instant accuracy classification.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <button
                    onClick={() => setShowMatchmakingModal(true)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Quick Match</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('bots')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Choose Bot</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Match Arena Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Board & Players */}
              <div className="lg:col-span-8 flex flex-col items-center gap-3">
                {/* Top Player Card (Opponent) */}
                <div className="w-full max-w-[560px]">
                  <PlayerCard
                    name={isFlipped ? playerProfile.username : opponent.name}
                    avatar={isFlipped ? playerProfile.avatar : opponent.avatar}
                    title={isFlipped ? playerProfile.title : opponent.title}
                    elo={isFlipped ? playerProfile.ratingBlitz : opponent.elo}
                    color={isFlipped ? 'w' : 'b'}
                    isTurn={chess.turn() === (isFlipped ? 'w' : 'b')}
                    timeRemainingSeconds={isFlipped ? whiteTime : blackTime}
                    capturedPieces={isFlipped ? capturedWhite : capturedBlack}
                    materialAdvantage={isFlipped ? materialAdv.whiteLead : materialAdv.blackLead}
                    isBot={isFlipped ? false : opponent.isBot}
                  />
                </div>

                {/* Chess Board & Evaluation Bar */}
                <div className="flex items-center gap-2 sm:gap-3 w-full justify-center">
                  <div className="h-[340px] sm:h-[480px]">
                    <EvalBar evalScore={currentEval} isFlipped={isFlipped} />
                  </div>

                  <ChessBoard
                    chess={chess}
                    isFlipped={isFlipped}
                    onMove={executeMove}
                    disabled={!inActiveMatch || (gameMode === 'bot' && chess.turn() !== playerColor)}
                    lastMove={lastMove}
                    bestMoveHint={bestMoveHint}
                    boardTheme={boardTheme}
                  />
                </div>

                {/* Bottom Player Card (User) */}
                <div className="w-full max-w-[560px]">
                  <PlayerCard
                    name={isFlipped ? opponent.name : playerProfile.username}
                    avatar={isFlipped ? opponent.avatar : playerProfile.avatar}
                    title={isFlipped ? opponent.title : playerProfile.title}
                    elo={isFlipped ? opponent.elo : playerProfile.ratingBlitz}
                    color={isFlipped ? 'b' : 'w'}
                    isTurn={chess.turn() === (isFlipped ? 'b' : 'w')}
                    timeRemainingSeconds={isFlipped ? blackTime : whiteTime}
                    capturedPieces={isFlipped ? capturedBlack : capturedWhite}
                    materialAdvantage={isFlipped ? materialAdv.blackLead : materialAdv.whiteLead}
                    isBot={isFlipped ? opponent.isBot : false}
                  />
                </div>

                {/* In-Game Action Bar Controls */}
                <div className="w-full max-w-[560px]">
                  <GameControls
                    mode={gameMode}
                    onResign={handleResign}
                    onOfferDraw={handleOfferDraw}
                    onTakeback={handleTakeback}
                    onFlipBoard={() => setIsFlipped(!isFlipped)}
                    onRequestHint={handleRequestHint}
                    isMuted={isMuted}
                    onToggleMute={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      sound.setMuted(next);
                    }}
                    currentTheme={boardTheme}
                    onChangeTheme={setBoardTheme}
                    disabled={!inActiveMatch}
                  />
                </div>
              </div>

              {/* Right Column: Move History & Match Chat */}
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 h-full">
                {/* Move History Table */}
                <div className="h-[280px] sm:h-[320px]">
                  <MoveHistory
                    moves={movesHistory}
                    currentMoveIndex={currentMoveIdx}
                    onSelectMove={(idx) => {
                      if (idx < 0) {
                        setChess(new Chess());
                        setCurrentMoveIdx(-1);
                      } else if (movesHistory[idx]) {
                        const temp = new Chess();
                        for (let i = 0; i <= idx; i++) {
                          temp.move({ from: movesHistory[i].from, to: movesHistory[i].to, promotion: movesHistory[i].promotion });
                        }
                        setChess(temp);
                        setCurrentMoveIdx(idx);
                      }
                    }}
                    openingName={opening?.name}
                  />
                </div>

                {/* Match Chat System */}
                <div className="h-[260px] sm:h-[300px]">
                  <InGameChat
                    messages={chatMessages}
                    onSendMessage={handleSendMessage}
                    opponentName={opponent.name}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'bots' ? (
          /* VIEW 3: BOTS SELECTION */
          <BotSelection onStartBotGame={handleStartBotGame} />
        ) : activeTab === 'tournaments' ? (
          /* VIEW 4: CLUB TOURNAMENTS */
          <TournamentArena
            tournaments={INITIAL_TOURNAMENTS}
            onJoinTournament={(tour) => {
              setNotifications(prev => [
                {
                  id: `notif-${Date.now()}`,
                  title: 'Tournament Joined',
                  message: `You successfully registered for ${tour.title}!`,
                  type: 'tournament',
                  timestamp: 'Just now',
                  read: false
                },
                ...prev
              ]);
            }}
          />
        ) : activeTab === 'puzzles' ? (
          /* VIEW 5: TACTICAL PUZZLE TRAINER */
          <PuzzleTrainer
            puzzleRating={playerProfile.ratingPuzzle}
            onUpdatePuzzleRating={(r) => setPlayerProfile(p => ({ ...p, ratingPuzzle: r }))}
          />
        ) : activeTab === 'dashboard' ? (
          /* VIEW 6: ELO RATING DASHBOARD */
          <EloDashboard profile={playerProfile} />
        ) : (
          /* VIEW 7: SOCIAL PUBLIC FEED */
          <SocialFeed
            posts={INITIAL_FEED}
            onLoadGameInAnalysis={(pgn) => {
              try {
                const temp = new Chess();
                temp.loadPgn(pgn);
                const history = temp.history({ verbose: true });
                setMovesHistory(history.map(h => ({
                  san: h.san,
                  from: h.from,
                  to: h.to,
                  piece: h.piece as any,
                  color: h.color as any,
                  fen: temp.fen(),
                  eval: 0
                })));
                setInAnalysisMode(true);
              } catch {}
            }}
          />
        )}
      </main>

      {/* Online Matchmaking Modal */}
      <MatchmakingModal
        isOpen={showMatchmakingModal}
        onClose={() => setShowMatchmakingModal(false)}
        onMatchFound={handleOnlineMatchFound}
      />

      {/* Game Over Victory / Defeat Modal */}
      <GameOverModal
        isOpen={gameOverModal.isOpen}
        result={gameOverModal.result}
        reason={gameOverModal.reason}
        eloChange={gameOverModal.eloChange}
        newElo={gameOverModal.newElo}
        whiteAccuracy={gameOverModal.whiteAccuracy}
        blackAccuracy={gameOverModal.blackAccuracy}
        openingName={opening?.name}
        onAnalyze={() => {
          setGameOverModal(prev => ({ ...prev, isOpen: false }));
          setInAnalysisMode(true);
        }}
        onRematch={() => {
          startNewGame(gameMode, opponent, timeControl, playerColor);
        }}
        onNewGame={() => {
          setGameOverModal(prev => ({ ...prev, isOpen: false }));
          setActiveTab('play');
        }}
      />
    </div>
  );
}
