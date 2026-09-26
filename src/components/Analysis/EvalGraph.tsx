import React, { useMemo, useState, useRef } from 'react';
import { AnalyzedMove } from '../../types/chess';
import { MoveMark } from '../ChessBoard/MoveMark';

interface EvalGraphProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  height?: number;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  height = 96,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize evaluations into [-10, 10] range
  const points = useMemo(() => {
    if (!moves || moves.length === 0) return [];

    return moves.map((move, i) => {
      let score = move.eval;
      if (move.mate !== undefined) {
        score = move.mate > 0 ? 10 : -10;
      }
      // Clamping between -10 and 10
      const clamped = Math.max(-10, Math.min(10, score));
      return {
        index: i,
        score: clamped,
        rawEval: move.eval,
        mate: move.mate,
        san: move.san,
        color: move.color,
        classification: move.classification,
      };
    });
  }, [moves]);

  if (points.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-500 font-mono"
        style={{ height }}
      >
        <span>Evaluation trajectory appears once moves are recorded</span>
      </div>
    );
  }

  const svgWidth = 600;
  const svgHeight = height;
  const paddingY = 8;
  const usableHeight = svgHeight - paddingY * 2;
  const midY = svgHeight / 2;

  // Map eval (-10 to +10) to SVG y coordinate (y=0 is top/white, y=svgHeight is bottom/black)
  const getY = (score: number) => {
    // score +10 -> paddingY, score -10 -> svgHeight - paddingY
    return midY - (score / 10) * (usableHeight / 2);
  };

  const getX = (index: number) => {
    if (points.length <= 1) return svgWidth / 2;
    return (index / (points.length - 1)) * svgWidth;
  };

  // Build SVG path
  const pathD = points.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.score);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Fill paths for white (above midY) and black (below midY)
  const firstX = getX(0);
  const lastX = getX(points.length - 1);
  const fillAreaD = `${pathD} L ${lastX} ${midY} L ${firstX} ${midY} Z`;

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : (currentMoveIndex >= 0 ? points[currentMoveIndex] : null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = relX / rect.width;
    const rawIdx = Math.round(fraction * (points.length - 1));
    const clampedIdx = Math.max(0, Math.min(points.length - 1, rawIdx));
    setHoveredIdx(clampedIdx);
  };

  const handleClick = () => {
    if (hoveredIdx !== null) {
      onSelectMove(hoveredIdx);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
      onClick={handleClick}
      className="relative w-full bg-slate-950/80 border border-slate-800/80 rounded-xl overflow-hidden cursor-crosshair group select-none transition-colors hover:border-slate-700"
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full block"
      >
        <defs>
          <linearGradient id="whiteAdvantageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="blackAdvantageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Center Zero Line */}
        <line
          x1="0"
          y1={midY}
          x2={svgWidth}
          y2={midY}
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
        />

        {/* +3 and -3 Guideline references */}
        <line
          x1="0"
          y1={getY(3)}
          x2={svgWidth}
          y2={getY(3)}
          stroke="#334155"
          strokeWidth="0.75"
          strokeDasharray="2 4"
          opacity="0.3"
        />
        <line
          x1="0"
          y1={getY(-3)}
          x2={svgWidth}
          y2={getY(-3)}
          stroke="#334155"
          strokeWidth="0.75"
          strokeDasharray="2 4"
          opacity="0.3"
        />

        {/* Filled Eval Area */}
        <path d={fillAreaD} fill="url(#whiteAdvantageGrad)" />

        {/* Line Trajectory */}
        <path
          d={pathD}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />

        {/* Key Blunder and Brilliant dots on the line */}
        {points.map((pt, i) => {
          if (pt.classification === 'brilliant') {
            return (
              <circle
                key={`b-${i}`}
                cx={getX(i)}
                cy={getY(pt.score)}
                r="4"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          }
          if (pt.classification === 'blunder') {
            return (
              <circle
                key={`bl-${i}`}
                cx={getX(i)}
                cy={getY(pt.score)}
                r="4"
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          }
          return null;
        })}

        {/* Active / Current Move Vertical Cursor Indicator */}
        {activePoint && (
          <g>
            <line
              x1={getX(activePoint.index)}
              y1="0"
              x2={getX(activePoint.index)}
              y2={svgHeight}
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <circle
              cx={getX(activePoint.index)}
              cy={getY(activePoint.score)}
              r="4.5"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Micro-Badge Tooltip */}
      {activePoint && (
        <div
          className="absolute top-1 pointer-events-none transform -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/95 border border-slate-700/90 text-[10px] font-mono shadow-lg backdrop-blur-md z-10"
          style={{
            left: `${Math.max(12, Math.min(88, (activePoint.index / Math.max(1, points.length - 1)) * 100))}%`,
          }}
        >
          <span className="text-slate-400 font-semibold">
            {Math.floor(activePoint.index / 2) + 1}
            {activePoint.color === 'w' ? '.' : '...'}
          </span>
          <span className="font-bold text-slate-100">{activePoint.san}</span>
          {activePoint.classification && (
            <MoveMark classification={activePoint.classification} size={14} />
          )}
          <span
            className={`font-black ${
              activePoint.score > 0
                ? 'text-sky-400'
                : activePoint.score < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {activePoint.mate !== undefined
              ? (activePoint.mate > 0 ? `M${activePoint.mate}` : `-M${Math.abs(activePoint.mate)}`)
              : (activePoint.rawEval >= 0 ? `+${activePoint.rawEval.toFixed(2)}` : activePoint.rawEval.toFixed(2))}
          </span>
        </div>
      )}

      {/* Bottom Axis Labels */}
      <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500 pointer-events-none">
        Start
      </div>
      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500 pointer-events-none">
        Move {Math.ceil(points.length / 2)}
      </div>
    </div>
  );
};
