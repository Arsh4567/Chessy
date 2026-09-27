import React from 'react';
import { Flag, Handshake, RotateCcw, ArrowLeftRight, Volume2, VolumeX, Palette } from 'lucide-react';
import { GameMode } from '../../types/chess';

interface GameControlsProps {
  mode: GameMode;
  onResign: () => void;
  onOfferDraw: () => void;
  onTakeback?: () => void;
  onFlipBoard: () => void;
  onRequestHint?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentTheme: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble' | 'cobalt';
  onChangeTheme: (theme: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble' | 'cobalt') => void;
  evaluationDepth?: number;
  onDepthChange?: (depth: number) => void;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  mode,
  onResign,
  onOfferDraw,
  onTakeback,
  onFlipBoard,
  isMuted,
  onToggleMute,
  currentTheme,
  onChangeTheme,
  disabled = false,
}) => {
  const allowTakeback = mode === 'bot' || mode === 'pvp-local' || mode === 'analysis';

  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          {/* Resign */}
          <button
            onClick={onResign}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 transition-colors disabled:opacity-40 cursor-pointer"
            title="Resign Game"
            aria-label="Resign Game"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Resign</span>
          </button>

          {/* Offer Draw */}
          <button
            onClick={onOfferDraw}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-300 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-800/60 transition-colors disabled:opacity-40 cursor-pointer"
            title="Offer Draw"
            aria-label="Offer Draw"
          >
            <Handshake className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Draw</span>
          </button>

          {/* Takeback */}
          {allowTakeback && onTakeback && (
            <button
              onClick={onTakeback}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
              title="Takeback Move"
              aria-label="Takeback Move"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Takeback</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Flip Board */}
          <button
            onClick={onFlipBoard}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            title="Flip Board Orientation"
            aria-label="Flip Board"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            title={isMuted ? 'Unmute Chess Sounds' : 'Mute Chess Sounds'}
            aria-label={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg px-2 py-1 border border-slate-700">
            <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={currentTheme}
              onChange={(e) => onChangeTheme(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer font-medium"
              title="Select Board Theme"
              aria-label="Select Board Theme"
            >
              <option value="cobalt" className="bg-slate-900">Cobalt</option>
              <option value="emerald" className="bg-slate-900">Emerald</option>
              <option value="wood" className="bg-slate-900">Wood</option>
              <option value="midnight" className="bg-slate-900">Midnight</option>
              <option value="cyber" className="bg-slate-900">Cyber</option>
              <option value="marble" className="bg-slate-900">Marble</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
