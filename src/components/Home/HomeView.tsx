import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { 
  Play, 
  Search, 
  Zap, 
  BookOpen, 
  Globe, 
  ChevronRight, 
  Cpu, 
  Users,
  Trophy,
  ArrowRight,
  LayoutDashboard,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Target,
  Swords,
  Layers,
  Rotate3d,
  Volume2,
  Star,
  Flame,
  Award,
  Lightbulb,
  Clock,
  Check,
  Bot
} from 'lucide-react';
import { UserStats } from '../../utils/storage';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { ChessBoard3D } from '../ChessBoard/ChessBoard3D';

interface HomeViewProps {
  stats: UserStats;
  onNavigate: (tab: 'play' | 'puzzles' | 'learn' | 'analyze' | 'games' | 'leaderboard' | 'profile' | 'friends') => void;
  onStartBotGame?: () => void;
  onSolvePuzzle?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  stats,
  onNavigate,
  onStartBotGame,
  onSolvePuzzle,
}) => {
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  
  // Interactive Hero Preview State
  const [heroBoardDimension, setHeroBoardDimension] = useState<'2d' | '3d'>('2d');
  const [heroChess, setHeroChess] = useState<Chess>(() => {
    const c = new Chess();
    // Setup exciting Italian Game position
    c.move('e4');
    c.move('e5');
    c.move('Nf3');
    c.move('Nc6');
    c.move('Bc4');
    c.move('Bc5');
    return c;
  });

  const [activeTabFeature, setActiveTabFeature] = useState<'play' | 'learn' | 'analyze' | 'academy'>('play');

  // Benchmark Master Openings showcase
  const popularOpenings = [
    { eco: 'B90', name: 'Sicilian Defense: Najdorf', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6', whiteWin: 38, draw: 32, blackWin: 30, tag: 'Aggressive & Sharp' },
    { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6', whiteWin: 39, draw: 44, blackWin: 17, tag: 'Solid Grandmaster Wall' },
    { eco: 'D37', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3', whiteWin: 41, draw: 38, blackWin: 21, tag: 'Classical Positional' },
    { eco: 'E60', name: "King's Indian Defense", moves: '1. d4 Nf6 2. c4 g6 3. g3 Bg7 4. Bg2 O-O', whiteWin: 40, draw: 34, blackWin: 26, tag: 'Hypermodern Kingside Attack' },
  ];

  const handleHeroBoardMove = (move: { from: string; to: string; promotion?: string }): boolean => {
    try {
      const next = new Chess(heroChess.fen());
      const res = next.move(move);
      if (res) {
        setHeroChess(next);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const handleResetHeroBoard = () => {
    const c = new Chess();
    c.move('e4');
    c.move('e5');
    c.move('Nf3');
    c.move('Nc6');
    c.move('Bc4');
    c.move('Bc5');
    setHeroChess(c);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-16 animate-in fade-in duration-300 pb-24 md:pb-12 select-none">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: "Improve at Chess" with Stockfish 19 & AI Coach */}
      {/* ========================================================================= */}
      <section className="relative rounded-3xl p-6 sm:p-10 lg:p-12 bg-[#0c1424] border border-slate-800 shadow-xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Bold Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-400/25 text-xs font-semibold text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Stockfish 19 Engine & Personal AI Coach • 100% Free</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.08]">
                <span className="block">Improve at</span>
                <span className="text-sky-400">
                  Chess
                </span>
              </h1>
              
              {/* Requested Sub Heading */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-2xl border-l-2 border-sky-500/50 pl-4 py-0.5">
                Understand your strength and weaknesses with the help of <strong className="text-white font-semibold">Stockfish 19</strong> (world&apos;s smartest engine) and our <strong className="text-sky-300 font-semibold">personal AI chess coach</strong> for free!!!
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onStartBotGame ? onStartBotGame() : onNavigate('play')}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-sm shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Live Matches</span>
              </button>

              <button
                onClick={() => onNavigate('analyze')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-850 border border-slate-700/80 text-slate-100 font-semibold text-sm transition-all duration-150 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Search className="w-4 h-4 text-sky-400" />
                <span>Analyze with AI Coach</span>
              </button>

              <button
                onClick={() => onNavigate('learn')}
                className="px-5 py-3 rounded-xl bg-slate-850 hover:bg-slate-800 active:bg-slate-900 border border-slate-700/60 text-slate-200 font-semibold text-sm transition-all duration-150 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Beginner Academy</span>
              </button>
            </div>

            {/* Performance Stats Counters */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 max-w-lg">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums">
                  2,850+
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">Stockfish 19 Elo</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-lg sm:text-xl font-bold font-mono text-sky-400 tabular-nums">
                  500+
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">ECO Openings</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 tabular-nums">
                  100% Free
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">Unlimited Reviews</div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Board Demo (2D & 3D Switcher) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[420px] bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-slate-200">Interactive Preview</span>
                </div>

                {/* 2D / 3D Toggle */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setHeroBoardDimension('2d')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      heroBoardDimension === '2d'
                        ? 'bg-slate-800 text-sky-400 border border-slate-700/80'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2D Board
                  </button>
                  <button
                    onClick={() => setHeroBoardDimension('3d')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      heroBoardDimension === '3d'
                        ? 'bg-slate-800 text-sky-400 border border-slate-700/80'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Rotate3d className="w-3 h-3" />
                    <span>3D Models</span>
                  </button>
                </div>
              </div>

              {/* Board Render */}
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-800">
                {heroBoardDimension === '3d' ? (
                  <ChessBoard3D
                    chess={heroChess}
                    isFlipped={false}
                    onMove={handleHeroBoardMove}
                    showCoordinates={true}
                    showLegalMoves={true}
                  />
                ) : (
                  <ChessBoard
                    chess={heroChess}
                    isFlipped={false}
                    playerColor="w"
                    onMove={handleHeroBoardMove}
                    showCoordinates={true}
                    showLegalMoves={true}
                    boardTheme="emerald"
                  />
                )}
              </div>

              {/* Live AI Coach Mock Bubble */}
              <div className="p-3 bg-[#0c1424] border border-slate-800 rounded-xl flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-sky-300 flex items-center gap-1.5">
                    <span>Personal AI Coach</span>
                    <span className="text-[10px] text-slate-400 font-normal">· Live</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    &quot;Italian Game! Both sides fight for center control. White is preparing to castle kingside to secure the King.&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>Try moving pieces on the board!</span>
                <button
                  onClick={handleResetHeroBoard}
                  className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer underline decoration-dotted"
                >
                  Reset Position
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CORE PLATFORM SECTIONS: Comprehensive breakdown of every feature */}
      {/* ========================================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-sky-400">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Complete Grandmaster Ecosystem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Everything You Need to Master the 64 Squares
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            From absolute beginner fundamentals to deep grandmaster engine analysis, discover the full suite of tools built into Grandmaster Studio.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. PLAY CHESS */}
          <div 
            onClick={() => onNavigate('play')}
            className="group p-6 sm:p-7 rounded-2xl bg-[#0c1424] hover:bg-[#101a2f] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-sky-400">Live Gaming</span>
                <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors mt-1">
                  Play chess with your friends, bots and different versions of Stockfish
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Compete against 10+ adaptive AI personalities from 400 Elo to 2850+ Grandmaster Stockfish. Host private 1v1 multiplayer rooms with friends, custom time controls, and instant rematch support.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>2D & Full 3D Interactive Physical Piece Sets</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Multiplayer with Live Invite Links</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-sky-400 gap-1 group-hover:translate-x-1 transition-transform pt-1">
                <span>Start a match now</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 2. LEARN EVERY OPENING & TECHNIQUE */}
          <div 
            onClick={() => onNavigate('learn')}
            className="group p-6 sm:p-7 rounded-2xl bg-[#0c1424] hover:bg-[#101a2f] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">Master Theory</span>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mt-1">
                  Learn every single invented opening. Learn every technique of chess.
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Explore the complete 500+ ECO Opening Encyclopedia. Drill lines using the SM-2 Spaced Repetition Repertoire Trainer and study win/draw rates from 2.2 million FIDE tournament games.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>SM-2 Memory Spaced Repetition Trainer</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sicilian, Ruy Lopez, King&apos;s Indian & 500+ variations</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform pt-1">
                <span>Explore all openings</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 3. STOCKFISH 19 & AI COACH */}
          <div 
            onClick={() => onNavigate('analyze')}
            className="group p-6 sm:p-7 rounded-2xl bg-[#0c1424] hover:bg-[#101a2f] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-purple-400">Deep Engine Calculation</span>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mt-1">
                  Stockfish 19 Review & Personal AI Coach
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Full game evaluations with move classifications (Brilliant, Great, Best, Blunder). Click the new &quot;Explain&quot; button to get human-readable Gemini AI coaching explanations with voice read-aloud!
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Move Classification: Brilliant (!!), Best, Blunders</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AI Voice Coach explains why moves work or fail</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-purple-400 gap-1 group-hover:translate-x-1 transition-transform pt-1">
                <span>Analyze your games</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 4. BEGINNER ACADEMY: ZERO TO HERO */}
          <div 
            onClick={() => onNavigate('learn')}
            className="group p-6 sm:p-7 rounded-2xl bg-[#0c1424] hover:bg-[#101a2f] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-amber-400">Beginner Bootcamp</span>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mt-1">
                  Interactive Zero-to-Hero Academy
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Step-by-step interactive board exercises covering piece powers, castling, en passant, promotion, checkmate patterns, and 30-second coordinate vision blitz sprints.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Interactive Drills & Star Progress Tracker</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Board Vision Speed Sprint with Saved High Scores</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform pt-1">
                <span>Start learning from zero</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 5. TACTICS & PUZZLE TRAINER */}
          <div 
            onClick={() => onSolvePuzzle ? onSolvePuzzle() : onNavigate('puzzles')}
            className="group p-6 sm:p-7 rounded-2xl bg-[#0c1424] hover:bg-[#101a2f] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-sky-400">Pattern Mastery</span>
                <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors mt-1">
                  Tactical Dojo & Puzzle Rating
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sharpen tactical calculation with thousands of real master puzzles. Adaptive Elo ratings, instant hints, and categorized drills (Forks, Pins, Skewers, Mates).
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Adaptive Tactics Rating: {stats.puzzleRating}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant move feedback & blunder punishment</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-sky-400 gap-1 group-hover:translate-x-1 transition-transform pt-1">
                <span>Solve tactics now</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 6. USER DASHBOARD & ARCHIVES */}
          <div 
            onClick={() => onNavigate('profile')}
            className="group p-6 sm:p-7 rounded-2xl bg-[#0c1424] hover:bg-[#101a2f] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">Career Insights</span>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mt-1">
                  User Dashboard & Progress Analytics
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Track historical Elo ratings, win/loss records by opening, earned achievements, and import Chess.com games with one click to review your past performances.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Historical Elo Graph & Opening Win Rates</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Import & Review Chess.com Game Archives</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-indigo-400 gap-1 group-hover:translate-x-1 transition-transform pt-1">
                <span>View your profile</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. BENCHMARK MASTER OPENINGS SHOWCASE */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0c1424] border border-slate-800/90 p-6 sm:p-10 rounded-2xl shadow-sm">
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Master Opening Explorer</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Learn Every Opening Like a Grandmaster
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Gain a winning opening repertoire. Every line is analyzed with move-by-move master win rates, grandmaster popularity, and positional ideas.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('learn')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 border border-slate-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <span>Explore 500+ Openings</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {popularOpenings.map((op, idx) => (
            <div
              key={`${op.eco}_${op.name}_${idx}`}
              onClick={() => onNavigate('learn')}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {op.eco}
                  </span>
                  <span className="font-semibold text-sm text-white truncate">
                    {op.name}
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-400 font-normal">
                    · {op.tag}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 truncate">
                  {op.moves}
                </div>
              </div>

              {/* Master Win/Draw Distribution */}
              <div className="w-full sm:w-44 shrink-0 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span className="text-emerald-400 font-medium">W {op.whiteWin}%</span>
                  <span className="text-slate-400">D {op.draw}%</span>
                  <span className="text-rose-400 font-medium">B {op.blackWin}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden flex bg-slate-950">
                  <div style={{ width: `${op.whiteWin}%` }} className="bg-emerald-500" title={`White Win: ${op.whiteWin}%`} />
                  <div style={{ width: `${op.draw}%` }} className="bg-slate-400" title={`Draw: ${op.draw}%`} />
                  <div style={{ width: `${op.blackWin}%` }} className="bg-rose-500" title={`Black Win: ${op.blackWin}%`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. COMPARISON: WHY PLAYERS LOVE GRANDMASTER STUDIO */}
      {/* ========================================================================= */}
      <section className="p-6 sm:p-10 rounded-2xl bg-[#0c1424] border border-slate-800/90 shadow-sm space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">
            Why Grandmaster Studio is 100% Free
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            No paywalls. No limited 1 game analysis per day. Pure chess excellence powered by client-side WebAssembly and Gemini AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sky-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">Stockfish 19 WASM Engine</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Positional calculation runs directly inside your browser with dedicated Web Workers for zero server lag and unlimited evaluations.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">Gemini AI Coach Explanations</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unlike raw engine numbers, our AI coach translates complex variations into friendly, human-readable advice tailored to your skill level.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400">
              <Rotate3d className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">Next-Gen 3D & 2D Boards</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Switch between classic 2D tournament boards and stunning 3D Staunton models in walnut wood, carrara marble, cyberpunk, and gold.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. BOTTOM CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="relative rounded-2xl p-8 sm:p-12 text-center bg-[#0c1424] border border-slate-800 shadow-xl space-y-6">
        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Ready to Take Your Chess to the Next Level?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Jump straight into a match against Stockfish bots, challenge your friends, or study openings with our personal AI coach today!
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 relative z-10 pt-2">
          <button
            onClick={() => onStartBotGame ? onStartBotGame() : onNavigate('play')}
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-sm flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Chess Now</span>
          </button>

          <button
            onClick={() => onNavigate('learn')}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 border border-slate-700 text-white font-semibold text-xs sm:text-sm cursor-pointer transition-all flex items-center gap-2 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Master Openings & Techniques</span>
          </button>
        </div>
      </section>
    </div>
  );
};
