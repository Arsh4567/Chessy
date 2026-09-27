import React from 'react';
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
  ArrowRight
} from 'lucide-react';
import { UserStats } from '../../utils/storage';
import { GlowingChessCenterpiece } from './GlowingChessCenterpiece';

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

  // Curated benchmark master openings
  const popularOpenings = [
    { eco: 'B90', name: 'Sicilian Defense: Najdorf', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6', whiteWin: 38, draw: 32, blackWin: 30 },
    { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6', whiteWin: 39, draw: 44, blackWin: 17 },
    { eco: 'D37', name: "Queen's Gambit Declined", moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3', whiteWin: 41, draw: 38, blackWin: 21 },
    { eco: 'E60', name: "King's Indian Defense", moves: '1. d4 Nf6 2. c4 g6 3. g3 Bg7 4. Bg2 O-O', whiteWin: 40, draw: 34, blackWin: 26 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300 pb-20 md:pb-10">
      {/* Hero Section */}
      <section className="relative rounded-2xl p-6 sm:p-8 lg:p-10 overflow-hidden bg-gradient-to-br from-[#0c1424] via-[#090e1a] to-[#070b14] border border-slate-800/80 shadow-xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Focused Copy & Clear Primary CTAs */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Stockfish 19 & Masters Database</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white leading-tight">
                Play, Learn & Master Chess
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-normal">
                Compete against adaptive Stockfish bots, challenge friends in live multiplayer rooms, and sharpen your calculation with 2,000,000+ master tournament games.
              </p>
            </div>

            {/* Clear, Uncluttered CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onStartBotGame ? onStartBotGame() : onNavigate('play')}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/20 transition-all duration-150 cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Bot Game</span>
              </button>

              <button
                onClick={() => onNavigate('friends')}
                className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold text-sm transition-all duration-150 cursor-pointer flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Live Multiplayer</span>
              </button>

              <button
                onClick={() => onSolvePuzzle ? onSolvePuzzle() : onNavigate('puzzles')}
                className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold text-sm transition-all duration-150 cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Tactics Trainer</span>
              </button>
            </div>

            {/* Performance Stats Counters */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-800/80 max-w-md">
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
                  2,800+
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Stockfish Elo</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 tabular-nums">
                  2.2M+
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Master Games</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {stats.puzzleRating}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Tactics Rating</div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Interactive Chess Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <GlowingChessCenterpiece
              onQuickPlay={onStartBotGame}
              onSolvePuzzle={onSolvePuzzle}
              puzzleRating={stats.puzzleRating}
              puzzlesSolved={stats.puzzlesSolved}
              totalGames={stats.gamesPlayed}
              wins={stats.wins}
              losses={stats.losses}
              draws={stats.draws}
            />
          </div>
        </div>
      </section>

      {/* Core Platform Modes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 font-display">
            Features & Training Modes
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Play Matches */}
          <div
            onClick={() => onNavigate('play')}
            className="p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xs font-mono text-slate-400">
                Elo 800 - 2800+
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                Play Stockfish Bots
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Choose bot personalities from Beginner to Grandmaster with full premove and takeback support.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-sky-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Start playing</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Tactical Puzzles */}
          <div
            onClick={() => onNavigate('puzzles')}
            className="p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xs font-mono text-amber-400">
                Rating {stats.puzzleRating}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Tactics & Puzzles
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Solve real game puzzles from Lichess with adaptive difficulty scaling and hints.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Solve tactics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Master Openings */}
          <div
            onClick={() => onNavigate('learn')}
            className="p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-emerald-400">
                Lichess Explorer
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Opening Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Master opening lines, ECO classifications, and win/draw distributions from grandmasters.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explore openings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Game Analysis */}
          <div
            onClick={() => onNavigate('analyze')}
            className="p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-indigo-400">
                Full Review
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Game Review & Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Analyze PGNs with move classifications, eval graphs, and tactical suggestions.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-indigo-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Deep review</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Master Openings & Player Career Snapshot */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Popular Master Openings */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Benchmark Master Openings
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Outcome statistics from FIDE 2200+ Master tournament games
              </p>
            </div>
            <button
              onClick={() => onNavigate('learn')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {popularOpenings.map((op) => (
              <div
                key={op.eco}
                onClick={() => onNavigate('learn')}
                className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-850/60 border border-slate-800/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {op.eco}
                    </span>
                    <span className="font-semibold text-xs text-slate-100 truncate">
                      {op.name}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 truncate">
                    {op.moves}
                  </div>
                </div>

                {/* Clean Win/Draw/Loss Bar */}
                <div className="w-full sm:w-48 shrink-0 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-emerald-400">W {op.whiteWin}%</span>
                    <span className="text-slate-400">D {op.draw}%</span>
                    <span className="text-rose-400">B {op.blackWin}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex bg-slate-900">
                    <div style={{ width: `${op.whiteWin}%` }} className="bg-emerald-500" />
                    <div style={{ width: `${op.draw}%` }} className="bg-slate-400" />
                    <div style={{ width: `${op.blackWin}%` }} className="bg-rose-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Player Career Dossier */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Career Overview
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                Active Player
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Tactics Rating</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">
                  {stats.puzzleRating}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Win Rate</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  {winRate}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Games Played</span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {stats.gamesPlayed}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Victories</span>
                <div className="text-2xl font-bold font-mono text-sky-400 mt-0.5">
                  {stats.wins}
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('games')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Import Chess.com Games</span>
            </button>
          </div>

          {/* Engine Spec Info */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Client-Side Stockfish 19 WASM</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Positional evaluation runs locally in a dedicated Web Worker for latency-free move analysis.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
