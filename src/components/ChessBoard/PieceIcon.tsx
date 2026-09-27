import React, { useState } from 'react';
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

// Static SVG gradients and definitions shared across all pieces with zero ID generation overhead
const SvgDefs: React.FC<{ isWhite: boolean }> = React.memo(({ isWhite }) => {
  const prefix = isWhite ? 'st_w' : 'st_b';
  return (
    <defs>
      <linearGradient id={`${prefix}_body`} x1="0.18" y1="0.08" x2="0.82" y2="0.92">
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

      <linearGradient id={`${prefix}_base`} x1="0.1" y1="0.2" x2="0.9" y2="0.8">
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
});

/**
 * Realistic Master Chess Piece Renderer
 * Uses custom Staunton 3D PNG pieces with vector SVG fallback with zero per-piece useId() overhead.
 */
export const PieceIcon: React.FC<PieceIconProps> = React.memo(({ type, color, className = 'w-full h-full' }) => {
  const [hasImageError, setHasImageError] = useState<boolean>(false);
  const isWhite = color === 'w';
  const prefix = isWhite ? 'st_w' : 'st_b';
  const pngSrc = PIECE_PNG_URLS[color]?.[type];

  // Primary High-Fidelity 3D PNG piece render
  if (pngSrc && !hasImageError) {
    return (
      <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
        <img
          src={pngSrc}
          alt={`${isWhite ? 'White' : 'Black'} ${type}`}
          className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-100"
          draggable={false}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
        />
      </div>
    );
  }

  // Resilient SVG Staunton Fallback definitions
  const strokeColor = isWhite ? '#475569' : '#020617';
  const strokeWidth = 1.1;

  switch (type) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <SvgDefs isWhite={isWhite} />
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 12 39.5 C 12 37.5 14 36.5 17 36 H 28 C 31 36.5 33 37.5 33 39.5 L 33.5 40.5 H 11.5 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 14.5 36 C 14.5 34.5 16 33.5 18.5 33 H 26.5 C 29 33.5 30.5 34.5 30.5 36 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 17.5 33 C 17.5 28 19 25 19.5 22.5 H 25.5 C 26 25 27.5 28 27.5 33 Z" fill={`url(#${prefix}_body)`} />
            <path d="M 16 22.5 C 16 21 17.5 20.2 22.5 20.2 C 27.5 20.2 29 21 29 22.5 Z" fill={`url(#${prefix}_base)`} />
            <circle cx="22.5" cy="14" r="6.2" fill={`url(#${prefix}_body)`} />
          </g>
        </svg>
      );

    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <SvgDefs isWhite={isWhite} />
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9 39.5 C 9 37 11.5 35.5 15.5 35 H 29.5 C 33.5 35.5 36 37 36 39.5 L 36.5 40.5 H 8.5 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 12 35 C 12 33.5 14 32.5 17 32 H 28 C 31 32.5 33 33.5 33 35 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 15 32 L 16 19 H 29 L 30 32 Z" fill={`url(#${prefix}_body)`} />
            <path d="M 13 19 C 13 17 14 16.5 16 16.5 H 29 C 31 16.5 32 17 32 19 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 12 16.5 V 10 H 16 V 13 H 20 V 10 H 25 V 13 H 29 V 10 H 33 V 16.5 Z" fill={`url(#${prefix}_body)`} />
          </g>
        </svg>
      );

    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <SvgDefs isWhite={isWhite} />
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9.5 39.5 C 9.5 37 12 35.5 16 35 H 29 C 33 35.5 35.5 37 35.5 39.5 L 36 40.5 H 9 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 12 35 C 12 33.5 14 32.5 17.5 32 H 27.5 C 31 32.5 33 33.5 33 35 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 14.5 32 C 14.5 32 14.5 28 12 25.5 C 9.5 23 9.5 15.5 14.5 10.5 C 19.5 5.5 25.5 6.5 28.5 10.5 C 30.5 13.5 30.5 17.5 30.5 20.5 C 30.5 23.5 32 25.5 32 28 C 32 30.5 30.5 32 30.5 32 Z" fill={`url(#${prefix}_body)`} />
            <circle cx="17.5" cy="14.5" r="1.5" fill={isWhite ? '#020617' : '#f8fafc'} />
          </g>
        </svg>
      );

    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <SvgDefs isWhite={isWhite} />
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9 39.5 C 9 37 11.5 35.5 15.5 35 H 29.5 C 33.5 35.5 36 37 36 39.5 L 36.5 40.5 H 8.5 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 12 35 C 12 33.5 14 32.5 17 32 H 28 C 31 32.5 33 33.5 33 35 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 14.5 32 C 14.5 27 16.5 23.5 17.5 21 H 27.5 C 28.5 23.5 30.5 27 30.5 32 Z" fill={`url(#${prefix}_body)`} />
            <path d="M 16.5 21 C 15 18 16 11 22.5 9 C 29 11 30 18 28.5 21 Z" fill={`url(#${prefix}_body)`} />
            <circle cx="22.5" cy="7.5" r="1.8" fill={`url(#${prefix}_base)`} />
            <path d="M 20.5 14.5 L 25.5 18.5" stroke={isWhite ? '#64748b' : '#334155'} strokeWidth="1" />
          </g>
        </svg>
      );

    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <SvgDefs isWhite={isWhite} />
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8.5 39.5 C 8.5 37 11 35.5 15 35 H 30 C 34 35.5 36.5 37 36.5 39.5 L 37 40.5 H 8 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 11.5 35 C 11.5 33.5 13.5 32.5 16.5 32 H 28.5 C 31.5 32.5 33.5 33.5 33.5 35 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 14 32 L 12 17.5 L 18 25 L 22.5 13.5 L 27 25 L 33 17.5 L 31 32 Z" fill={`url(#${prefix}_body)`} />
            <circle cx="12" cy="15.5" r="1.8" fill={`url(#${prefix}_base)`} />
            <circle cx="22.5" cy="11.5" r="2" fill={`url(#${prefix}_base)`} />
            <circle cx="33" cy="15.5" r="1.8" fill={`url(#${prefix}_base)`} />
          </g>
        </svg>
      );

    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <SvgDefs isWhite={isWhite} />
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8.5 39.5 C 8.5 37 11 35.5 15 35 H 30 C 34 35.5 36.5 37 36.5 39.5 L 37 40.5 H 8 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 11.5 35 C 11.5 33.5 13.5 32.5 16.5 32 H 28.5 C 31.5 32.5 33.5 33.5 33.5 35 Z" fill={`url(#${prefix}_base)`} />
            <path d="M 14 32 C 14 26 15 22 17.5 19.5 H 27.5 C 30 22 31 26 31 32 Z" fill={`url(#${prefix}_body)`} />
            <path d="M 15 19.5 C 13.5 15.5 16 12 22.5 12 C 29 12 31.5 15.5 30 19.5 Z" fill={`url(#${prefix}_body)`} />
            {/* King Cross */}
            <path d="M 22.5 6 V 11.5 M 19.5 8.5 H 25.5" stroke={strokeColor} strokeWidth="1.6" />
          </g>
        </svg>
      );

    default:
      return null;
  }
});
