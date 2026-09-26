import React, { useId } from 'react';
import { PieceType, PieceColor } from '../../types/chess';

interface PieceIconProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

/**
 * Master Staunton Realistic Vector Chess Pieces
 * Features:
 * - 3D volumetric lighting with directional diffuse shading & specular catchlights
 * - White pieces: Polished warm ivory / alabaster with soft specular glaze
 * - Black pieces: Triple-weighted obsidian / ebony with refined satin rim lighting
 * - Intricate Staunton details: chiseled knight mane & expressive eye, crenellated rook battlements,
 *   mitre cleft bishop with finial orb, jeweled 9-point coronet queen, and regal arched king with heraldic cross pattée.
 * - Subtly weighted ambient contact shadow for tangible physical presence on the board.
 */
export const PieceIcon: React.FC<PieceIconProps> = React.memo(({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const rawId = useId().replace(/:/g, '_');
  const idPrefix = `st_${color}_${type}_${rawId}`;

  // Gradients and filter definitions
  const defs = (
    <defs>
      {/* Contact drop shadow for physical weight on the board */}
      <filter id={`${idPrefix}_shadow`} x="-20%" y="-15%" width="140%" height="135%">
        <feDropShadow dx="0" dy="2.2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.38" />
      </filter>

      {/* Primary body gradient */}
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

      {/* Base plinth gradient */}
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

      {/* Head / Orb radial specular highlight */}
      <radialGradient id={`${idPrefix}_specular`} cx="38%" cy="32%" r="65%">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#f8fafc" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="1" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#64748b" stopOpacity="1" />
            <stop offset="35%" stopColor="#334155" stopOpacity="1" />
            <stop offset="75%" stopColor="#1e293b" stopOpacity="1" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
          </>
        )}
      </radialGradient>

      {/* Secondary accent bevel shine */}
      <linearGradient id={`${idPrefix}_shine`} x1="0" y1="0" x2="1" y2="1">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.2" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.1" />
          </>
        )}
      </linearGradient>
    </defs>
  );

  const strokeColor = isWhite ? '#1e293b' : '#020617';
  const detailColor = isWhite ? '#475569' : '#64748b';
  const highlightLine = isWhite ? '#ffffff' : '#94a3b8';

  switch (type) {
    case 'p':
      // Staunton Pawn
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Base Foot & Tier */}
            <path
              d="M 9.5 39.5 C 9.5 37.2 12 36 15 35.5 H 30 C 33 36 35.5 37.2 35.5 39.5 L 36 40.5 H 9 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            <path
              d="M 12.5 36 C 12.5 34.2 14.5 33.2 17 32.8 H 28 C 30.5 33.2 32.5 34.2 32.5 36 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Torso Column */}
            <path
              d="M 17 32.8 C 16 28 17.5 24.2 19 22.8 H 26 C 27.5 24.2 29 28 28 32.8 Z"
              fill={`url(#${idPrefix}_body)`}
            />
            {/* Neck Ring / Torus Collar */}
            <path
              d="M 18 22.8 C 17.2 22.8 17.2 21 18.2 20.8 H 26.8 C 27.8 21 27.8 22.8 27 22.8 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Spherical Head */}
            <circle cx="22.5" cy="14.2" r="5.8" fill={`url(#${idPrefix}_specular)`} />
            {/* Specular Catchlight */}
            <ellipse
              cx="20.8"
              cy="12.2"
              rx="1.8"
              ry="1.2"
              transform="rotate(-25 20.8 12.2)"
              fill={highlightLine}
              opacity={isWhite ? '0.85' : '0.6'}
              stroke="none"
            />
            {/* Base Specular Line */}
            <path
              d="M 14 36.5 C 19 35.5 26 35.5 31 36.5"
              stroke={highlightLine}
              strokeWidth="0.8"
              opacity={isWhite ? '0.7' : '0.4'}
              fill="none"
            />
          </g>
        </svg>
      );

    case 'r':
      // Staunton Rook
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Base Plinth */}
            <path
              d="M 9.5 39.5 C 9.5 37.5 11.5 36.5 14.5 36 H 30.5 C 33.5 36.5 35.5 37.5 35.5 39.5 L 36 40.5 H 9 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Lower Base Step */}
            <path
              d="M 12 36 H 33 V 33.5 C 33 32.5 31 31.8 29 31.5 H 16 C 14 31.8 12 32.5 12 33.5 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Castle Tower Shaft */}
            <path
              d="M 14 31.5 L 15.5 16.5 H 29.5 L 31 31.5 Z"
              fill={`url(#${idPrefix}_body)`}
            />
            {/* Decorative Vertical Masonry Grooves */}
            <path
              d="M 19 17 V 31 M 26 17 V 31"
              stroke={detailColor}
              strokeWidth="0.9"
              strokeDasharray="2.5 1.5"
              fill="none"
            />
            {/* Cornice / Corbel Arch */}
            <path
              d="M 12 16.5 C 12 15 13.5 14 15.5 14 H 29.5 C 31.5 14 33 15 33 16.5 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Battlements / Crenellations */}
            <path
              d="M 11.5 14 V 8.5 H 15.5 V 11.5 H 19 V 8.5 H 22.5 V 11.5 H 26 V 8.5 H 29.5 V 11.5 H 33.5 V 14 Z"
              fill={`url(#${idPrefix}_specular)`}
            />
            {/* Crenel Inner Recess Shading */}
            <rect x="15.8" y="9" width="2.8" height="2.2" fill={strokeColor} opacity="0.3" stroke="none" />
            <rect x="22.8" y="9" width="2.8" height="2.2" fill={strokeColor} opacity="0.3" stroke="none" />
            {/* Merlon Highlight Rim */}
            <path
              d="M 12 9 H 15 M 19.5 9 H 22 M 26.5 9 H 29"
              stroke={highlightLine}
              strokeWidth="0.8"
              opacity={isWhite ? '0.85' : '0.5'}
              fill="none"
            />
          </g>
        </svg>
      );

    case 'n':
      // Staunton Knight (Sculpted Horse Head)
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Base Pedestal */}
            <path
              d="M 9.5 39.5 C 9.5 37 12 35.5 15.5 35 H 29.5 C 33 35.5 35.5 37 35.5 39.5 L 36 40.5 H 9 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Horse Body, Neck & Head Outline */}
            <path
              d="M 15.5 35 C 13.5 30 11 26 11 24 C 11 23 12.5 22.5 14 23 C 14.5 21.5 13.5 20.5 13 19 C 12.5 17.5 13 16 15 15 C 16.5 14 18 12.5 18 10 C 18 8.5 19 7.5 20.5 8 C 21.5 8.5 22 9.5 22.5 10.5 C 24 10 25.5 10.5 27 12 C 29 14 31 16.5 32.5 20 C 34 23.5 34.5 28 34.5 35 Z"
              fill={`url(#${idPrefix}_body)`}
            />
            {/* Mane Hair Tufts */}
            <path
              d="M 23 11 C 26 12 29 15 31 18.5 M 24.5 14.5 C 27.5 16 30.5 19.5 32 23.5 M 26.5 19 C 29.5 21 32 25 33 29"
              stroke={detailColor}
              strokeWidth="1.2"
              fill="none"
            />
            {/* Ear */}
            <path
              d="M 18.5 9.5 L 20 6.5 C 20.8 6.5 21.8 7.5 21.5 9 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Snout & Nostril */}
            <path
              d="M 12.8 23.5 C 12.2 24.8 13.8 26 15.5 25.5 C 15.8 24.2 14.2 23.2 12.8 23.5 Z"
              fill={strokeColor}
              opacity={isWhite ? '0.2' : '0.6'}
            />
            <circle cx="14" cy="24.2" r="0.75" fill={strokeColor} />
            {/* Jaw Contour & Throat */}
            <path
              d="M 15.5 25.5 C 17.5 27 21 27 23.5 24.5 C 25.5 22.5 25.5 19 23.5 17"
              stroke={strokeColor}
              strokeWidth="1.2"
              fill="none"
            />
            {/* Almond Eye with Specular Catchlight */}
            <ellipse
              cx="17.8"
              cy="16"
              rx="1.5"
              ry="1.1"
              transform="rotate(-15 17.8 16)"
              fill={isWhite ? '#0f172a' : '#020617'}
            />
            <circle cx="17.4" cy="15.6" r="0.45" fill="#ffffff" stroke="none" />
            {/* Neck Highlight Glaze */}
            <path
              d="M 19 12 C 16.5 15 14.5 18 14 22"
              stroke={highlightLine}
              strokeWidth="0.9"
              opacity={isWhite ? '0.7' : '0.35'}
              fill="none"
            />
          </g>
        </svg>
      );

    case 'b':
      // Staunton Bishop
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Base Plinth & Step */}
            <path
              d="M 9.5 39.5 C 9.5 37 12 35.8 15 35.5 H 30 C 33 35.8 35.5 37 35.5 39.5 L 36 40.5 H 9 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            <path
              d="M 12 35.5 C 12 34 14 33 16.5 32.5 H 28.5 C 31 33 33 34 33 35.5 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Slender Waist Column */}
            <path
              d="M 16.5 32.5 C 15.5 28 17.5 24.5 19 23 H 26 C 27.5 24.5 29.5 28 28.5 32.5 Z"
              fill={`url(#${idPrefix}_body)`}
            />
            {/* Dual Collar */}
            <path
              d="M 17 23 C 16.5 22 17.5 21 22.5 21 C 27.5 21 28.5 22 28 23 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Mitre Headdress Dome */}
            <path
              d="M 16.5 21 C 14.5 17 16 11 22.5 9.5 C 29 11 30.5 17 28.5 21 Z"
              fill={`url(#${idPrefix}_specular)`}
            />
            {/* Traditional 45-degree Mitre Cleft Cut */}
            <path
              d="M 23 12 L 28 16.5"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M 23.5 11.5 L 28.5 16"
              stroke={highlightLine}
              strokeWidth="0.8"
              opacity={isWhite ? '0.85' : '0.4'}
            />
            {/* Finial Ball Gem on top */}
            <circle cx="22.5" cy="7.2" r="2.2" fill={`url(#${idPrefix}_shine)`} />
            <circle cx="21.8" cy="6.6" r="0.6" fill={highlightLine} opacity="0.8" stroke="none" />
            {/* Decorative Latin Cross on Mitre */}
            <path
              d="M 20.5 15.5 H 24.5 M 22.5 13.5 V 18"
              stroke={detailColor}
              strokeWidth="0.9"
              fill="none"
            />
          </g>
        </svg>
      );

    case 'q':
      // Staunton Queen (Coronet & Pearl Jewels)
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Regal Pedestal Base */}
            <path
              d="M 8.5 39.5 C 8.5 37 11 35.5 14.5 35 H 30.5 C 34 35.5 36.5 37 36.5 39.5 L 37 40.5 H 8 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            <path
              d="M 11.5 35 C 11.5 33.5 13.5 32.5 16 32 H 29 C 31.5 32.5 33.5 33.5 33.5 35 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Fluted Corseted Gown Column */}
            <path
              d="M 15 32 C 14.5 26.5 17 22.5 18.5 21 H 26.5 C 28 22.5 30.5 26.5 30 32 Z"
              fill={`url(#${idPrefix}_body)`}
            />
            {/* Royal Ruff Collar */}
            <path
              d="M 16.5 21 C 16 19.5 17.5 19 22.5 19 C 27.5 19 29 19.5 28.5 21 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Inner Velvet Cap Dome */}
            <path
              d="M 15 19.5 C 15 14 18 12 22.5 12 C 27 12 30 14 30 19.5 Z"
              fill={strokeColor}
              opacity={isWhite ? '0.15' : '0.45'}
              stroke="none"
            />
            {/* Flared Coronet Radiating Points */}
            <path
              d="M 10 11.5 L 14 19.5 H 31 L 35 11.5 L 28.5 16.5 L 22.5 8 L 16.5 16.5 Z"
              fill={`url(#${idPrefix}_specular)`}
            />
            {/* 5 Jewel Coronet Pearls */}
            <circle cx="10" cy="11.5" r="1.8" fill={`url(#${idPrefix}_shine)`} />
            <circle cx="16.5" cy="16.2" r="1.4" fill={`url(#${idPrefix}_shine)`} />
            <circle cx="22.5" cy="8" r="2" fill={`url(#${idPrefix}_shine)`} />
            <circle cx="28.5" cy="16.2" r="1.4" fill={`url(#${idPrefix}_shine)`} />
            <circle cx="35" cy="11.5" r="1.8" fill={`url(#${idPrefix}_shine)`} />
            {/* Pearl Catchlights */}
            <circle cx="9.5" cy="10.8" r="0.5" fill={highlightLine} stroke="none" />
            <circle cx="21.9" cy="7.2" r="0.6" fill={highlightLine} stroke="none" />
            <circle cx="34.5" cy="10.8" r="0.5" fill={highlightLine} stroke="none" />
            {/* Crown Rib Curves */}
            <path
              d="M 15 26 C 18 24.5 27 24.5 30 26 M 15.5 29 C 18.5 27.8 26.5 27.8 29.5 29"
              stroke={detailColor}
              strokeWidth="0.8"
              fill="none"
            />
          </g>
        </svg>
      );

    case 'k':
      // Staunton King (Imperial Crown & Heraldic Cross Pattée)
      return (
        <svg viewBox="0 0 45 45" className={className} filter={`url(#${idPrefix}_shadow)`}>
          {defs}
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Heaviest Weighted Tournament Pedestal */}
            <path
              d="M 8 39.5 C 8 37 10.5 35.5 14.5 35 H 30.5 C 34.5 35.5 37 37 37 39.5 L 37.5 40.5 H 7.5 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            <path
              d="M 11 35 C 11 33.5 13 32.5 16 32 H 29 C 32 32.5 34 33.5 34 35 Z"
              fill={`url(#${idPrefix}_base)`}
            />
            {/* Royal Mantle Robe Column */}
            <path
              d="M 14.5 32 C 14 26.5 16.5 22.5 18 21 H 27 C 28.5 22.5 31 26.5 30.5 32 Z"
              fill={`url(#${idPrefix}_body)`}
            />
            {/* Substantial Ermine Collar */}
            <path
              d="M 15.5 21 C 15 19.5 17 18.5 22.5 18.5 C 28 18.5 30 19.5 29.5 21 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Imperial Crown Arches */}
            <path
              d="M 13.5 18.5 C 12 15 14 11.5 18.5 11 C 20.2 11 21.5 11.5 22.5 12.2 C 23.5 11.5 24.8 11 26.5 11 C 31 11.5 33 15 31.5 18.5 Z"
              fill={`url(#${idPrefix}_specular)`}
            />
            {/* Crown Velvet Cap Shadow */}
            <path
              d="M 15.5 17.5 C 17 14 21 13 22.5 13 C 24 13 28 14 29.5 17.5 Z"
              fill={strokeColor}
              opacity={isWhite ? '0.12' : '0.4'}
              stroke="none"
            />
            {/* Finial Gallery Platform */}
            <path
              d="M 20.5 11.5 H 24.5 V 10 H 20.5 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Heraldic Latin Cross Pattée */}
            <path
              d="M 21.2 10 V 3.5 H 23.8 V 10 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            <path
              d="M 18.2 5.2 H 26.8 V 7.8 H 18.2 Z"
              fill={`url(#${idPrefix}_shine)`}
            />
            {/* Central Jewel of the Cross */}
            <circle cx="22.5" cy="6.5" r="1.1" fill={highlightLine} stroke={strokeColor} strokeWidth="0.7" />
            {/* Robe Trim Lines */}
            <path
              d="M 15 25.5 C 18 24.2 27 24.2 30 25.5 M 15.5 28.5 C 18.5 27.2 26.5 27.2 29.5 28.5"
              stroke={detailColor}
              strokeWidth="0.8"
              fill="none"
            />
          </g>
        </svg>
      );

    default:
      return null;
  }
});
