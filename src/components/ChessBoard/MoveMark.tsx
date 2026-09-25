import React from 'react';
import { MoveClassification } from '../../types/chess';

export interface MoveMarkProps {
  classification?: MoveClassification | string;
  size?: number; // 24 to 32px (default 26px)
  className?: string;
  showGlow?: boolean;
  title?: string;
}

// 7-Icon Sprite Sheet Configuration for /public/move marks.png (1536 x 1024)
// Defines fixed crop center and bounding diameter for each move mark
const SPRITE_SHEET_WIDTH = 1536;
const SPRITE_SHEET_HEIGHT = 1024;

export const SPRITE_COORDINATES: Record<
  'brilliant' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder',
  { cx: number; cy: number; diameter: number; label: string; symbol: string; color: string }
> = {
  brilliant: {
    cx: 295,
    cy: 282,
    diameter: 470,
    label: 'Brilliant',
    symbol: '!!',
    color: '#06B6D4',
  },
  best: {
    cx: 761,
    cy: 282,
    diameter: 470,
    label: 'Best',
    symbol: '!',
    color: '#10B981',
  },
  excellent: {
    cx: 1246,
    cy: 328,
    diameter: 460,
    label: 'Excellent',
    symbol: '★',
    color: '#34D399',
  },
  good: {
    cx: 237,
    cy: 723,
    diameter: 400,
    label: 'Good',
    symbol: '✓',
    color: '#3B82F6',
  },
  inaccuracy: {
    cx: 605,
    cy: 732,
    diameter: 420,
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#F59E0B',
  },
  mistake: {
    cx: 934,
    cy: 747,
    diameter: 395,
    label: 'Mistake',
    symbol: '?',
    color: '#F97316',
  },
  blunder: {
    cx: 1317,
    cy: 730,
    diameter: 460,
    label: 'Blunder',
    symbol: '??',
    color: '#EF4444',
  },
};

/**
 * Reusable MoveMark Component
 * Renders individual move quality icons from the shared single 7-icon sprite sheet
 * using exact CSS sprite positioning without image duplication.
 */
export const MoveMark: React.FC<MoveMarkProps> = ({
  classification,
  size = 26,
  className = '',
  showGlow = false,
  title,
}) => {
  if (!classification) return null;

  // Map aliases
  let key: keyof typeof SPRITE_COORDINATES | null = null;
  if (classification === 'brilliant') key = 'brilliant';
  else if (classification === 'best' || classification === 'great') key = 'best';
  else if (classification === 'excellent') key = 'excellent';
  else if (classification === 'good') key = 'good';
  else if (classification === 'inaccuracy') key = 'inaccuracy';
  else if (classification === 'mistake') key = 'mistake';
  else if (classification === 'blunder' || classification === 'missed_win') key = 'blunder';

  if (!key) {
    return null;
  }

  const coord = SPRITE_COORDINATES[key];
  const scale = size / coord.diameter;
  const bgWidth = SPRITE_SHEET_WIDTH * scale;
  const bgHeight = SPRITE_SHEET_HEIGHT * scale;
  const posX = -(coord.cx * scale - size / 2);
  const posY = -(coord.cy * scale - size / 2);

  return (
    <div
      className={`inline-block shrink-0 rounded-full select-none pointer-events-auto transition-transform ${showGlow ? 'drop-shadow-md' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: "url('/move marks.png')",
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundPosition: `${posX}px ${posY}px`,
        backgroundRepeat: 'no-repeat',
        filter: showGlow ? `drop-shadow(0 0 6px ${coord.color}80)` : undefined,
      }}
      title={title || `${coord.label} (${coord.symbol})`}
      role="img"
      aria-label={coord.label}
    />
  );
};
