import React, { useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';

export type CenterpiecePieceType = 'king' | 'queen' | 'knight';

interface GlowingChessCenterpieceProps {
  onQuickPlay?: () => void;
  onSolvePuzzle?: () => void;
  puzzleRating?: number;
  puzzlesSolved?: number;
  totalGames?: number;
  wins?: number;
  losses?: number;
  draws?: number;
}

export const GlowingChessCenterpiece: React.FC<GlowingChessCenterpieceProps> = () => {
  const [selectedPiece, setSelectedPiece] = useState<CenterpiecePieceType>('king');
  const [accentColor, setAccentColor] = useState<'cyan' | 'emerald' | 'sapphire'>('cyan');
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, shineX: 50, shineY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = ((y - centerY) / centerY) * -8;
    const tiltY = ((x - centerX) / centerX) * 8;
    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;

    setTilt({ x: tiltX, y: tiltY, shineX, shineY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, shineX: 50, shineY: 50 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const colorPalettes = {
    cyan: {
      core: '#06B6D4',
      glow: 'rgba(6, 182, 212, 0.25)',
      rim: '#38BDF8',
    },
    emerald: {
      core: '#10B981',
      glow: 'rgba(16, 185, 129, 0.25)',
      rim: '#34D399',
    },
    sapphire: {
      core: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.25)',
      rim: '#60A5FA',
    },
  };

  const activePalette = colorPalettes[accentColor];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[340px] rounded-2xl p-5 overflow-hidden bg-slate-900/60 border border-slate-800 shadow-xl transition-all duration-300 flex flex-col items-center justify-between min-h-[280px]"
    >
      {/* Top Status Header */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>Stockfish 19 Engine</span>
        </div>

        {/* Piece Selector Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {(['king', 'queen', 'knight'] as CenterpiecePieceType[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPiece(p)}
              className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-colors cursor-pointer ${
                selectedPiece === p
                  ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Switch piece to ${p}`}
            >
              {p === 'king' ? '♚' : p === 'queen' ? '♛' : '♞'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Floating Chess Piece Visualizer */}
      <div className="relative my-auto flex flex-col items-center justify-center py-2 z-10 w-full select-none">
        <div
          className="relative flex items-center justify-center transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.04 : 1})`,
          }}
        >
          {/* Subtle Floor Pedestal */}
          <div
            className="absolute -bottom-4 w-28 h-5 rounded-full blur-md transition-all duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse, ${activePalette.glow} 0%, rgba(0,0,0,0.85) 60%, transparent 80%)`,
              transform: `scale(${isHovered ? 1.15 : 1}) translateY(${tilt.x * 0.4}px)`,
            }}
          />

          {/* SVG Chess Piece */}
          <div className="relative w-32 h-44 sm:w-36 sm:h-48 flex items-center justify-center animate-float">
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full drop-shadow-xl overflow-visible"
              style={{
                filter: `drop-shadow(0 10px 18px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${activePalette.glow})`,
              }}
            >
              <defs>
                <linearGradient id="glassBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#0F172A" stopOpacity="0.95" />
                  <stop offset="70%" stopColor="#020617" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
                </linearGradient>

                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={activePalette.core} stopOpacity="0.8" />
                  <stop offset="50%" stopColor={activePalette.rim} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={activePalette.core} stopOpacity="0" />
                </radialGradient>

                <filter id="coreBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
                </filter>
              </defs>

              <ellipse cx="100" cy="140" rx="36" ry="60" fill="url(#centerGlow)" filter="url(#coreBlur)" opacity="0.6" />
              <ellipse cx="100" cy="70" rx="20" ry="24" fill="url(#centerGlow)" filter="url(#coreBlur)" opacity="0.7" />

              {/* KING */}
              {selectedPiece === 'king' && (
                <g className="transition-all duration-300">
                  <path
                    d="M 40 215 C 40 205, 60 198, 100 198 C 140 198, 160 205, 160 215 C 160 225, 140 230, 100 230 C 60 230, 40 225, 40 215 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 60 198 C 65 150, 75 125, 75 105 C 75 88, 85 85, 100 85 C 115 85, 125 88, 125 105 C 125 125, 135 150, 140 198 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <path
                    d="M 68 85 C 68 62, 132 62, 132 85 C 132 92, 68 92, 68 85 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                  />
                  {/* Cross */}
                  <line x1="100" y1="38" x2="100" y2="60" stroke={activePalette.rim} strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="90" y1="46" x2="110" y2="46" stroke={activePalette.rim} strokeWidth="3.5" strokeLinecap="round" />
                </g>
              )}

              {/* QUEEN */}
              {selectedPiece === 'queen' && (
                <g className="transition-all duration-300">
                  <path
                    d="M 42 215 C 42 205, 62 198, 100 198 C 138 198, 158 205, 158 215 C 158 225, 138 230, 100 230 C 62 230, 42 225, 42 215 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 62 198 C 68 155, 78 128, 78 110 C 78 92, 86 88, 100 88 C 114 88, 122 92, 122 110 C 122 128, 132 155, 138 198 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <path
                    d="M 60 90 L 72 45 L 88 78 L 100 42 L 112 78 L 128 45 L 140 90 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.7"
                  />
                  <circle cx="100" cy="40" r="4.5" fill={activePalette.core} />
                </g>
              )}

              {/* KNIGHT */}
              {selectedPiece === 'knight' && (
                <g className="transition-all duration-300">
                  <path
                    d="M 44 215 C 44 205, 64 198, 100 198 C 136 198, 156 205, 156 215 C 156 225, 136 230, 100 230 C 64 230, 44 225, 44 215 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 64 198 C 62 165, 58 140, 72 110 C 68 105, 60 95, 66 82 C 72 70, 84 75, 94 72 C 104 60, 120 48, 138 52 C 146 54, 150 64, 142 78 C 148 90, 145 106, 142 120 C 138 142, 136 170, 138 198 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <circle cx="84" cy="85" r="3.5" fill="#FFFFFF" />
                  <circle cx="84" cy="85" r="6" fill={activePalette.core} filter="url(#coreBlur)" opacity="0.8" />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Aura Picker */}
      <div className="w-full flex items-center justify-between z-10 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Interactive 3D Piece</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Theme:</span>
          {(['cyan', 'emerald', 'sapphire'] as const).map((color) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                accentColor === color
                  ? 'scale-125 ring-2 ring-white/50 shadow-sm'
                  : 'opacity-50 hover:opacity-100'
              }`}
              style={{
                backgroundColor: colorPalettes[color].core,
                borderColor: colorPalettes[color].rim,
              }}
              title={`${color} theme`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
