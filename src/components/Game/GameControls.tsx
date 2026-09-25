import React from 'react';
import { Flag, Handshake, RotateCcw, ArrowLeftRight, Lightbulb, Volume2, VolumeX, Palette, Sliders } from 'lucide-react';
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
  onRequestHint,
  isMuted,
  onToggleMute,
  currentTheme,
  onChangeTheme,
  evaluationDepth = 14,
  onDepthChange,
  disabled = false,
}) => {
  const allowTakeback = mode === 'bot' || mode === 'pvp-local' || mode === 'analysis';

  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          {/* Resign */}
          <button
            onClick={onResign}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/60 transition-colors disabled:opacity-40"
            title="Resign"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resign</span>
          </button>

          {/* Offer Draw */}
          <button
            onClick={onOfferDraw}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-amber-300 hover:bg-amber-950/40 border border-transparent hover:border-amber-800/60 transition-colors disabled:opacity-40"
            title="Draw"
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
              title="Takeback"
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
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-300 bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 transition-colors cursor-pointer"
            title="Hint"
          >
            <Lightbulb className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Hint</span>
          </button>

          {/* Flip Board */}
          <button
            onClick={onFlipBoard}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Flip"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Theme Selector */}
          <select
            value={currentTheme}
            onChange={(e) => onChangeTheme(e.target.value as any)}
            className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 outline-none cursor-pointer focus:border-sky-400"
            title="Theme"
          >
            <option value="cobalt">Cobalt</option>
            <option value="emerald">Emerald</option>
            <option value="wood">Wood</option>
            <option value="midnight">Midnight</option>
            <option value="cyber">Cyber</option>
            <option value="marble">Marble</option>
          </select>
        </div>
      </div>

      {/* Stockfish Evaluation Depth Slider Control */}
      {onDepthChange && (
        <div className="flex items-center justify-between gap-3 px-1 pt-1.5 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] sm:text-xs">Stockfish Depth:</span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/50 text-[11px] font-bold text-indigo-300 min-w-[24px]">
              {evaluationDepth}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-[200px] sm:max-w-[240px]">
            <span className="text-[10px] font-mono text-slate-400">12</span>
            <input
              type="range"
              min={12}
              max={22}
              step={1}
              value={evaluationDepth}
              onChange={(e) => onDepthChange(parseInt(e.target.value, 10))}
              aria-label="Stockfish evaluation depth"
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              title={`Adjust Stockfish depth: ${evaluationDepth} (12 - 22)`}
            />
            <span className="text-[10px] font-mono text-slate-400">22</span>
          </div>
        </div>
      )}
    </div>
  );
};
