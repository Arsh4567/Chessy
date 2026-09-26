import React from 'react';
import { 
  Play, 
  Search, 
  Zap, 
  BookOpen, 
  Globe, 
  Trophy, 
  ChevronRight, 
  Cpu, 
  ArrowRight,
  Shield,
  Target,
  BarChart3,
  Users
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 overflow-hidden bg-gradient-to-br from-[#0c1424] via-[#090e1a] to-[#060912] border border-slate-800/90 shadow-xl shadow-black/60">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Hero Copy & Action Bar */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="text-[11px] font-mono font-semibold text-sky-400 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Grandmaster Engine & Masters Database</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white leading-tight text-balance">
                Command the Board with Grandmaster Precision.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed font-normal">
                Analyze games with client-side Stockfish 19 WebAssembly, explore 2,000,000+ FIDE master opening games, and sharpen your calculation with adaptive tactics training.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => onStartBotGame ? onStartBotGame() : onNavigate('play')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/25 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Stockfish Bot</span>
              </button>

              <button
                onClick={() => onNavigate('analyze')}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span>Analyze Position</span>
              </button>

              <button
                onClick={() => onSolvePuzzle ? onSolvePuzzle() : onNavigate('puzzles')}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Solve Puzzles ({stats.puzzleRating})</span>
              </button>
            </div>

            {/* Performance Metric Counters */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 max-w-lg">
              <div>
                <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums">
                  2,800+
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Engine Max Elo</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black font-mono text-sky-400 tabular-nums">
                  2.2M+
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Master Games</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-400 tabular-nums">
                  {stats.puzzlesSolved}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Puzzles Solved</div>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Centerpiece */}
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

      {/* Quick Launchpad Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-400" />
            <span>Platform Hub & Modes</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Play */}
          <div
            onClick={() => onNavigate('play')}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg hover:shadow-sky-500/10"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg">
                Elo 800 - 2800+
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                Play Matches
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Compete against tailored Stockfish bots, local friends, or load custom FEN setups.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-sky-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Start playing</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Puzzles */}
          <div
            onClick={() => onNavigate('puzzles')}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg hover:shadow-amber-500/10"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                Rating {stats.puzzleRating}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Tactical Puzzles
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Sharpen your tactical radar with adaptive puzzle rating progression and streaks.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Train tactics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Learn & Openings */}
          <div
            onClick={() => onNavigate('learn')}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Lichess Masters
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Master Openings
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Explore grandmaster theory, opening ECO trees, and win/draw/loss distribution curves.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explore openings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Analyze & Games */}
          <div
            onClick={() => onNavigate('analyze')}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg hover:shadow-purple-500/10"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                Stockfish 19
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Game Review
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Classify every move from Brilliant to Blunder with evaluation graphs and AI tactical breakdown.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Deep review</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Master Openings & Trend Insights */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Popular Master Openings */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Benchmark Master Openings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Outcome statistics based on FIDE 2200+ Master tournament games
              </p>
            </div>
            <button
              onClick={() => onNavigate('learn')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View all openings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {popularOpenings.map((op) => (
              <div
                key={op.eco}
                onClick={() => onNavigate('learn')}
                className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[10px] font-mono font-bold text-sky-300">
                      {op.eco}
                    </span>
                    <span className="font-bold text-xs text-slate-100 truncate">
                      {op.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    {op.moves}
                  </div>
                </div>

                {/* Outcome Bar */}
                <div className="w-full sm:w-48 shrink-0 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-emerald-400">W {op.whiteWin}%</span>
                    <span className="text-slate-300">D {op.draw}%</span>
                    <span className="text-rose-400">B {op.blackWin}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800">
                    <div style={{ width: `${op.whiteWin}%` }} className="bg-emerald-600" />
                    <div style={{ width: `${op.draw}%` }} className="bg-slate-400" />
                    <div style={{ width: `${op.blackWin}%` }} className="bg-rose-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Player Snapshot & Engine Spec */}
        <div className="lg:col-span-4 space-y-4">
          {/* Player Snapshot Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Player Dossier
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium">Tactics Rating</span>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {stats.puzzleRating}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium">Win Rate</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {winRate}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium">Games Played</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {stats.gamesPlayed}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium">Bot Victories</span>
                <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                  {stats.wins}
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('games')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Import Chess.com Archive</span>
            </button>
          </div>

          {/* Quick Engine Spec Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Stockfish 19 WebAssembly</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engine calculation runs client-side in a dedicated Web Worker with zero network latency and full NNUE positional evaluation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
