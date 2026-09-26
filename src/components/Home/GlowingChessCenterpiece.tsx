import React, { useState, useRef } from 'react';
import { Sparkles, Cpu, Shield } from 'lucide-react';

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

  // Smooth mouse parallax listener
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = ((y - centerY) / centerY) * -10; // Max 10 deg
    const tiltY = ((x - centerX) / centerX) * 10;
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
      glow: 'rgba(6, 182, 212, 0.4)',
      ambient: 'rgba(6, 182, 212, 0.15)',
      rim: '#38BDF8',
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    },
    emerald: {
      core: '#10B981',
      glow: 'rgba(16, 185, 129, 0.4)',
      ambient: 'rgba(16, 185, 129, 0.15)',
      rim: '#34D399',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    sapphire: {
      core: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.4)',
      ambient: 'rgba(59, 130, 246, 0.15)',
      rim: '#60A5FA',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
  };

  const activePalette = colorPalettes[accentColor];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[340px] rounded-2xl p-4 sm:p-5 overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#050811] border border-slate-800/80 shadow-xl transition-all duration-300 flex flex-col items-center justify-between min-h-[260px] sm:min-h-[290px]"
      style={{
        boxShadow: `0 15px 35px -10px rgba(0,0,0,0.8), 0 0 25px -5px ${activePalette.ambient}`,
      }}
    >
      {/* Dynamic Ambient Background Glow */}
      <div
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-2xl pointer-events-none transition-all duration-500 opacity-60"
        style={{
          background: `radial-gradient(circle, ${activePalette.glow} 0%, transparent 70%)`,
          transform: `translate(${tilt.y * 1.5}px, ${tilt.x * 1.5}px)`,
        }}
      />
      <div
        className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-2xl pointer-events-none transition-all duration-500 opacity-40"
        style={{
          background: `radial-gradient(circle, ${activePalette.glow} 0%, transparent 70%)`,
          transform: `translate(${tilt.y * -1.5}px, ${tilt.x * -1.5}px)`,
        }}
      />

      {/* Top Status Header */}
      <div className="w-full flex items-center justify-between z-10">
        <div className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border ${activePalette.badge} flex items-center gap-1.5 shadow-sm`}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Stockfish 19 NNUE</span>
        </div>

        {/* Piece Selector Switcher */}
        <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          {(['king', 'queen', 'knight'] as CenterpiecePieceType[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPiece(p)}
              className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                selectedPiece === p
                  ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Switch Centerpiece to ${p}`}
            >
              {p === 'king' ? '♚' : p === 'queen' ? '♛' : '♞'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Floating Chess Piece Visualizer */}
      <div className="relative my-auto flex flex-col items-center justify-center py-2 z-10 w-full select-none">
        {/* Parallax Container */}
        <div
          className="relative flex items-center justify-center transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.04 : 1})`,
          }}
        >
          {/* Ambient Floor Shadow Pedestal */}
          <div
            className="absolute -bottom-4 w-28 h-5 rounded-full blur-md transition-all duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse, ${activePalette.glow} 0%, rgba(0,0,0,0.85) 60%, transparent 80%)`,
              transform: `scale(${isHovered ? 1.15 : 1}) translateY(${tilt.x * 0.4}px)`,
            }}
          />

          {/* SVG Glowing Glass Chess Piece */}
          <div className="relative w-32 h-44 sm:w-36 sm:h-48 flex items-center justify-center animate-float">
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full drop-shadow-xl overflow-visible"
              style={{
                filter: `drop-shadow(0 10px 18px rgba(0,0,0,0.9)) drop-shadow(0 0 14px ${activePalette.glow})`,
              }}
            >
              <defs>
                {/* Glass Body Gradient */}
                <linearGradient id="glassBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#0F172A" stopOpacity="0.95" />
                  <stop offset="70%" stopColor="#020617" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
                </linearGradient>

                {/* Photonic Core Laser Gradient */}
                <linearGradient id="coreLightGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={activePalette.core} stopOpacity="0.2" />
                  <stop offset="50%" stopColor={activePalette.core} stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.95" />
                </linearGradient>

                {/* Specular Highlight Gradient */}
                <linearGradient id="specularGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>

                {/* Radial Core Glow */}
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={activePalette.core} stopOpacity="0.9" />
                  <stop offset="40%" stopColor={activePalette.rim} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={activePalette.core} stopOpacity="0" />
                </radialGradient>

                {/* Glow Filter */}
                <filter id="coreBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                </filter>
              </defs>

              {/* Energy Beam */}
              <ellipse cx="100" cy="140" rx="36" ry="60" fill="url(#centerGlow)" filter="url(#coreBlur)" opacity="0.75" />
              <ellipse cx="100" cy="70" rx="20" ry="24" fill="url(#centerGlow)" filter="url(#coreBlur)" opacity="0.85" />

              {/* KING */}
              {selectedPiece === 'king' && (
                <g className="transition-all duration-500">
                  <path
                    d="M 40 215 C 40 205, 60 198, 100 198 C 140 198, 160 205, 160 215 C 160 225, 140 230, 100 230 C 60 230, 40 225, 40 215 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 52 198 C 52 192, 70 186, 100 186 C 130 186, 148 192, 148 198 L 142 206 C 130 202, 115 200, 100 200 C 85 200, 70 202, 58 206 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                  <path
                    d="M 66 186 C 75 145, 80 120, 78 98 C 76 86, 85 82, 100 82 C 115 82, 124 86, 122 98 C 120 120, 125 145, 134 186 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M 98 190 L 98 86 Q 100 80 102 86 L 102 190 Z"
                    fill="url(#coreLightGrad)"
                    filter="url(#coreBlur)"
                  />
                  <path
                    d="M 99 188 L 99 88 L 101 88 L 101 188 Z"
                    fill="#FFFFFF"
                    opacity="0.9"
                  />
                  <ellipse
                    cx="100"
                    cy="82"
                    rx="26"
                    ry="8"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <path
                    d="M 76 80 C 74 60, 84 45, 100 45 C 116 45, 126 60, 124 80 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <circle cx="82" cy="56" r="3.5" fill={activePalette.rim} opacity="0.9" />
                  <circle cx="100" cy="52" r="4.5" fill="#FFFFFF" opacity="0.95" />
                  <circle cx="118" cy="56" r="3.5" fill={activePalette.rim} opacity="0.9" />
                  <g transform="translate(100, 32)">
                    <line x1="0" y1="-14" x2="0" y2="12" stroke={activePalette.rim} strokeWidth="3" strokeLinecap="round" />
                    <line x1="-8" y1="-5" x2="8" y2="-5" stroke={activePalette.rim} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="0" cy="-5" r="3" fill="#FFFFFF" />
                    <circle cx="0" cy="-5" r="8" fill={activePalette.core} filter="url(#coreBlur)" opacity="0.8" />
                  </g>
                  <path
                    d="M 72 180 C 79 145, 83 120, 82 100 C 81 92, 85 86, 92 84"
                    fill="none"
                    stroke="url(#specularGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* QUEEN */}
              {selectedPiece === 'queen' && (
                <g className="transition-all duration-500">
                  <path
                    d="M 42 215 C 42 205, 62 198, 100 198 C 138 198, 158 205, 158 215 C 158 225, 138 230, 100 230 C 62 230, 42 225, 42 215 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 68 186 C 76 145, 82 118, 80 94 C 78 86, 86 80, 100 80 C 114 80, 122 86, 120 94 C 118 118, 124 145, 132 186 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M 98 188 L 98 75 Q 100 70 102 75 L 102 188 Z"
                    fill="url(#coreLightGrad)"
                    filter="url(#coreBlur)"
                  />
                  <path
                    d="M 70 80 L 62 50 L 80 62 L 100 42 L 120 62 L 138 50 L 130 80 Z"
                    fill="url(#glassBodyGrad)"
                    stroke={activePalette.rim}
                    strokeWidth="1.5"
                    strokeOpacity="0.7"
                  />
                  <circle cx="62" cy="48" r="3.5" fill={activePalette.rim} />
                  <circle cx="80" cy="60" r="3" fill={activePalette.rim} />
                  <circle cx="100" cy="40" r="4.5" fill="#FFFFFF" />
                  <circle cx="120" cy="60" r="3" fill={activePalette.rim} />
                  <circle cx="138" cy="48" r="3.5" fill={activePalette.rim} />
                </g>
              )}

              {/* KNIGHT */}
              {selectedPiece === 'knight' && (
                <g className="transition-all duration-500">
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
                  <path
                    d="M 126 58 C 138 75, 140 100, 134 135"
                    fill="none"
                    stroke={activePalette.rim}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <circle cx="84" cy="85" r="3" fill="#FFFFFF" />
                  <circle cx="84" cy="85" r="7" fill={activePalette.core} filter="url(#coreBlur)" opacity="0.9" />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Aura Picker & Status */}
      <div className="w-full flex items-center justify-between z-10 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Glass 3D Model</span>
        </div>

        {/* Aura Color Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono">Aura:</span>
          {(['cyan', 'emerald', 'sapphire'] as const).map((color) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                accentColor === color
                  ? 'scale-125 ring-2 ring-white/50 shadow-sm'
                  : 'opacity-50 hover:opacity-100'
              }`}
              style={{
                backgroundColor: colorPalettes[color].core,
                borderColor: colorPalettes[color].rim,
              }}
              title={`${color} aura`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
