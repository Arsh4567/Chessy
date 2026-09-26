import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { 
  GameMode, 
  PieceColor, 
  PieceType, 
  TimeControl, 
  BotProfile, 
  AnalyzedMove 
} from '../types/chess';
import { TIME_CONTROLS, INITIAL_BOTS } from '../utils/mockData';
import { getStockfishMoveAsync, evaluateBoard } from '../utils/engine';
import { classifyEngineMove, calculateGameAccuracy } from '../utils/moveClassification';
import { detectOpening } from '../utils/openings';
import { sound } from '../utils/sound';
import { recordGameResult, UserPreferences, UserStats } from '../utils/storage';
import { stockfish, StockfishEvaluation } from '../utils/stockfishWorker';
import { fetchLichessData, LichessData } from '../utils/lichessExplorer';

interface UseChessGameProps {
  preferences: UserPreferences;
  onUpdateStats: (newStats: UserStats) => void;
  onNavigateTab?: (tab: any) => void;
}

export function useChessGame({
  preferences,
  onUpdateStats,
  onNavigateTab,
}: UseChessGameProps) {
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

  // Live Stockfish Engine Evaluation State
  const [stockfishEval, setStockfishEval] = useState<StockfishEvaluation>({
    depth: 0,
    scoreCp: 0,
    rawScoreType: 'cp',
    rawScoreValue: 0,
    rawUciScore: 'cp 0',
    sideToMove: 'w',
    evalPawns: 0,
    displayEval: '0.00',
  });
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Lichess Opening Explorer Masters Data State for current board FEN
  const [lichessData, setLichessData] = useState<LichessData | null>(null);

  // User-defined Stockfish Evaluation Depth (between 12 and 22, default 14)
  const [evaluationDepth, setEvaluationDepth] = useState<number>(14);
  const evaluationDepthRef = useRef<number>(14);
  useEffect(() => {
    evaluationDepthRef.current = evaluationDepth;
  }, [evaluationDepth]);

  // Evaluate any position with real Stockfish engine using user-defined depth and fetch Lichess data in parallel
  const evaluateCurrentPosition = useCallback(async (fen: string, depth?: number) => {
    const targetDepth = depth !== undefined ? depth : evaluationDepthRef.current;

    // Trigger Lichess Masters data fetch alongside Stockfish evaluation
    fetchLichessData(fen)
      .then((res) => {
        if (res.status === 'success' && res.data) {
          setLichessData(res.data);
        } else {
          setLichessData(null);
        }
      })
      .catch((err) => {
        console.warn('Lichess fetch non-fatal error:', err);
        setLichessData(null);
      });

    setIsEvaluating(true);
    try {
      const result = await stockfish.evaluatePosition(
        fen,
        targetDepth,
        2500,
        (liveEval) => {
          setStockfishEval(liveEval);
        }
      );
      if (result) {
        setStockfishEval(result);
        return result;
      }
    } catch (err) {
      console.warn('Stockfish live evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
    return null;
  }, []);

  // Update evaluation depth and re-evaluate current active board position immediately
  const handleDepthChange = useCallback((newDepth: number) => {
    const clampedDepth = Math.max(12, Math.min(22, Math.round(newDepth)));
    setEvaluationDepth(clampedDepth);
    evaluationDepthRef.current = clampedDepth;
    evaluateCurrentPosition(chessRef.current.fen(), clampedDepth);
  }, [evaluateCurrentPosition]);

  // Run initial evaluation on mount
  useEffect(() => {
    evaluateCurrentPosition(chess.fen());
  }, [evaluateCurrentPosition]);

  // Handle Game Over
  const handleGameOver = useCallback((result: 'win' | 'loss' | 'draw', reason: string, customHistory?: AnalyzedMove[]) => {
    setInActiveMatch(false);

    const finalHistory = customHistory || movesHistory;
    const { whiteAccuracy, blackAccuracy } = calculateGameAccuracy(finalHistory);

    // Save to real local storage
    const updatedStats = recordGameResult(
      result,
      opponent.name,
      finalHistory.length,
      timeControl.name,
      chessRef.current.pgn()
    );
    onUpdateStats(updatedStats);

    setGameOverModal({
      isOpen: true,
      result,
      reason,
      whiteAccuracy,
      blackAccuracy,
    });
  }, [movesHistory, opponent.name, timeControl.name, onUpdateStats]);

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
  }, [inActiveMatch, chess.turn(), timeControl.category, handleGameOver]);

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

    // Determine best move and evaluation before move
    let bestMoveSan = '';
    if (stockfishEval.bestMove) {
      try {
        const testChess = new Chess(currentChess.fen());
        const m = testChess.move({
          from: stockfishEval.bestMove.from,
          to: stockfishEval.bestMove.to,
          promotion: stockfishEval.bestMove.promotion,
        });
        if (m) bestMoveSan = m.san;
      } catch {}
    }

    const evalBefore = stockfishEval.scoreCp ?? evaluateBoard(currentChess);
    const evalAfterInitial = evaluateBoard(nextChess);
    const moveNumber = Math.floor(movesHistory.length / 2) + 1;
    const isBook = moveNumber <= 10 && Boolean(detectOpening([...movesHistory.map((m) => m.san), moveResult.san]));

    // Fast initial classification
    const initialClassification = classifyEngineMove(
      new Chess(currentChess.fen()),
      moveResult,
      evalBefore,
      evalAfterInitial,
      bestMoveSan,
      moveNumber,
      { isBookOpeningMove: isBook }
    );

    const newAnalyzedMove: AnalyzedMove = {
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece as any,
      color: moveResult.color as any,
      captured: moveResult.captured as any,
      promotion: moveResult.promotion as any,
      fen: nextChess.fen(),
      eval: +(evalAfterInitial / 100).toFixed(2),
      classification: initialClassification.classification,
      commentary: initialClassification.commentary,
      bestMoveSan: bestMoveSan || undefined,
    };

    let updatedHistory: AnalyzedMove[] = [];
    setMovesHistory((prev) => {
      const nextH = [...prev, newAnalyzedMove];
      updatedHistory = nextH;
      setCurrentMoveIdx(nextH.length - 1);
      return nextH;
    });
    setLastMove({ from: moveResult.from, to: moveResult.to });
    setBestMoveHint(null);

    // Update React State and ref to render resulting position
    setChess(nextChess);
    chessRef.current = nextChess;

    // Immediately trigger real Stockfish UCI evaluation for new position & upgrade classification
    evaluateCurrentPosition(nextChess.fen()).then((evalRes) => {
      if (evalRes && evalRes.scoreCp !== undefined) {
        const accurateEval = evalRes.evalPawns ?? +(evalRes.scoreCp / 100).toFixed(2);
        const deepClassification = classifyEngineMove(
          new Chess(currentChess.fen()),
          moveResult,
          evalBefore,
          evalRes.scoreCp,
          bestMoveSan,
          moveNumber,
          { isBookOpeningMove: isBook }
        );

        setMovesHistory((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const targetIdx = updated.findIndex((m) => m.fen === nextChess.fen());
          const idx = targetIdx !== -1 ? targetIdx : updated.length - 1;
          if (updated[idx]) {
            updated[idx] = {
              ...updated[idx],
              eval: accurateEval,
              classification: deepClassification.classification,
              commentary: deepClassification.commentary,
              bestMoveSan: bestMoveSan || updated[idx].bestMoveSan,
            };
          }
          return updated;
        });
      }
    });

    // Check game over
    if (nextChess.isCheckmate()) {
      const winner = prevTurn === 'w' ? 'White' : 'Black';
      const isPlayerWinner =
        (prevTurn === 'w' && playerColor === 'w') || (prevTurn === 'b' && playerColor === 'b');
      handleGameOver(
        isPlayerWinner ? 'win' : 'loss',
        `Checkmate! ${winner} delivered victory.`,
        updatedHistory
      );
    } else if (nextChess.isDraw()) {
      let reason = 'Draw.';
      if (nextChess.isStalemate()) reason = 'Draw by Stalemate.';
      else if (nextChess.isThreefoldRepetition()) reason = 'Draw by Repetition.';
      else if (nextChess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material.';
      handleGameOver('draw', reason, updatedHistory);
    }

    return true;
  }, [playerColor, timeControl.incrementSeconds, movesHistory, stockfishEval, evaluateCurrentPosition, handleGameOver]);

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

    getStockfishMoveAsync(chess, selectedBot)
      .then((parsedMove) => {
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
        console.error('Stockfish move execution error:', err);
        if (isActive) setIsBotThinking(false);
      });

    return () => {
      isActive = false;
    };
  }, [inActiveMatch, chess.fen(), gameMode, playerColor, executeMove, selectedBot]);

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
    if (onNavigateTab) onNavigateTab('play');

    evaluateCurrentPosition(newChess.fen());
  }, [evaluateCurrentPosition, onNavigateTab]);

  const handleStartBotGame = useCallback((
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
  }, [startNewGame]);

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
      evaluateCurrentPosition(targetBoard.fen());
    } catch (e) {
      console.warn('Error during takeback:', e);
    }
  };

  // Material differential
  const material = useMemo(() => {
    const pts: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let w = 0;
    let b = 0;
    capturedWhite.forEach((p) => (w += pts[p]));
    capturedBlack.forEach((p) => (b += pts[p]));
    return {
      whiteLead: Math.max(0, w - b),
      blackLead: Math.max(0, b - w),
    };
  }, [capturedWhite, capturedBlack]);

  const currentEval =
    stockfishEval.evalPawns !== undefined
      ? stockfishEval.evalPawns
      : movesHistory[currentMoveIdx]?.eval ?? (stockfishEval.scoreCp / 100);

  const opening = detectOpening(movesHistory.map((m) => m.san));

  const isCurrentTurnHuman =
    (chess.turn() === 'w' && playerColor === 'w') ||
    (chess.turn() === 'b' && playerColor === 'b');

  return {
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
  };
}
