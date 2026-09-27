import React, { useState, useId } from 'react';
import { PieceType, PieceColor } from '../../types/chess';

interface PieceIconProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

export const PIECE_PNG_URLS: Record<PieceColor, Record<PieceType, string>> = {
  w: {
    p: '/white_pawn.png',
    r: '/white_rook.png',
    n: '/white_knight.png',
    b: '/white_bishop.png',
    q: '/white_queen.png',
    k: '/white_king.png',
  },
  b: {
    p: '/black_pawn.png',
    r: '/black_rook.png',
    n: '/black_knight.png',
    b: '/black_bishop.png',
    q: '/black_queen.png',
    k: '/black_king.png',
  },
};

/**
 * Realistic 3D Master Chess Piece Renderer
 * Uses custom high-definition Staunton 3D PNG pieces with vector SVG fallback.
 */
export const PieceIcon: React.FC<PieceIconProps> = React.memo(({ type, color, className = 'w-full h-full' }) => {
  const [hasImageError, setHasImageError] = useState<boolean>(false);
  const isWhite = color === 'w';
  const rawId = useId().replace(/:/g, '_');
  const idPrefix = `st_${color}_${type}_${rawId}`;

  const pngSrc = PIECE_PNG_URLS[color]?.[type];

  // Primary High-Fidelity 3D PNG piece render
  if (pngSrc && !hasImageError) {
    return (
      <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
        <img
          src={pngSrc}
          alt={`${isWhite ? 'White' : 'Black'} ${type}`}
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)] transition-transform duration-100 will-change-transform"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
        />
      </div>
    );
  }

  // Resilient SVG Staunton Fallback definitions
  const strokeColor = isWhite ? '#475569' : '#020617';
  const strokeWidth = 1.1;
  const detailColor = isWhite ? '#94a3b8' : '#0f172a';
  const highlightLine = isWhite ? '#ffffff' : '#475569';

  const defs = (
    <defs>
      <filter id={`${idPrefix}_shadow`} x="-20%" y="-15%" width="140%" height="135%">
        <feDropShadow dx="0" dy="2.2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.38" />
      </filter>

      <linearGradient id={`${idPrefix}_body`} x1="0.18" y1="0.08" x2="0.82" y2="0.92">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#f8fafc" />
            <stop offset="68%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#475569" />
            <stop offset="22%" stopColor="#334155" />
            <stop offset="65%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </>
        )}
      </linearGradient>

      <linearGradient id={`${idPrefix}_base`} x1="0.1" y1="0.2" x2="0.9" y2="0.8">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#020617" />
          </>
        )}
      </linearGradient>
    </defs>
  );

  switch (type) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 12 39.5 C 12 37.5 14 36.5 17 36 H 28 C 31 36.5 33 37.5 33 39.5 L 33.5 40.5 H 11.5 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 14.5 36 C 14.5 34.5 16 33.5 18.5 33 H 26.5 C 29 33.5 30.5 34.5 30.5 36 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 17.5 33 C 17.5 28 19 25 19.5 22.5 H 25.5 C 26 25 27.5 28 27.5 33 Z" fill={`url(#${idPrefix}_body)`} />
            <path d="M 16 22.5 C 16 21 17.5 20.2 22.5 20.2 C 27.5 20.2 29 21 29 22.5 Z" fill={`url(#${idPrefix}_base)`} />
            <circle cx="22.5" cy="14" r="6.2" fill={`url(#${idPrefix}_body)`} />
          </g>
        </svg>
      );

    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9 39.5 C 9 37 11.5 35.5 15.5 35 H 29.5 C 33.5 35.5 36 37 36 39.5 L 36.5 40.5 H 8.5 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 12 35 C 12 33.5 14 32.5 17 32 H 28 C 31 32.5 33 33.5 33 35 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 15 32 L 16 19 H 29 L 30 32 Z" fill={`url(#${idPrefix}_body)`} />
            <path d="M 13 19 C 13 17 14 16.5 16 16.5 H 29 C 31 16.5 32 17 32 19 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 12 16.5 V 10 H 16 V 13 H 20 V 10 H 25 V 13 H 29 V 10 H 33 V 16.5 Z" fill={`url(#${idPrefix}_body)`} />
          </g>
        </svg>
      );

    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9.5 39.5 C 9.5 37 12 35.5 16 35 H 29 C 33 35.5 35.5 37 35.5 39.5 L 36 40.5 H 9 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 12 35 C 12 33.5 14 32.5 17.5 32 H 27.5 C 31 32.5 33 33.5 33 35 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 17.5 32 C 17.5 28 14 26 12 21 C 10.5 17.5 11 12 14.5 9.5 C 18 7.5 22 7.5 25 9 C 27 10 27.5 12 26.5 14 C 29 11 31.5 12 32.5 15 C 33.5 17.5 33 21 31.5 24.5 C 30 27.5 28 30 27.5 32 Z" fill={`url(#${idPrefix}_body)`} />
          </g>
        </svg>
      );

    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9.5 39.5 C 9.5 37 12 35.5 16 35 H 29 C 33 35.5 35.5 37 35.5 39.5 L 36 40.5 H 9 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 12.5 35 C 12.5 33.5 14.5 32.5 17.5 32 H 27.5 C 30.5 32.5 32.5 33.5 32.5 35 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 16 32 C 15.5 27 17 23 18 21 H 27 C 28 23 29.5 27 29 32 Z" fill={`url(#${idPrefix}_body)`} />
            <path d="M 15 21 C 13.5 17 15 11 22.5 8 C 30 11 31.5 17 30 21 C 28.5 23.5 16.5 23.5 15 21 Z" fill={`url(#${idPrefix}_body)`} />
            <circle cx="22.5" cy="6.2" r="2.2" fill={`url(#${idPrefix}_base)`} />
          </g>
        </svg>
      );

    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8.5 39.5 C 8.5 37 11 35.5 15 35 H 30 C 34 35.5 36.5 37 36.5 39.5 L 37 40.5 H 8 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 11.5 35 C 11.5 33.5 13.5 32.5 16.5 32 H 28.5 C 31.5 32.5 33.5 33.5 33.5 35 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 15 32 C 14.5 26.5 16.5 22 17.5 20.5 H 27.5 C 28.5 22 30.5 26.5 30 32 Z" fill={`url(#${idPrefix}_body)`} />
            <path d="M 13 20.5 L 10 11.5 L 16.5 15.5 L 22.5 10 L 28.5 15.5 L 35 11.5 L 32 20.5 Z" fill={`url(#${idPrefix}_body)`} />
          </g>
        </svg>
      );

    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8 39.5 C 8 37 10.5 35.5 14.5 35 H 30.5 C 34.5 35.5 37 37 37 39.5 L 37.5 40.5 H 7.5 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 11 35 C 11 33.5 13 32.5 16 32 H 29 C 32 32.5 34 33.5 34 35 Z" fill={`url(#${idPrefix}_base)`} />
            <path d="M 14.5 32 C 14 26.5 16.5 22.5 18 21 H 27 C 28.5 22.5 31 26.5 30.5 32 Z" fill={`url(#${idPrefix}_body)`} />
            <path d="M 13.5 18.5 C 12 15 14 11.5 18.5 11 C 20.2 11 21.5 11.5 22.5 12.2 C 23.5 11.5 24.8 11 26.5 11 C 31 11.5 33 15 31.5 18.5 Z" fill={`url(#${idPrefix}_body)`} />
            <path d="M 21.2 10 V 3.5 H 23.8 V 10 Z M 18.2 5.2 H 26.8 V 7.8 H 18.2 Z" fill={highlightLine} stroke={strokeColor} strokeWidth={0.6} />
          </g>
        </svg>
      );

    default:
      return null;
  }
});
