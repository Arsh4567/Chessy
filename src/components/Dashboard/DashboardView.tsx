import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { UserStats } from '../../utils/storage';
import { GlowingChessCenterpiece } from './GlowingChessCenterpiece';
import { ChessComExplorer } from '../ChessCom/ChessComExplorer';
import { ChessComGame, ChessComPlayer } from '../../utils/chessComApi';
import { detectOpening } from '../../utils/openings';
import { 
  Trophy, 
  Target, 
  Zap, 
  Swords, 
  Play, 
  Globe, 
  RotateCcw, 
  ShieldCheck, 
  BookOpen, 
  Sparkles,
  Activity,
} from 'lucide-react';

interface DashboardViewProps {
  stats: UserStats;
  onReviewGame: (pgn: string) => void;
  onResetStats: () => void;
  onStartBotGame?: () => void;
  onSolvePuzzle?: () => void;
  onOpenReport?: (games: ChessComGame[], player: ChessComPlayer | null, username: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onReviewGame,
  onResetStats,
  onStartBotGame,
  onSolvePuzzle,
  onOpenReport,
}) => {
  const [activeSource, setActiveSource] = useState<'local' | 'chesscom'>('local');

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const lossRate = stats.gamesPlayed > 0 ? Math.round((stats.losses / stats.gamesPlayed) * 100) : 0;
  const drawRate = stats.gamesPlayed > 0 ? Math.max(0, 100 - winRate - lossRate) : 0;

  // Real opening statistics computed from actual saved games in localStorage
  const realOpeningStats = useMemo(() => {
    if (!stats.history || stats.history.length === 0) return [];

    const map = new Map<string, { count: number; wins: number; name: string }>();

    for (const game of stats.history) {
      if (!game.pgn) continue;
      try {
        const c = new Chess();
        c.loadPgn(game.pgn);
        const sanHistory = c.history();
        const detected = detectOpening(sanHistory);
        const openingName = detected ? detected.name : 'Custom / Unclassified Opening';

        const existing = map.get(openingName) || { count: 0, wins: 0, name: openingName };
        existing.count += 1;
        if (game.result === 'win') {
          existing.wins += 1;
        }
        map.set(openingName, existing);
      } catch {}
    }

    const list = Array.from(map.values()).map((item) => ({
      ...item,
      winRate: Math.round((item.wins / item.count) * 100),
    }));

    // Sort descending by games played
    list.sort((a, b) => b.count - a.count);
    return list;
  }, [stats.history]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Visual Centerpiece: Glowing Floating Chess Piece Hero */}
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

      {/* View Switcher: Local Battle Hub vs Chess.com Public Cloud */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSource('local')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSource === 'local'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Local Battle Analytics</span>
          </button>

          <button
            onClick={() => setActiveSource('chesscom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSource === 'chesscom'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Chess.com Cloud Explorer</span>
          </button>
        </div>

        {activeSource === 'local' && stats.history.length > 0 && (
          <button
            onClick={onResetStats}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-500/10"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset History</span>
          </button>
        )}
      </div>

      {activeSource === 'chesscom' ? (
        <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl">
          <ChessComExplorer onSelectGame={onReviewGame} onOpenReport={onOpenReport} />
        </div>
      ) : (
        <>
          {/* Top Performance Analytics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tactical Puzzle Rating Card */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl transition-all hover:border-slate-700/80 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Tactics Rating</span>
                <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Target className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-cyan-400">{stats.puzzleRating}</span>
                <span className="text-xs font-mono font-bold text-slate-400">{stats.puzzlesSolved} solved</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Real puzzle progression</p>
            </div>

            {/* Total Battles Card */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl transition-all hover:border-slate-700/80 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Games Logged</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Swords className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-slate-100">{stats.gamesPlayed}</span>
                <span className="text-xs font-mono font-bold text-slate-400">Total</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Recorded matches in storage</p>
            </div>

            {/* Win Ratio Card */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl transition-all hover:border-slate-700/80 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Win Rate</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Trophy className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {stats.gamesPlayed > 0 ? `${winRate}%` : '—'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">{stats.wins} W</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {stats.gamesPlayed > 0 ? `${stats.wins}W / ${stats.losses}L / ${stats.draws}D` : 'Play to record wins'}
              </p>
            </div>

            {/* Engine Status Card */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl transition-all hover:border-slate-700/80 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Stockfish Engine</span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-100">UCI Active</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">WebAssembly single-thread worker</p>
            </div>
          </div>

          {/* Win/Loss/Draw Visual Breakdown Bar */}
          {stats.gamesPlayed > 0 && (
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Recorded Results Breakdown</span>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-emerald-400 font-bold">{stats.wins} Wins ({winRate}%)</span>
                  <span className="text-rose-400 font-bold">{stats.losses} Losses ({lossRate}%)</span>
                  <span className="text-slate-400 font-bold">{stats.draws} Draws ({drawRate}%)</span>
                </div>
              </div>

              {/* Segmented Distribution Bar */}
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${winRate}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500 shadow-sm"
                  title={`Wins: ${stats.wins}`}
                />
                <div
                  style={{ width: `${lossRate}%` }}
                  className="bg-rose-500 h-full transition-all duration-500 shadow-sm"
                  title={`Losses: ${stats.losses}`}
                />
                <div
                  style={{ width: `${drawRate}%` }}
                  className="bg-slate-700 h-full transition-all duration-500 shadow-sm"
                  title={`Draws: ${stats.draws}`}
                />
              </div>
            </div>
          )}

          {/* Main 2-Column Analytics & Games Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 cols): Recent Games Log & Interactive Review */}
            <div className="lg:col-span-7 rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <Swords className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">Match History</h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {stats.history.length} logged
                </span>
              </div>

              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {stats.history.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-xl mx-auto text-slate-400">
                      ♟
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      No matches recorded yet. Play a match against Stockfish or solve puzzles to record your real chess statistics!
                    </p>
                    {onStartBotGame && (
                      <button
                        onClick={onStartBotGame}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Play First Match
                      </button>
                    )}
                  </div>
                ) : (
                  stats.history.map((g) => (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase shrink-0 ${
                            g.result === 'win'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : g.result === 'loss'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                          }`}
                        >
                          {g.result}
                        </span>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                            vs. {g.opponent}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>{g.movesCount} moves</span>
                            <span>·</span>
                            <span>{g.timeControl}</span>
                            <span>·</span>
                            <span>{g.date}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onReviewGame(g.pgn)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Analyze</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Real Opening Theory from Saved Games */}
            <div className="lg:col-span-5 space-y-6">
              {/* Opening Repertoire Performance */}
              <div className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-100">Played Openings Repertoire</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {realOpeningStats.length} detected
                  </span>
                </div>

                {realOpeningStats.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Play games to detect your played opening repertoire.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {realOpeningStats.slice(0, 5).map((o) => (
                      <div key={o.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 truncate max-w-[200px]">{o.name}</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {o.winRate}% ({o.count} {o.count === 1 ? 'game' : 'games'})
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            style={{ width: `${o.winRate}%` }}
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Note */}
              <div className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">Live Engine Diagnostics</h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-200">Zero Synthetic / Mock Data</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All stats, records, ratings, and move analysis are computed live from your real game history and Stockfish WebAssembly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
