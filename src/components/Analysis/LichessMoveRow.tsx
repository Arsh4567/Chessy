import React from 'react';
import { Sparkles } from 'lucide-react';
import { LichessExplorerMove } from '../../utils/lichessExplorer';

interface LichessMoveRowProps {
  move: LichessExplorerMove;
  isBest: boolean;
  isExplainingThis: boolean;
  explanationText?: string;
  isGeneratingExplanation: boolean;
  onSelectMove?: (san: string) => void;
  onWhyThisMove: (m: LichessExplorerMove, e: React.MouseEvent) => void;
  onCloseExplanation: (e: React.MouseEvent) => void;
}

export const LichessMoveRow: React.FC<LichessMoveRowProps> = ({
  move: m,
  isBest,
  isExplainingThis,
  explanationText,
  isGeneratingExplanation,
  onSelectMove,
  onWhyThisMove,
  onCloseExplanation,
}) => {
  // Tactical profile badge
  let tacticalTag: { label: string; bg: string; text: string; border: string } | null = null;
  if (m.whiteWinPct >= 48) {
    tacticalTag = {
      label: 'White Crush',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
    };
  } else if (m.blackWinPct >= 42) {
    tacticalTag = {
      label: 'Black Counter',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
    };
  } else if (m.drawPct >= 55) {
    tacticalTag = {
      label: 'Solid Draw',
      bg: 'bg-slate-500/15',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
    };
  } else if (m.playPct >= 50) {
    tacticalTag = {
      label: 'Mainline',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    };
  } else if (m.playPct <= 5 && m.totalGames >= 50) {
    tacticalTag = {
      label: 'Surprise weapon',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
    };
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border transition-all duration-200 ${
          isBest
            ? 'bg-gradient-to-r from-emerald-950/85 via-emerald-900/40 to-slate-900/95 border-emerald-400/90 shadow-[0_0_16px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/60'
            : 'bg-slate-950/50 hover:bg-slate-850/80 border-slate-800/90 hover:border-amber-500/40'
        }`}
      >
        {/* Clickable Move Selector */}
        <div
          onClick={() => onSelectMove && onSelectMove(m.san)}
          className={`flex-1 flex items-center gap-2 min-w-0 ${
            onSelectMove ? 'cursor-pointer' : 'cursor-default'
          }`}
          title={
            isBest
              ? `★ Stockfish Engine #1 Choice: ${m.san} (${m.playPct}% of Master Games) | White: ${m.whiteWinPct}%, Draw: ${m.drawPct}%, Black: ${m.blackWinPct}%`
              : `Play ${m.san} | ${m.totalGames.toLocaleString()} games | White: ${m.whiteWinPct}% (${m.white.toLocaleString()}), Draw: ${m.drawPct}% (${m.draws.toLocaleString()}), Black: ${m.blackWinPct}% (${m.black.toLocaleString()})`
          }
        >
          {/* Left Neon Indicator for Engine Choice */}
          {isBest && (
            <span className="w-1 self-stretch rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] shrink-0 my-0.5" />
          )}

          <div className="flex-1 grid grid-cols-12 items-center gap-1.5 min-w-0">
            {/* Move SAN + Best Badge + Tactical Tag */}
            <div className="col-span-3 flex items-center gap-1.5 font-mono overflow-hidden">
              <span
                className={`tracking-tight ${
                  isBest
                    ? 'text-sm font-black text-emerald-200 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                    : 'text-xs font-black text-slate-100 group-hover:text-amber-300'
                }`}
              >
                {m.san}
              </span>
              {isBest && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/70 shadow-sm shadow-emerald-950/80 shrink-0"
                  title="Matches Stockfish Best Move Recommendation"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-300 animate-pulse" />
                  <span>Engine Best</span>
                </span>
              )}
            </div>

            {/* Popularity % & Games Count */}
            <div className="col-span-3 flex flex-col items-end pr-2 font-mono">
              <div className="flex items-center gap-1">
                <span
                  className={`font-black text-[11px] ${
                    isBest ? 'text-emerald-300 font-extrabold' : 'text-amber-400'
                  }`}
                >
                  {m.playPct}%
                </span>
                {tacticalTag && (
                  <span
                    className={`hidden sm:inline-block px-1 py-0.2 text-[8px] font-bold rounded border ${tacticalTag.bg} ${tacticalTag.text} ${tacticalTag.border}`}
                    title={`Tactical profile: ${tacticalTag.label}`}
                  >
                    {tacticalTag.label}
                  </span>
                )}
              </div>
              <span className={`text-[9px] ${isBest ? 'text-emerald-300/80 font-medium' : 'text-slate-400'}`}>
                {m.totalGames >= 1000000
                  ? `${(m.totalGames / 1000000).toFixed(1)}M games`
                  : m.totalGames >= 1000
                  ? `${(m.totalGames / 1000).toFixed(1)}k games`
                  : `${m.totalGames} games`}
              </span>
            </div>

            {/* Colored Win / Draw / Loss Progress Bar */}
            <div className="col-span-6 pl-0.5">
              <div
                className={`w-full h-4 rounded-md overflow-hidden flex bg-slate-900 text-[8.5px] font-mono font-bold select-none border shadow-inner ${
                  isBest ? 'border-emerald-400/60 shadow-emerald-950/50' : 'border-slate-700/60'
                }`}
              >
                {/* White Wins (Green) */}
                {m.whiteWinPct > 0 && (
                  <div
                    style={{ width: `${m.whiteWinPct}%` }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center overflow-hidden transition-colors border-r border-emerald-700/40"
                    title={`White win: ${m.whiteWinPct}% (${m.white.toLocaleString()} master games)`}
                  >
                    {m.whiteWinPct >= 18 && <span>{m.whiteWinPct}%</span>}
                  </div>
                )}

                {/* Draws (Grey) */}
                {m.drawPct > 0 && (
                  <div
                    style={{ width: `${m.drawPct}%` }}
                    className="bg-slate-500 hover:bg-slate-400 text-slate-100 flex items-center justify-center overflow-hidden transition-colors border-r border-slate-600/40"
                    title={`Draw: ${m.drawPct}% (${m.draws.toLocaleString()} master games)`}
                  >
                    {m.drawPct >= 18 && <span>{m.drawPct}%</span>}
                  </div>
                )}

                {/* Black Wins (Red) */}
                {m.blackWinPct > 0 && (
                  <div
                    style={{ width: `${m.blackWinPct}%` }}
                    className="bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center overflow-hidden transition-colors"
                    title={`Black win: ${m.blackWinPct}% (${m.black.toLocaleString()} master games)`}
                  >
                    {m.blackWinPct >= 18 && <span>{m.blackWinPct}%</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 'Why this move?' Gemini AI explanation button */}
        <button
          onClick={(e) => onWhyThisMove(m, e)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all shrink-0 cursor-pointer ${
            isExplainingThis
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
              : isBest
              ? 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 hover:text-white border border-emerald-400/50'
              : 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-amber-300 border border-slate-700/70 hover:border-amber-500/40'
          }`}
          title={`Ask Gemini AI why master players choose ${m.san}`}
        >
          <Sparkles className={`w-3 h-3 shrink-0 ${isBest ? 'text-emerald-300' : 'text-amber-400'}`} />
          <span className="hidden sm:inline whitespace-nowrap">Why this move?</span>
          <span className="sm:hidden">Why?</span>
        </button>
      </div>

      {/* AI Explanation Expandable Card */}
      {isExplainingThis && (
        <div className="mx-0.5 p-2.5 rounded-lg bg-slate-950/95 border border-amber-500/35 shadow-md text-slate-200 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Why Masters Play {m.san}</span>
              <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/20 ml-1">
                Gemini AI
              </span>
            </div>
            <button
              onClick={onCloseExplanation}
              className="text-slate-400 hover:text-slate-200 text-xs px-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Close summary"
            >
              ✕
            </button>
          </div>

          {isGeneratingExplanation && !explanationText ? (
            <div className="flex items-center gap-2 py-1.5 text-slate-400 text-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Consulting Gemini Grandmaster...</span>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-slate-200">
              {explanationText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
