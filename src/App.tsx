/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { sound } from './utils/sound';
import { 
  loadPreferences, 
  savePreferences, 
  loadUserStats, 
  recordPuzzleSolved,
  UserPreferences,
  UserStats
} from './utils/storage';
import { stockfish } from './utils/stockfishWorker';
import { Navbar, NavTab } from './components/Navigation/Navbar';
import { GameOverModal } from './components/Game/GameOverModal';
import { ActiveMatchView } from './components/Game/ActiveMatchView';
import { CustomFenModal } from './components/Game/CustomFenModal';
import { fetchChessComRecentGames, ChessComGame, ChessComPlayer } from './utils/chessComApi';
import { useChessGame } from './hooks/useChessGame';

// Lazy loaded views to minimize initial bundle size and main-thread execution
const HomeView = React.lazy(() =>
  import('./components/Home/HomeView').then((m) => ({ default: m.HomeView }))
);
const LearnView = React.lazy(() =>
  import('./components/Learn/LearnView').then((m) => ({ default: m.LearnView }))
);
const GamesView = React.lazy(() =>
  import('./components/Games/GamesView').then((m) => ({ default: m.GamesView }))
);
const LeaderboardView = React.lazy(() =>
  import('./components/Leaderboard/LeaderboardView').then((m) => ({ default: m.LeaderboardView }))
);
const ProfileView = React.lazy(() =>
  import('./components/Profile/ProfileView').then((m) => ({ default: m.ProfileView }))
);
const FriendsView = React.lazy(() =>
  import('./components/Friends/FriendsView').then((m) => ({ default: m.FriendsView }))
);
const AnalysisView = React.lazy(() =>
  import('./components/Analysis/AnalysisView').then((m) => ({ default: m.AnalysisView }))
);
const BotSelection = React.lazy(() =>
  import('./components/Bots/BotSelection').then((m) => ({ default: m.BotSelection }))
);
const PuzzleTrainer = React.lazy(() =>
  import('./components/Puzzles/PuzzleTrainer').then((m) => ({ default: m.PuzzleTrainer }))
);
const SettingsModal = React.lazy(() =>
  import('./components/Settings/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);

export default function App() {
  // Navigation & Preferences (Home is the modern command center view)
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [stats, setStats] = useState<UserStats>(loadUserStats);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showFenModal, setShowFenModal] = useState<boolean>(false);

  // Active Game State via Hook
  const {
    chess,
    setChess,
    chessRef,
    startingFen,
    inActiveMatch,
    setInActiveMatch,
    gameMode,
    selectedBot,
    setSelectedBot,
    playerColor,
    isFlipped,
    setIsFlipped,
    timeControl,
    whiteTime,
    blackTime,
    isBotThinking,
    movesHistory,
    setMovesHistory,
    currentMoveIdx,
    setCurrentMoveIdx,
    lastMove,
    setLastMove,
    bestMoveHint,
    capturedWhite,
    capturedBlack,
    reviewPgn,
    setReviewPgn,
    opponent,
    gameOverModal,
    setGameOverModal,
    stockfishEval,
    isEvaluating,
    lichessData,
    evaluationDepth,
    evaluateCurrentPosition,
    handleDepthChange,
    executeMove,
    handleGameOver,
    startNewGame,
    handleStartBotGame,
    handleLoadPosition,
    handleRequestHint,
    handleTakeback,
    material,
    currentEval,
    opening,
    isCurrentTurnHuman,
  } = useChessGame({
    preferences,
    onUpdateStats: (newStats) => setStats(newStats),
    onNavigateTab: (tab) => setActiveTab(tab),
  });

  // Chess.com Public Games & Report State
  const [chessComGames, setChessComGames] = useState<ChessComGame[]>([]);
  const [chessComPlayer, setChessComPlayer] = useState<ChessComPlayer | null>(null);
  const [chessComUsername, setChessComUsername] = useState<string>('');
  const [isReportLoading, setIsReportLoading] = useState<boolean>(false);

  const fetchGamesForReport = async (user: string) => {
    if (!user.trim()) return;
    setIsReportLoading(true);
    setChessComUsername(user.trim());
    try {
      const res = await fetchChessComRecentGames(user.trim(), 40);
      setChessComPlayer(res.player);
      setChessComGames(res.games);
    } catch (e) {
      console.warn('Error fetching Chess.com games for report:', e);
    } finally {
      setIsReportLoading(false);
    }
  };

  // Keep sound preference synced
  useEffect(() => {
    sound.setMuted(!preferences.soundEnabled);
  }, [preferences.soundEnabled]);

  // Handle Preferences update
  const handleUpdatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

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
    (window as any).stockfishEval = stockfishEval;
    (window as any).evaluatePosition = evaluateCurrentPosition;
    (window as any).evaluationDepth = evaluationDepth;
    (window as any).setEvaluationDepth = handleDepthChange;
    (window as any).lichessData = lichessData;
  }, [chess, chessRef, executeMove, handleLoadPosition, stockfishEval, evaluateCurrentPosition, evaluationDepth, handleDepthChange, lichessData]);

  const analysisInitialMoves = useMemo(() => {
    return movesHistory.map((m) => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    }));
  }, [movesHistory]);

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
              /* Stockfish Bot Arena & Tuning Lobby */
              <BotSelection
                onStartBotGame={(bot, tc, color) => {
                  setSelectedBot(bot);
                  startNewGame(
                    'bot',
                    {
                      name: bot.name,
                      elo: bot.elo,
                      avatar: bot.avatarIcon || '🤖',
                      isBot: true,
                    },
                    tc,
                    color
                  );
                }}
              />
            ) : (
              /* Active Match Board Layout */
              <ActiveMatchView
                chess={chess}
                isFlipped={isFlipped}
                opponent={opponent}
                whiteTime={whiteTime}
                blackTime={blackTime}
                capturedWhite={capturedWhite}
                capturedBlack={capturedBlack}
                material={material}
                isBotThinking={isBotThinking}
                currentEval={currentEval}
                stockfishEval={stockfishEval}
                isEvaluating={isEvaluating}
                inActiveMatch={inActiveMatch}
                gameMode={gameMode}
                isCurrentTurnHuman={isCurrentTurnHuman}
                lastMove={lastMove}
                bestMoveHint={bestMoveHint}
                preferences={preferences}
                evaluationDepth={evaluationDepth}
                movesHistory={movesHistory}
                currentMoveIdx={currentMoveIdx}
                openingName={opening?.name}
                lichessData={lichessData}
                onExecuteMove={executeMove}
                onResign={() => handleGameOver('loss', 'Resigned')}
                onOfferDraw={() => handleGameOver('draw', 'Draw agreed')}
                onTakeback={handleTakeback}
                onFlipBoard={() => setIsFlipped(!isFlipped)}
                onRequestHint={handleRequestHint}
                onToggleMute={() =>
                  handleUpdatePreferences({
                    ...preferences,
                    soundEnabled: !preferences.soundEnabled,
                  })
                }
                onChangeTheme={(t) =>
                  handleUpdatePreferences({ ...preferences, boardTheme: t })
                }
                onDepthChange={handleDepthChange}
                onSelectHistoryMove={(idx) => {
                  try {
                    if (idx < 0) {
                      const startBoard = startingFen ? new Chess(startingFen) : new Chess();
                      setChess(startBoard);
                      chessRef.current = startBoard;
                      setCurrentMoveIdx(-1);
                      setLastMove(null);
                      evaluateCurrentPosition(startBoard.fen());
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
                      evaluateCurrentPosition(targetBoard.fen());
                    }
                  } catch (err) {
                    console.warn('onSelectMove error:', err);
                  }
                }}
              />
            )}
          </div>
        ) : activeTab === 'home' ? (
          /* Home Command Center & Hero */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Grandmaster Platform...</div>}>
            <HomeView
              stats={stats}
              onNavigate={(tab) => setActiveTab(tab)}
              onStartBotGame={() => {
                startNewGame(
                  'bot',
                  { name: selectedBot.name, elo: selectedBot.elo, avatar: selectedBot.avatarIcon || '🤖', isBot: true },
                  timeControl,
                  'w'
                );
                setActiveTab('play');
              }}
              onSolvePuzzle={() => setActiveTab('puzzles')}
            />
          </React.Suspense>
        ) : activeTab === 'learn' ? (
          /* Master Openings & Theory */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Openings...</div>}>
            <LearnView
              onAnalyzeOpening={(fen) => {
                handleLoadPosition(fen);
                setActiveTab('analyze');
              }}
              onStartGameWithOpening={(pgn) => {
                startNewGame(gameMode, opponent, timeControl, playerColor, undefined);
              }}
            />
          </React.Suspense>
        ) : activeTab === 'games' ? (
          /* Games Archive & Personal Report */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Games...</div>}>
            <GamesView
              games={chessComGames}
              player={chessComPlayer}
              username={chessComUsername}
              isLoading={isReportLoading}
              onFetchGames={fetchGamesForReport}
              onAnalyzeGame={(pgn) => {
                setReviewPgn(pgn);
                try {
                  const temp = new Chess();
                  temp.loadPgn(pgn);
                  const history = temp.history({ verbose: true });
                  const replay = new Chess();
                  setMovesHistory(
                    history.map((h) => {
                      replay.move({ from: h.from, to: h.to, promotion: h.promotion });
                      return {
                        san: h.san,
                        from: h.from,
                        to: h.to,
                        piece: h.piece as any,
                        color: h.color as any,
                        fen: replay.fen(),
                        eval: 0,
                      };
                    })
                  );
                } catch {}
                setActiveTab('analyze');
              }}
            />
          </React.Suspense>
        ) : activeTab === 'leaderboard' ? (
          /* Leaderboard & Tiers */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Leaderboard...</div>}>
            <LeaderboardView
              stats={stats}
              onPlayBot={(bot) => {
                setSelectedBot(bot);
                startNewGame(
                  'bot',
                  { name: bot.name, elo: bot.elo, avatar: bot.avatarIcon || '🤖', isBot: true },
                  timeControl,
                  'w'
                );
                setActiveTab('play');
              }}
              onSolvePuzzle={() => setActiveTab('puzzles')}
            />
          </React.Suspense>
        ) : activeTab === 'profile' ? (
          /* Profile Dossier & Match History */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Profile...</div>}>
            <ProfileView
              stats={stats}
              onReviewGame={(pgn) => {
                setReviewPgn(pgn);
                try {
                  const temp = new Chess();
                  temp.loadPgn(pgn);
                  const history = temp.history({ verbose: true });
                  const replay = new Chess();
                  setMovesHistory(
                    history.map((h) => {
                      replay.move({ from: h.from, to: h.to, promotion: h.promotion });
                      return {
                        san: h.san,
                        from: h.from,
                        to: h.to,
                        piece: h.piece as any,
                        color: h.color as any,
                        fen: replay.fen(),
                        eval: 0,
                      };
                    })
                  );
                } catch {}
                setActiveTab('analyze');
              }}
              onResetStats={() => {
                localStorage.removeItem('gm_chess_user_stats_v2');
                setStats(loadUserStats());
              }}
              onNavigateToPlay={() => setActiveTab('play')}
              onNavigateToPuzzles={() => setActiveTab('puzzles')}
            />
          </React.Suspense>
        ) : activeTab === 'friends' ? (
          /* Friends Pass & Play */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Pass & Play...</div>}>
            <FriendsView
              onStartLocalGame={(tc, side, fen) => {
                startNewGame(
                  'pvp-local',
                  { name: 'Friend', elo: 1500, avatar: '👤', isBot: false },
                  tc,
                  side,
                  fen
                );
                setActiveTab('play');
              }}
            />
          </React.Suspense>
        ) : activeTab === 'analyze' ? (
          /* Review with Stockfish */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Analysis...</div>}>
            <AnalysisView
              initialMoves={analysisInitialMoves}
              initialPgn={reviewPgn || chess.pgn()}
              onExitAnalysis={() => setActiveTab('play')}
            />
          </React.Suspense>
        ) : activeTab === 'puzzles' ? (
          /* Tactical Puzzle Trainer */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading Puzzles...</div>}>
            <PuzzleTrainer
              puzzleRating={stats.puzzleRating}
              onUpdatePuzzleRating={(newR) => {
                const delta = newR - stats.puzzleRating;
                const updated = recordPuzzleSolved(delta);
                setStats(updated);
              }}
            />
          </React.Suspense>
        ) : (
          /* Fallback Home */
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-mono"><span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" /> Loading...</div>}>
            <HomeView
              stats={stats}
              onNavigate={(tab) => setActiveTab(tab)}
              onStartBotGame={() => {
                startNewGame(
                  'bot',
                  { name: selectedBot.name, elo: selectedBot.elo, avatar: selectedBot.avatarIcon || '🤖', isBot: true },
                  timeControl,
                  'w'
                );
                setActiveTab('play');
              }}
              onSolvePuzzle={() => setActiveTab('puzzles')}
            />
          </React.Suspense>
        )}
      </main>

      {/* Custom FEN Modal */}
      <CustomFenModal
        isOpen={showFenModal}
        onClose={() => setShowFenModal(false)}
        onLoadFen={handleLoadPosition}
      />

      {/* Settings Modal */}
      {showSettings && (
        <React.Suspense fallback={null}>
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
          />
        </React.Suspense>
      )}

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
          setActiveTab('analyze');
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
