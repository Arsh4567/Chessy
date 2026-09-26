import React, { useState } from 'react';
import { ChessComExplorer } from '../ChessCom/ChessComExplorer';
import { PersonalReportView } from '../Report/PersonalReportView';
import { ChessComGame, ChessComPlayer, fetchChessComRecentGames } from '../../utils/chessComApi';
import { 
  Globe, 
  FileText, 
  Search, 
  Sparkles, 
  BarChart3, 
  ArrowRight,
  Database,
  RefreshCw
} from 'lucide-react';

interface GamesViewProps {
  games: ChessComGame[];
  player: ChessComPlayer | null;
  username: string;
  isLoading: boolean;
  onFetchGames: (username: string) => void;
  onAnalyzeGame: (pgn: string) => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  games,
  player,
  username,
  isLoading,
  onFetchGames,
  onAnalyzeGame,
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'report'>('explorer');
  const [searchInput, setSearchInput] = useState<string>(username || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onFetchGames(searchInput.trim());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Search Bar */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400">
            <Globe className="w-4 h-4" />
            <span>Chess.com Public Cloud Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
            Games & Performance Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Import recent games from any public Chess.com account to review with Stockfish 19 or generate a personalized grandmaster training report.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. magnuscarlsen, hikaru"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Fetch</span>
          </button>
        </form>
      </div>

      {/* Mode Sub-Navigation (Archive vs Report) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'explorer'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Game Archive ({games.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'report'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Personal Engine Report</span>
        </button>
      </div>

      {/* Content Rendering */}
      {activeTab === 'explorer' ? (
        <ChessComExplorer
          initialUsername={username || 'hikaru'}
          onSelectGame={onAnalyzeGame}
          onOpenReport={(loadedGames: ChessComGame[], loadedPlayer: ChessComPlayer | null, loadedUsername: string) => {
            setActiveTab('report');
          }}
        />
      ) : games.length > 0 ? (
        <PersonalReportView
          games={games}
          player={player}
          username={username}
          isLoading={isLoading}
          onRefreshGames={() => onFetchGames(username)}
          onAnalyzeGame={onAnalyzeGame}
        />
      ) : (
        <div className="p-12 text-center bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No games loaded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Search any public Chess.com player above (or try <strong className="text-slate-200 font-mono">hikaru</strong> or <strong className="text-slate-200 font-mono">magnuscarlsen</strong>) to generate your comprehensive Stockfish report.
          </p>
        </div>
      )}
    </div>
  );
};
