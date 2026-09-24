import React from 'react';
import { Flag, Handshake, RotateCcw, ArrowLeftRight, Lightbulb, Volume2, VolumeX, Palette } from 'lucide-react';
import { GameMode } from '../../types/chess';

interface GameControlsProps {
  mode: GameMode;
  onResign: () => void;
  onOfferDraw: () => void;
  onTakeback?: () => void;
  onFlipBoard: () => void;
  onRequestHint: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentTheme: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble';
  onChangeTheme: (theme: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble') => void;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  mode,
  onResign,
  onOfferDraw,
  onTakeback,
  onFlipBoard,
  onRequestHint,
  isMuted,
  onToggleMute,
  currentTheme,
  onChangeTheme,
  disabled = false,
}) => {
  const allowTakeback = mode === 'bot' || mode === 'pvp-local' || mode === 'analysis';

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
      <div className="flex items-center gap-1">
        {/* Resign */}
        <button
          onClick={onResign}
          disabled={disabled}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/60 transition-colors disabled:opacity-40"
          title="Resign Game"
        >
          <Flag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Resign</span>
        </button>

        {/* Offer Draw */}
        <button
          onClick={onOfferDraw}
          disabled={disabled}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-amber-300 hover:bg-amber-950/40 border border-transparent hover:border-amber-800/60 transition-colors disabled:opacity-40"
          title="Offer Draw"
        >
          <Handshake className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Draw</span>
        </button>

        {/* Takeback */}
        {allowTakeback && onTakeback && (
          <button
            onClick={onTakeback}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors disabled:opacity-40"
            title="Take Back Move"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Takeback</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Engine Hint */}
        <button
          onClick={onRequestHint}
          disabled={disabled}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 transition-colors"
          title="Stockfish Engine Hint"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Hint</span>
        </button>

        {/* Flip Board */}
        <button
          onClick={onFlipBoard}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Flip Board"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Theme Selector */}
        <select
          value={currentTheme}
          onChange={(e) => onChangeTheme(e.target.value as any)}
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 outline-none cursor-pointer focus:border-amber-400"
          title="Board Theme"
        >
          <option value="emerald">Emerald</option>
          <option value="wood">Wood</option>
          <option value="midnight">Midnight</option>
          <option value="cyber">Cyber</option>
          <option value="marble">Marble</option>
        </select>
      </div>
    </div>
  );
};
