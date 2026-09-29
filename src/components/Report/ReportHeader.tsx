import React from 'react';
import { ChessComPlayer } from '../../utils/chessComApi';
import { RefreshCw } from 'lucide-react';

interface ReportHeaderProps {
  player?: ChessComPlayer | null;
  username: string;
  gamesAnalyzedCount: number;
  onRefreshGames?: () => void;
  isLoading?: boolean;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  player,
  username,
  gamesAnalyzedCount,
  onRefreshGames,
  isLoading = false,
}) => {
  return (
    <div className="bg-[#0c1424] border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        {player?.avatar ? (
          <img
            src={player.avatar}
            alt={username}
            className="w-14 h-14 rounded-2xl object-cover border border-slate-700/80 shadow-sm"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl font-black text-amber-400">
            ♟️
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display">
              Personal Chess Report
            </h1>
            {player?.title && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                {player.title}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Player: <span className="text-amber-400 font-semibold">{username || 'Unknown'}</span> ·{' '}
            {gamesAnalyzedCount} games analyzed with Stockfish
          </p>
        </div>
      </div>

      {onRefreshGames && (
        <button
          onClick={onRefreshGames}
          disabled={isLoading}
          className="self-start md:self-center px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Games</span>
        </button>
      )}
    </div>
  );
};
