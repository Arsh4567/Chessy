import React, { useState, useMemo } from 'react';
import { MultiplayerMatchRecord } from '../../utils/storage';
import { INITIAL_RATING, getEloTier } from '../../utils/eloRating';
import { TrendingUp, TrendingDown, Minus, Trophy, Calendar, User, Zap } from 'lucide-react';

interface HistoricalEloGraphProps {
  history: MultiplayerMatchRecord[];
  currentRating: number;
  peakRating: number;
  onSelectMatchPgn?: (pgn: string) => void;
}

interface EloPoint {
  index: number;
  matchId: string;
  rating: number;
  ratingBefore: number;
  delta: number;
  result: 'win' | 'loss' | 'draw';
  opponentName: string;
  opponentRating: number;
  date: string;
  movesCount: number;
  pgn: string;
  isInitial?: boolean;
}

export const HistoricalEloGraph: React.FC<HistoricalEloGraphProps> = ({
  history = [],
  currentRating = INITIAL_RATING,
  peakRating = currentRating,
  onSelectMatchPgn,
}) => {
  const [range, setRange] = useState<'10' | '25' | '50' | 'all'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Build sequential chronological timeline points
  const points: EloPoint[] = useMemo(() => {
    // Reverse because multiplayerHistory is stored with newest first
    const chronological = [...history].reverse();

    if (chronological.length === 0) {
      // Return single initial baseline point
      return [
        {
          index: 0,
          matchId: 'init',
          rating: INITIAL_RATING,
          ratingBefore: INITIAL_RATING,
          delta: 0,
          result: 'draw',
          opponentName: 'Career Baseline',
          opponentRating: INITIAL_RATING,
          date: 'Career Start',
          movesCount: 0,
          pgn: '',
          isInitial: true,
        },
      ];
    }

    // Determine initial starting baseline from the earliest match's ratingBefore
    const firstMatch = chronological[0];
    const initialRating = firstMatch.ratingBefore !== undefined ? firstMatch.ratingBefore : INITIAL_RATING;

    const list: EloPoint[] = [
      {
        index: 0,
        matchId: 'init',
        rating: initialRating,
        ratingBefore: initialRating,
        delta: 0,
        result: 'draw',
        opponentName: 'Career Start',
        opponentRating: initialRating,
        date: firstMatch.date || firstMatch.createdAt || 'Start',
        movesCount: 0,
        pgn: '',
        isInitial: true,
      },
    ];

    chronological.forEach((m, idx) => {
      list.push({
        index: idx + 1,
        matchId: m.id || `match-${idx}`,
        rating: m.ratingAfter,
        ratingBefore: m.ratingBefore,
        delta: m.ratingDelta,
        result: m.result,
        opponentName: m.opponentName || 'Opponent',
        opponentRating: m.opponentRating || 800,
        date: m.date || (m.createdAt ? new Date(m.createdAt).toLocaleDateString() : `Match ${idx + 1}`),
        movesCount: m.movesCount || 0,
        pgn: m.pgn || '',
      });
    });

    // Apply range filter
    if (range === '10' && list.length > 11) {
      return list.slice(list.length - 11);
    }
    if (range === '25' && list.length > 26) {
      return list.slice(list.length - 26);
    }
    if (range === '50' && list.length > 51) {
      return list.slice(list.length - 51);
    }

    return list;
  }, [history, range]);

  // Compute graph bounds
  const { minRating, maxRating, startRating, endRating, netDelta } = useMemo(() => {
    if (points.length === 0) {
      return { minRating: 700, maxRating: 900, startRating: 800, endRating: 800, netDelta: 0 };
    }
    const ratings = points.map((p) => p.rating);
    const rawMin = Math.min(...ratings);
    const rawMax = Math.max(...ratings);

    // Give vertical breathing room (padding 40 Elo)
    const min = Math.max(100, Math.floor((rawMin - 40) / 50) * 50);
    const max = Math.ceil((rawMax + 40) / 50) * 50;

    const start = points[0].rating;
    const end = points[points.length - 1].rating;
    return {
      minRating: min,
      maxRating: Math.max(min + 100, max),
      startRating: start,
      endRating: end,
      netDelta: end - start,
    };
  }, [points]);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate mapping
  const getX = (idx: number) => {
    if (points.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (idx / (points.length - 1)) * innerWidth;
  };

  const getY = (rating: number) => {
    const range = maxRating - minRating || 1;
    const normalized = (rating - minRating) / range;
    return paddingTop + innerHeight - normalized * innerHeight;
  };

  // Generate SVG path line and area
  const { pathD, areaD, pointsCoords } = useMemo(() => {
    if (points.length === 0) return { pathD: '', areaD: '', pointsCoords: [] };

    const coords = points.map((p, i) => ({
      x: getX(i),
      y: getY(p.rating),
      point: p,
    }));

    if (coords.length === 1) {
      const singleX = coords[0].x;
      const singleY = coords[0].y;
      return {
        pathD: `M ${paddingLeft} ${singleY} L ${svgWidth - paddingRight} ${singleY}`,
        areaD: `M ${paddingLeft} ${singleY} L ${svgWidth - paddingRight} ${singleY} L ${svgWidth - paddingRight} ${paddingTop + innerHeight} L ${paddingLeft} ${paddingTop + innerHeight} Z`,
        pointsCoords: coords,
      };
    }

    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      // Smooth cubic curve control points
      const cpX1 = prev.x + (curr.x - prev.x) * 0.45;
      const cpX2 = curr.x - (curr.x - prev.x) * 0.45;
      d += ` C ${cpX1.toFixed(1)} ${prev.y.toFixed(1)}, ${cpX2.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const groundY = paddingTop + innerHeight;
    const aD = `${d} L ${last.x.toFixed(1)} ${groundY} L ${first.x.toFixed(1)} ${groundY} Z`;

    return { pathD: d, areaD: aD, pointsCoords: coords };
  }, [points, minRating, maxRating]);

  // Horizontal guide lines (4 evenly spaced rating marks)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = Math.ceil((maxRating - minRating) / 4 / 25) * 25 || 50;
    for (let r = minRating; r <= maxRating; r += step) {
      ticks.push(r);
    }
    return ticks;
  }, [minRating, maxRating]);

  const activePoint = hoveredIndex !== null && pointsCoords[hoveredIndex] ? pointsCoords[hoveredIndex].point : null;
  const activeCoord = hoveredIndex !== null && pointsCoords[hoveredIndex] ? pointsCoords[hoveredIndex] : null;

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
      {/* Header with Title and Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Historical Elo Progression
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300">
              {history.length} Rated {history.length === 1 ? 'Match' : 'Matches'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Interactive rating trajectory across your competitive matches with placement dynamics.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-800 self-start sm:self-center">
          {(['10', '25', '50', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setHoveredIndex(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                range === r
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {r === 'all' ? 'All Time' : `Last ${r}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Window Delta</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold font-mono ${
              netDelta > 0 ? 'text-emerald-400' : netDelta < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {netDelta > 0 ? `+${netDelta}` : netDelta} Elo
            </span>
            {netDelta > 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : netDelta < 0 ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : <Minus className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Current Rating</span>
          <div className="text-base font-bold font-mono text-white mt-0.5">
            {currentRating} <span className="text-[11px] font-normal text-slate-500">Elo</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Peak In Period</span>
          <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
            {Math.max(...points.map((p) => p.rating))} <span className="text-[11px] font-normal text-slate-500">Elo</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Floor In Period</span>
          <div className="text-base font-bold font-mono text-slate-300 mt-0.5">
            {Math.min(...points.map((p) => p.rating))} <span className="text-[11px] font-normal text-slate-500">Elo</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Container */}
      <div className="relative w-full overflow-hidden select-none bg-slate-950/80 rounded-2xl border border-slate-800 p-2 sm:p-4">
        {/* Tooltip Overlay */}
        {activePoint && activeCoord && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 p-3 rounded-xl bg-slate-900/95 border border-sky-500/40 shadow-2xl text-xs space-y-1.5 backdrop-blur-md"
            style={{
              left: Math.min(Math.max(16, (activeCoord.x / svgWidth) * 100), 75) + '%',
              top: '12px',
              transform: 'translateX(-50%)',
              minWidth: '180px',
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-white flex items-center gap-1">
                {activePoint.isInitial ? 'Baseline Entry' : `Match ${activePoint.index}`}
              </span>
              <span className="text-[10px] font-mono text-slate-400">{activePoint.date}</span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-400">Rating:</span>
              <span className="text-sm font-black font-mono text-sky-400">
                {activePoint.rating} Elo
              </span>
            </div>

            {!activePoint.isInitial && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Result:</span>
                  <span className={`font-bold font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    activePoint.result === 'win'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : activePoint.result === 'loss'
                      ? 'text-rose-400 bg-rose-500/10'
                      : 'text-slate-300 bg-slate-800'
                  }`}>
                    {activePoint.result.toUpperCase()} ({activePoint.delta > 0 ? `+${activePoint.delta}` : activePoint.delta})
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>vs {activePoint.opponentName}</span>
                  <span className="font-mono">({activePoint.opponentRating} Elo)</span>
                </div>

                {activePoint.movesCount > 0 && (
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    {activePoint.movesCount} moves played
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SVG Graphic */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-64 overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Linear gradient fill for area below line */}
            <linearGradient id="eloAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.00" />
            </linearGradient>

            {/* Line stroke gradient */}
            <linearGradient id="eloStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis marks */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            const isBaseline = tick === INITIAL_RATING;
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke={isBaseline ? '#38bdf8' : '#334155'}
                  strokeWidth={isBaseline ? '1.5' : '1'}
                  strokeDasharray={isBaseline ? '4 3' : '2 3'}
                  strokeOpacity={isBaseline ? '0.45' : '0.4'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill={isBaseline ? '#7dd3fc' : '#64748b'}
                  className="font-mono font-medium"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Initial Rating Baseline Label */}
          {minRating <= INITIAL_RATING && maxRating >= INITIAL_RATING && (
            <text
              x={svgWidth - paddingRight}
              y={getY(INITIAL_RATING) - 6}
              textAnchor="end"
              fontSize="9"
              fill="#38bdf8"
              opacity="0.65"
              className="font-mono font-semibold"
            >
              Start: 800 Elo
            </text>
          )}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#eloAreaGradient)" />}

          {/* Curve Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#eloStrokeGradient)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Hover Scrubber Vertical Line */}
          {activeCoord && (
            <line
              x1={activeCoord.x}
              y1={paddingTop}
              x2={activeCoord.x}
              y2={paddingTop + innerHeight}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity="0.8"
            />
          )}

          {/* Interactive Data Point Dots */}
          {pointsCoords.map((coord, i) => {
            const isHovered = hoveredIndex === i;
            const isLast = i === pointsCoords.length - 1;
            const pt = coord.point;

            const dotFill = pt.isInitial
              ? '#94a3b8'
              : pt.result === 'win'
              ? '#34d399'
              : pt.result === 'loss'
              ? '#fb7185'
              : '#94a3b8';

            return (
              <g
                key={pt.matchId}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onClick={() => pt.pgn && onSelectMatchPgn && onSelectMatchPgn(pt.pgn)}
              >
                {/* Hit area */}
                <circle cx={coord.x} cy={coord.y} r="14" fill="transparent" />

                {/* Outer Glow */}
                {(isHovered || isLast) && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isHovered ? '9' : '7'}
                    fill={dotFill}
                    fillOpacity="0.25"
                    className="transition-all"
                  />
                )}

                {/* Center Dot */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? '5.5' : isLast ? '4.5' : '3.5'}
                  fill={dotFill}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* Bottom Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-2 border-t border-slate-800/60 mt-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Win</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Loss</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Draw / Start</span>
            </span>
          </div>
          <span className="font-mono text-slate-500 text-[10px]">
            Hover data points for match dossier
          </span>
        </div>
      </div>
    </div>
  );
};
