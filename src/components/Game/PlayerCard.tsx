import React from 'react';
import { PieceColor, PieceType } from '../../types/chess';
import { CapturedPieces } from '../ChessBoard/CapturedPieces';
import { Clock } from 'lucide-react';

interface PlayerCardProps {
  name: string;
  avatar: string;
  title?: string;
  elo: number;
  color: PieceColor;
  isTurn: boolean;
  timeRemainingSeconds: number;
  capturedPieces: PieceType[];
  materialAdvantage: number;
  isBot?: boolean;
  isThinking?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  avatar,
  title,
  elo,
  color,
  isTurn,
  timeRemainingSeconds,
  capturedPieces,
  materialAdvantage,
  isBot = false,
  isThinking = false,
}) => {
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) return '0:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const tenths = totalSeconds < 10 ? `.${Math.floor((totalSeconds % 1) * 10)}` : '';
    return `${mins}:${secs < 10 ? '0' : ''}${secs}${tenths}`;
  };

  const isLowTime = timeRemainingSeconds < 20 && timeRemainingSeconds > 0;
  const isTimeOut = timeRemainingSeconds <= 0;

  return (
    <div
      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
        isTurn
          ? 'bg-slate-800/90 border-2 border-amber-400/80 shadow-md shadow-amber-950/20'
          : 'bg-slate-900/80 border border-slate-800 text-slate-300'
      }`}
    >
      {/* Player Information & Avatar */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="relative shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg sm:text-xl shadow-inner select-none">
            {avatar}
          </div>
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              color === 'w' ? 'bg-white' : 'bg-slate-700'
            }`}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            {title && (
              <span className="px-1 py-0.2 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded font-mono">
                {title}
              </span>
            )}
            <span className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
              {name}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ({elo})
            </span>
            {isThinking && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>

          <CapturedPieces
            color={color === 'w' ? 'b' : 'w'}
            capturedPieces={capturedPieces}
            materialAdvantage={materialAdvantage}
          />
        </div>
      </div>

      {/* Clock Countdown */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm sm:text-base transition-all select-none ${
          isTimeOut
            ? 'bg-rose-950 text-rose-400 border border-rose-600 animate-pulse'
            : isLowTime
            ? 'bg-rose-900/60 text-rose-300 border border-rose-500/70 animate-pulse'
            : isTurn
            ? 'bg-slate-950 text-amber-300 border border-amber-400/40 shadow-inner'
            : 'bg-slate-950/60 text-slate-400 border border-slate-800'
        }`}
      >
        <Clock className={`w-3.5 h-3.5 ${isTurn ? 'text-amber-400 animate-spin-slow' : 'text-slate-500'}`} />
        <span className="tabular-nums">{formatTime(timeRemainingSeconds)}</span>
      </div>
    </div>
  );
};
