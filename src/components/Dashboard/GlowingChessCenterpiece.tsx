import React, { useState, useRef } from 'react';
import { Crown, Zap } from 'lucide-react';

export type CenterpiecePieceType = 'king' | 'queen' | 'knight';

interface GlowingChessCenterpieceProps {
  onQuickPlay?: () => void;
  onSolvePuzzle?: () => void;
  puzzleRating: number;
  puzzlesSolved: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
}

export const GlowingChessCenterpiece: React.FC<GlowingChessCenterpieceProps> = ({
  onQuickPlay,
  onSolvePuzzle,
  puzzleRating,
  puzzlesSolved,
  totalGames,
  wins,
  losses,
  draws,
}) => {
  const [selectedPiece, setSelectedPiece] = useState<CenterpiecePieceType>('king');
  const [accentColor, setAccentColor] = useState<'emerald' | 'cyan' | 'sapphire'>('emerald');
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

    const tiltX = ((y - centerY) / centerY) * -8; // Max 8 deg
    const tiltY = ((x - centerX) / centerX) * 8; // Max 8 deg
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
    emerald: {
      core: '#10B981',
      glow: 'rgba(16, 185, 129, 0.35)',
      ambient: 'rgba(16, 185, 129, 0.12)',
      rim: '#34D399',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    cyan: {
      core: '#06B6D4',
      glow: 'rgba(6, 182, 212, 0.35)',
      ambient: 'rgba(6, 182, 212, 0.12)',
      rim: '#38BDF8',
      border: 'border-cyan-500/30',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    },
    sapphire: {
      core: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.35)',
      ambient: 'rgba(59, 130, 246, 0.12)',
      rim: '#60A5FA',
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
  };

  const activePalette = colorPalettes[accentColor];
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-3xl p-6 sm:p-8 overflow-hidden bg-slate-950/70 border border-slate-800/80 backdrop-blur-2xl shadow-2xl transition-all duration-300 group"
      style={{
        boxShadow: `0 20px 50px -15px rgba(0,0,0,0.7), 0 0 35px -5px ${activePalette.ambient}`,
      }}
    >
      {/* Dynamic Ambient Background Glows */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background: `radial-gradient(circle, ${activePalette.glow} 0%, transparent 70%)`,
          transform: `translate(${tilt.y * 2}px, ${tilt.x * 2}px)`,
        }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-40"
        style={{
          background: `radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)`,
          transform: `translate(${tilt.y * -1.5}px, ${tilt.x * -1.5}px)`,
        }}
      />

      {/* Subtle Grid & Specular Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* Main Grid: Left copy & Quick Play, Right 3D Floating Piece */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Player Title, Live Status & Quick Action Buttons */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase border ${activePalette.badge} flex items-center gap-1.5 shadow-sm`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Stockfish 19 WebAssembly Engine
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-slate-100 tracking-tight leading-none">
              Strategic <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Mastery</span> Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed font-normal">
              Deep positional calculation, high-precision move accuracy analytics, and authentic battle history.
            </p>
          </div>

          {/* Key Real Stats Pills */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md transition-all hover:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tactics Rating</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400">{puzzleRating}</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{puzzlesSolved} solved</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md transition-all hover:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Games Played</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-100">{totalGames}</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                {totalGames > 0 ? `${wins}W · ${losses}L · ${draws}D` : 'No matches yet'}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md transition-all hover:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Win Ratio</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {totalGames > 0 ? `${winRate}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                {totalGames > 0 ? `${wins} victories` : 'Play to record'}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            {onQuickPlay && (
              <button
                onClick={onQuickPlay}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>Play Bot Match</span>
              </button>
            )}

            {onSolvePuzzle && (
              <button
                onClick={onSolvePuzzle}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-xs sm:text-sm transition-all duration-200 hover:border-slate-600 hover:text-white cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Solve Tactics</span>
              </button>
            )}

            {/* Piece & Accent Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800/90 ml-auto">
              {(['king', 'queen', 'knight'] as CenterpiecePieceType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPiece(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                    selectedPiece === p
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Switch Centerpiece to ${p}`}
                >
                  {p === 'king' ? '♚' : p === 'queen' ? '♛' : '♞'} {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 3D Floating Glowing Glass Chess Piece Centerpiece */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[300px] sm:min-h-[340px]">
          {/* Parallax Container */}
          <div
            className="relative flex items-center justify-center transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.04 : 1})`,
            }}
          >
            {/* Ambient Caustic Floor Pedestal Shadow */}
            <div
              className="absolute -bottom-8 w-44 h-8 rounded-full blur-md transition-all duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse, ${activePalette.glow} 0%, rgba(0,0,0,0.8) 60%, transparent 80%)`,
                transform: `scale(${isHovered ? 1.15 : 1}) translateY(${tilt.x * 0.5}px)`,
              }}
            />

            {/* Floating SVG Chess Piece Artwork with Translucent Glass, Photonic Core & Specular Rim */}
            <div className="relative w-56 h-72 sm:w-64 sm:h-80 flex items-center justify-center animate-float select-none">
              <svg
                viewBox="0 0 200 240"
                className="w-full h-full drop-shadow-2xl overflow-visible"
                style={{
                  filter: `drop-shadow(0 15px 25px rgba(0,0,0,0.9)) drop-shadow(0 0 20px ${activePalette.glow})`,
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
                    <stop offset="50%" stopColor={activePalette.core} stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.95" />
                  </linearGradient>

                  {/* Specular Highlight Gradient */}
                  <linearGradient id="specularGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
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

                {/* Back Core Energy Core Beam */}
                <ellipse cx="100" cy="140" rx="36" ry="60" fill="url(#centerGlow)" filter="url(#coreBlur)" opacity="0.7" />
                <ellipse cx="100" cy="70" rx="20" ry="24" fill="url(#centerGlow)" filter="url(#coreBlur)" opacity="0.8" />

                {/* KING SVG PATH */}
                {selectedPiece === 'king' && (
                  <g className="transition-all duration-500">
                    {/* Pedestal Base */}
                    <path
                      d="M 40 215 C 40 205, 60 198, 100 198 C 140 198, 160 205, 160 215 C 160 225, 140 230, 100 230 C 60 230, 40 225, 40 215 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                    />
                    {/* Base Tier 2 */}
                    <path
                      d="M 52 198 C 52 192, 70 186, 100 186 C 130 186, 148 192, 148 198 L 142 206 C 130 202, 115 200, 100 200 C 85 200, 70 202, 58 206 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1"
                      strokeOpacity="0.3"
                    />

                    {/* Main Torso & Waist */}
                    <path
                      d="M 66 186 C 75 145, 80 120, 78 98 C 76 86, 85 82, 100 82 C 115 82, 124 86, 122 98 C 120 120, 125 145, 134 186 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                    />

                    {/* Internal Photonic Energy Spine */}
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

                    {/* Collar Ring */}
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

                    {/* King Head / Dome */}
                    <path
                      d="M 76 80 C 74 60, 84 45, 100 45 C 116 45, 126 60, 124 80 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.6"
                    />

                    {/* Crown Rim Beads */}
                    <circle cx="82" cy="56" r="3.5" fill={activePalette.rim} opacity="0.9" />
                    <circle cx="100" cy="52" r="4.5" fill="#FFFFFF" opacity="0.95" />
                    <circle cx="118" cy="56" r="3.5" fill={activePalette.rim} opacity="0.9" />

                    {/* Royal Cross Finial */}
                    <g transform="translate(100, 32)">
                      <line x1="0" y1="-14" x2="0" y2="12" stroke={activePalette.rim} strokeWidth="3" strokeLinecap="round" />
                      <line x1="-8" y1="-5" x2="8" y2="-5" stroke={activePalette.rim} strokeWidth="3" strokeLinecap="round" />
                      <circle cx="0" cy="-5" r="3" fill="#FFFFFF" />
                      <circle cx="0" cy="-5" r="8" fill={activePalette.core} filter="url(#coreBlur)" opacity="0.8" />
                    </g>

                    {/* Left Specular Glass Highlight Arc */}
                    <path
                      d="M 72 180 C 79 145, 83 120, 82 100 C 81 92, 85 86, 92 84"
                      fill="none"
                      stroke="url(#specularGrad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* QUEEN SVG PATH */}
                {selectedPiece === 'queen' && (
                  <g className="transition-all duration-500">
                    {/* Base */}
                    <path
                      d="M 42 215 C 42 205, 62 198, 100 198 C 138 198, 158 205, 158 215 C 158 225, 138 230, 100 230 C 62 230, 42 225, 42 215 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                    />
                    {/* Torso */}
                    <path
                      d="M 68 186 C 76 145, 82 118, 80 94 C 78 86, 86 80, 100 80 C 114 80, 122 86, 120 94 C 118 118, 124 145, 132 186 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                    />
                    {/* Core Spine */}
                    <path
                      d="M 98 188 L 98 75 Q 100 70 102 75 L 102 188 Z"
                      fill="url(#coreLightGrad)"
                      filter="url(#coreBlur)"
                    />
                    {/* Queen Crown Petals */}
                    <path
                      d="M 70 80 L 62 50 L 80 62 L 100 42 L 120 62 L 138 50 L 130 80 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.7"
                    />
                    {/* Crown Jewels */}
                    <circle cx="62" cy="48" r="3.5" fill={activePalette.rim} />
                    <circle cx="80" cy="60" r="3" fill={activePalette.rim} />
                    <circle cx="100" cy="40" r="4.5" fill="#FFFFFF" />
                    <circle cx="120" cy="60" r="3" fill={activePalette.rim} />
                    <circle cx="138" cy="48" r="3.5" fill={activePalette.rim} />
                  </g>
                )}

                {/* KNIGHT SVG PATH */}
                {selectedPiece === 'knight' && (
                  <g className="transition-all duration-500">
                    {/* Base */}
                    <path
                      d="M 44 215 C 44 205, 64 198, 100 198 C 136 198, 156 205, 156 215 C 156 225, 136 230, 100 230 C 64 230, 44 225, 44 215 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                    />
                    {/* Knight Bust Silhouette */}
                    <path
                      d="M 64 198 C 62 165, 58 140, 72 110 C 68 105, 60 95, 66 82 C 72 70, 84 75, 94 72 C 104 60, 120 48, 138 52 C 146 54, 150 64, 142 78 C 148 90, 145 106, 142 120 C 138 142, 136 170, 138 198 Z"
                      fill="url(#glassBodyGrad)"
                      stroke={activePalette.rim}
                      strokeWidth="1.5"
                      strokeOpacity="0.6"
                    />
                    {/* Mane Arc */}
                    <path
                      d="M 126 58 C 138 75, 140 100, 134 135"
                      fill="none"
                      stroke={activePalette.rim}
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                    {/* Knight Eye Glowing Jewel */}
                    <circle cx="84" cy="85" r="3" fill="#FFFFFF" />
                    <circle cx="84" cy="85" r="7" fill={activePalette.core} filter="url(#coreBlur)" opacity="0.9" />
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Interactive Palette Pill Dock */}
          <div className="flex items-center gap-2 mt-4 z-20">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Aura:</span>
            {(['emerald', 'cyan', 'sapphire'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                  accentColor === color
                    ? 'scale-125 ring-2 ring-white/40 shadow-sm'
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
    </div>
  );
};
