import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import { 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  ChevronRight, 
  RotateCcw, 
  HelpCircle, 
  Play, 
  ShieldCheck, 
  Compass, 
  Zap, 
  ArrowRight,
  BookOpen,
  Target,
  Trophy,
  Flame
} from 'lucide-react';

export interface LessonStep {
  id: string;
  title: string;
  category: 'pieces' | 'rules' | 'principles' | 'tactics';
  icon: string;
  description: string;
  coachAdvice: string;
  initialFen: string;
  expectedMove: { from: string; to: string; promotion?: string };
  followUpText: string;
}

export const BEGINNER_LESSONS: LessonStep[] = [
  // TRACK 1: How Pieces Move
  {
    id: 'pawn-1',
    title: '1. The Brave Pawn (Double Step)',
    category: 'pieces',
    icon: '♟️',
    description: 'Pawns move straight forward 1 square. On their very first move, they have the special option to leap forward 2 squares!',
    coachAdvice: 'Advance your pawn on e2 forward two full squares to e4 to claim the center of the board!',
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    expectedMove: { from: 'e2', to: 'e4' },
    followUpText: 'Brilliant! Moving the e-pawn forward 2 squares controls the center and opens diagonals for your Queen and Bishop.',
  },
  {
    id: 'knight-1',
    title: '2. The Jumping Knight',
    category: 'pieces',
    icon: '♞',
    description: 'The Knight is the only piece that can jump over other pieces! It moves in an "L-shape": 2 squares in one direction, then 1 square to the side.',
    coachAdvice: 'Jump your Knight on g1 over your pawns to the active f3 square!',
    initialFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    expectedMove: { from: 'g1', to: 'f3' },
    followUpText: 'Perfect! From f3, your Knight attacks the center and prepares for kingside castling.',
  },
  {
    id: 'bishop-1',
    title: '3. The Swift Bishop',
    category: 'pieces',
    icon: '♝',
    description: 'Bishops move diagonally as far as they want on the color squares they start on (light-squared vs dark-squared).',
    coachAdvice: 'Develop your light-squared Bishop from f1 outward along the diagonal to c4!',
    initialFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    expectedMove: { from: 'f1', to: 'c4' },
    followUpText: 'Awesome! From c4, your Bishop aims directly at Black’s vulnerable f7 square.',
  },
  {
    id: 'rook-1',
    title: '4. The Powerful Rook',
    category: 'pieces',
    icon: '♜',
    description: 'Rooks move in straight lines along files (up and down) and ranks (side to side). They love open files!',
    coachAdvice: 'Slide your Rook on e1 all the way down the open file to capture Black’s Rook on e8!',
    initialFen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    expectedMove: { from: 'e1', to: 'e8' },
    followUpText: 'Checkmate! The Rook controlled the entire back rank corridor!',
  },
  {
    id: 'queen-1',
    title: '5. The Regal Queen',
    category: 'pieces',
    icon: '♛',
    description: 'The Queen is the most powerful piece on the board, combining the full powers of both the Rook and Bishop!',
    coachAdvice: 'Move your Queen on d1 along the open diagonal to deliver check on h5!',
    initialFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    expectedMove: { from: 'd1', to: 'h5' },
    followUpText: 'Magnificent! The Queen has immense range in every direction.',
  },
  {
    id: 'king-1',
    title: '6. The Royal King',
    category: 'pieces',
    icon: '♚',
    description: 'The King can move one square in any direction. The entire game revolves around protecting your King!',
    coachAdvice: 'Step your King on e1 safely forward to e2.',
    initialFen: '8/8/8/8/8/8/4K3/8 w - - 0 1',
    expectedMove: { from: 'e2', to: 'e3' },
    followUpText: 'Great job! The King moves carefully one step at a time.',
  },

  // TRACK 2: Special Rules
  {
    id: 'castling-1',
    title: '7. Kingside Castling',
    category: 'rules',
    icon: '🏰',
    description: 'Castling allows your King to leap two squares toward the corner while the Rook jumps over the King to safety!',
    coachAdvice: 'Castle Kingside by moving your King from e1 to g1!',
    initialFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    expectedMove: { from: 'e1', to: 'g1' },
    followUpText: 'Superb! Castling tucks your King into safety behind 3 pawns and activates your Rook!',
  },
  {
    id: 'check-1',
    title: '8. Escaping Check (The CPR Rule)',
    category: 'rules',
    icon: '🛡️',
    description: 'When in check, you MUST get out immediately using CPR: Capture the checking piece, Protect/block the line of check, or Run away!',
    coachAdvice: 'Black’s Bishop on b4 is checking your King on e1. Block the check with your pawn from c2 to c3!',
    initialFen: 'rnbqk1nr/pppp1ppp/8/4p3/1b2P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    expectedMove: { from: 'c2', to: 'c3' },
    followUpText: 'Well defended! By playing c3, you blocked the check and attacked Black’s Bishop.',
  },
  {
    id: 'promotion-1',
    title: '9. Pawn Promotion',
    category: 'rules',
    icon: '👑',
    description: 'When a humble pawn marches all the way to the 8th rank, it transforms into a Queen, Rook, Bishop, or Knight!',
    coachAdvice: 'Push your pawn from e7 to e8 to promote to a brand new Queen!',
    initialFen: '8/4P3/8/8/8/8/4K3/5k2 w - - 0 1',
    expectedMove: { from: 'e7', to: 'e8', promotion: 'q' },
    followUpText: 'You got a Queen! Pawn promotion is one of the most exciting moves in chess.',
  },

  // TRACK 3: Tactical Checkmates & Golden Rules
  {
    id: 'mate-kiss-1',
    title: '10. The Kiss of Death Checkmate',
    category: 'tactics',
    icon: '⚔️',
    description: 'When your Queen gets right next to the enemy King and is protected by your Bishop, it is instantly game over!',
    coachAdvice: 'Deliver checkmate by moving your Queen from h5 to capture the pawn on f7 (guarded by your Bishop on c4)!',
    initialFen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    expectedMove: { from: 'h5', to: 'f7' },
    followUpText: 'CHECKMATE! The King cannot capture the Queen because of the Bishop, and cannot run away!',
  },
  {
    id: 'fork-1',
    title: '11. The Royal Knight Fork',
    category: 'tactics',
    icon: '🔱',
    description: 'A Fork is when one piece attacks two or more enemy pieces at the exact same time!',
    coachAdvice: 'Jump your Knight to c7 to fork Black’s King on e8 and Rook on a8!',
    initialFen: 'r3kbnr/ppp1pppp/8/3N4/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1',
    expectedMove: { from: 'd5', to: 'c7' },
    followUpText: 'Brutal fork! Black must move their King, allowing you to win the free Rook on a8 next turn.',
  },
];

export const BeginnerAcademy: React.FC = () => {
  const [currentLessonIdx, setCurrentLessonIdx] = useState<number>(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('grandmaster_beginner_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'lessons' | 'coordinates' | 'cheatSheet'>('lessons');
  const lesson = BEGINNER_LESSONS[currentLessonIdx];

  // Board state for active lesson
  const [chess, setChess] = useState<Chess>(() => new Chess(lesson.initialFen));
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Coordinate trainer state
  const [coordTarget, setCoordTarget] = useState<string>('e4');
  const [coordScore, setCoordScore] = useState<number>(0);
  const [coordTimeLeft, setCoordTimeLeft] = useState<number>(30);
  const [isCoordRunning, setIsCoordRunning] = useState<boolean>(false);
  const [coordHighScore, setCoordHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('grandmaster_coord_highscore') || '0', 10);
  });

  // Reset board when lesson changes
  useEffect(() => {
    setChess(new Chess(lesson.initialFen));
    setIsSuccess(false);
    setFeedbackMsg(null);
  }, [currentLessonIdx, lesson]);

  const handleLessonMove = (move: { from: string; to: string; promotion?: string }): boolean => {
    const isExpected =
      move.from === lesson.expectedMove.from &&
      move.to === lesson.expectedMove.to &&
      (!lesson.expectedMove.promotion || move.promotion === lesson.expectedMove.promotion);

    try {
      const copy = new Chess(chess.fen());
      const res = copy.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (res) {
        setChess(copy);

        if (isExpected) {
          setIsSuccess(true);
          sound.playCapture();
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
          });

          // Save completed lesson
          if (!completedLessonIds.includes(lesson.id)) {
            const nextList = [...completedLessonIds, lesson.id];
            setCompletedLessonIds(nextList);
            try {
              localStorage.setItem('grandmaster_beginner_lessons', JSON.stringify(nextList));
            } catch {}
          }
          return true;
        } else {
          setFeedbackMsg('Good try, but try to follow Coach advice to complete this lesson objective!');
          setTimeout(() => {
            setChess(new Chess(lesson.initialFen));
            setFeedbackMsg(null);
          }, 1400);
          return true;
        }
      }
    } catch {
      return false;
    }
    return false;
  };

  const handleNextLesson = () => {
    if (currentLessonIdx < BEGINNER_LESSONS.length - 1) {
      setCurrentLessonIdx((prev) => prev + 1);
    }
  };

  const handleResetLesson = () => {
    setChess(new Chess(lesson.initialFen));
    setIsSuccess(false);
    setFeedbackMsg(null);
  };

  // Coordinate trainer logic
  const getRandomSquare = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const f = files[Math.floor(Math.random() * files.length)];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    return `${f}${r}`;
  };

  const startCoordGame = () => {
    setCoordScore(0);
    setCoordTimeLeft(30);
    setIsCoordRunning(true);
    setCoordTarget(getRandomSquare());
  };

  useEffect(() => {
    let interval: any;
    if (isCoordRunning && coordTimeLeft > 0) {
      interval = setInterval(() => {
        setCoordTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (coordTimeLeft === 0 && isCoordRunning) {
      setIsCoordRunning(false);
      sound.playGameOver();
      if (coordScore > coordHighScore) {
        setCoordHighScore(coordScore);
        localStorage.setItem('grandmaster_coord_highscore', coordScore.toString());
      }
    }
    return () => clearInterval(interval);
  }, [isCoordRunning, coordTimeLeft, coordScore, coordHighScore]);

  const handleCoordSquareClick = (square: string) => {
    if (!isCoordRunning) return;
    if (square === coordTarget) {
      sound.playMove();
      setCoordScore((prev) => prev + 1);
      setCoordTarget(getRandomSquare());
    } else {
      sound.playIllegal();
    }
  };

  const progressPercent = Math.round((completedLessonIds.length / BEGINNER_LESSONS.length) * 100);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-2">
      {/* Top Header Banner */}
      <div className="p-6 bg-gradient-to-r from-sky-950/80 via-indigo-950/70 to-slate-900 border border-sky-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-sky-500/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">
                Beginner Chess Academy
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[11px] font-bold text-sky-300">
                Zero to Hero
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Master how the pieces move, special powers, and golden rules with interactive step-by-step drills!
            </p>
          </div>
        </div>

        {/* Overall Progress Widget */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl min-w-[200px]">
          <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="w-full">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Curriculum Progress</span>
              <span className="text-sky-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'lessons'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Interactive Lessons ({completedLessonIds.length}/{BEGINNER_LESSONS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coordinates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'coordinates'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Board Vision Blitz (30s)</span>
        </button>

        <button
          onClick={() => setActiveTab('cheatSheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'cheatSheet'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Piece Value Cheat Sheet</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE LESSONS */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lesson Stage Selector Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Select Lesson
            </span>
            {BEGINNER_LESSONS.map((item, idx) => {
              const isDone = completedLessonIds.includes(item.id);
              const isCurrent = idx === currentLessonIdx;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentLessonIdx(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-sky-950/80 border-sky-500/60 text-white shadow-md'
                      : isDone
                      ? 'bg-slate-900/60 border-emerald-900/40 text-slate-300 hover:bg-slate-800/60'
                      : 'bg-slate-900/40 border-slate-800/70 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="text-xs font-bold">{item.title}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{item.category}</div>
                    </div>
                  </div>

                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Lesson Arena */}
          <div className="lg:col-span-8 flex flex-col lg:flex-row gap-6 items-center lg:items-start bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            {/* Interactive Chess Board */}
            <div className="w-full max-w-[420px] shrink-0">
              <ChessBoard
                chess={chess}
                isFlipped={false}
                playerColor="w"
                onMove={handleLessonMove}
                disabled={isSuccess}
                showCoordinates={true}
                showLegalMoves={true}
              />
            </div>

            {/* Coach & Objective Panel */}
            <div className="flex flex-col gap-4 w-full">
              {/* Objective Header */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Lesson {currentLessonIdx + 1} of {BEGINNER_LESSONS.length}
                  </span>
                  <button
                    onClick={handleResetLesson}
                    title="Reset Board"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{lesson.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{lesson.description}</p>
              </div>

              {/* Coach Advice Bubble */}
              <div className="p-4 bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-500/30 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                  🎓
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-300 mb-1">Coach Tip:</div>
                  <div className="text-xs text-slate-200 leading-relaxed font-medium">
                    {lesson.coachAdvice}
                  </div>
                </div>
              </div>

              {/* Feedback Alert if user made alternate move */}
              {feedbackMsg && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-300 animate-pulse font-medium">
                  {feedbackMsg}
                </div>
              )}

              {/* Success Card & Continue Button */}
              {isSuccess && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex flex-col gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>Lesson Mastered!</span>
                  </div>
                  <p className="text-xs text-slate-200">{lesson.followUpText}</p>

                  <button
                    onClick={handleNextLesson}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
                  >
                    <span>Next Lesson</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOARD COORDINATE VISION BLITZ */}
      {activeTab === 'coordinates' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="md:col-span-5 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Coordinate Speed Blitz (30s)</h3>
              <p className="text-xs text-slate-300">
                Train your board vision! Tap the square called out as quickly as you can before the clock runs out.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-around">
              <div className="text-center">
                <div className="text-xs text-slate-400">Score</div>
                <div className="text-2xl font-black text-sky-400">{coordScore}</div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-center">
                <div className="text-xs text-slate-400">Time Left</div>
                <div className="text-2xl font-black text-amber-400">{coordTimeLeft}s</div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-center">
                <div className="text-xs text-slate-400">High Score</div>
                <div className="text-2xl font-black text-emerald-400">{coordHighScore}</div>
              </div>
            </div>

            {isCoordRunning ? (
              <div className="p-6 bg-gradient-to-br from-sky-950 to-indigo-950 border-2 border-sky-400 rounded-2xl text-center shadow-lg animate-pulse">
                <div className="text-xs uppercase tracking-widest text-sky-300 font-bold mb-1">
                  TAP THIS SQUARE:
                </div>
                <div className="text-5xl font-black text-white tracking-widest font-mono">
                  {coordTarget.toUpperCase()}
                </div>
              </div>
            ) : (
              <button
                onClick={startCoordGame}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start 30-Second Sprint</span>
              </button>
            )}
          </div>

          {/* Clickable 8x8 Grid for Coordinate Drill */}
          <div className="md:col-span-7 flex justify-center">
            <div className="grid grid-cols-8 grid-rows-8 w-full max-w-[400px] aspect-square rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][col];
                const rank = 8 - row;
                const sq = `${file}${rank}`;
                const isLight = (row + col) % 2 === 0;

                return (
                  <div
                    key={sq}
                    onClick={() => handleCoordSquareClick(sq)}
                    className={`relative flex items-center justify-center font-bold text-[10px] select-none cursor-pointer transition-all duration-75 active:scale-95 ${
                      isLight ? 'bg-amber-100 text-slate-800' : 'bg-amber-800 text-amber-100'
                    } hover:brightness-125`}
                  >
                    {/* Corner rank & file helpers for beginners */}
                    {col === 0 && (
                      <span className="absolute top-0.5 left-0.5 opacity-60 font-mono text-[9px]">
                        {rank}
                      </span>
                    )}
                    {row === 7 && (
                      <span className="absolute bottom-0.5 right-0.5 opacity-60 font-mono text-[9px]">
                        {file}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PIECE VALUE CHEAT SHEET & RULES */}
      {activeTab === 'cheatSheet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Pawn', symbol: '♟️', points: 1, desc: 'Moves 1 forward, captures 1 diagonally. Can leap 2 on first move. Promotes on 8th rank.' },
            { name: 'Knight', symbol: '♞', points: 3, desc: 'L-shaped jumps. Can leap over friendly and enemy pieces. Great in closed positions.' },
            { name: 'Bishop', symbol: '♝', points: 3, desc: 'Moves diagonally across the board on its starting color complex (light or dark).' },
            { name: 'Rook', symbol: '♜', points: 5, desc: 'Moves straight along files and ranks. Controls open lines and forms deadly batteries.' },
            { name: 'Queen', symbol: '♛', points: 9, desc: 'The ultimate attacking weapon. Moves any number of squares along diagonals and straights.' },
            { name: 'King', symbol: '♚', points: '∞', desc: 'Moves 1 square in any direction. Must be kept safe at all costs through early castling.' },
          ].map((p) => (
            <div key={p.name} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{p.symbol}</span>
                  <span className="font-bold text-white text-sm">{p.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 border border-sky-400/30 text-sky-300 font-mono font-bold text-xs">
                  {p.points} Point{p.points !== 1 && p.points !== '∞' ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
