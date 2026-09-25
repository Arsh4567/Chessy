import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { LichessData, LichessExplorerMove } from '../../utils/lichessExplorer';
import { StockfishEvaluation } from '../../utils/stockfishWorker';
import { Award, BookOpen, Cpu, Sparkles, ChevronRight } from 'lucide-react';

export interface LichessMastersProps {
  lichessData: LichessData | null;
  stockfishEval?: StockfishEvaluation;
  onSelectMove?: (san: string) => void;
  isLoading?: boolean;
  className?: string;
  currentFen?: string;
}

export const LichessMasters: React.FC<LichessMastersProps> = ({
  lichessData,
  stockfishEval,
  onSelectMove,
  isLoading = false,
  className = '',
  currentFen,
}) => {
  const moves = lichessData?.moves || [];
  const openingName = lichessData?.opening?.name;
  const ecoCode = lichessData?.opening?.eco;
  const totalGames = lichessData?.totalGames || 0;
  const whiteTotal = lichessData?.whiteTotal || 0;
  const drawsTotal = lichessData?.drawsTotal || 0;
  const blackTotal = lichessData?.blackTotal || 0;

  // AI-generated move explanations state and active move selection
  const [activeMoveForExplanation, setActiveMoveForExplanation] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState<boolean>(false);

  const whiteWinPct = totalGames > 0 ? Math.round((whiteTotal / totalGames) * 100) : 0;
  const drawPct = totalGames > 0 ? Math.round((drawsTotal / totalGames) * 100) : 0;
  const blackWinPct = totalGames > 0 ? Math.max(0, 100 - whiteWinPct - drawPct) : 0;

  // Stockfish evaluation score display
  const stockfishScoreStr = stockfishEval
    ? stockfishEval.displayEval ||
      (stockfishEval.evalPawns !== undefined
        ? `${stockfishEval.evalPawns > 0 ? '+' : ''}${stockfishEval.evalPawns.toFixed(2)}`
        : `${(stockfishEval.scoreCp / 100).toFixed(2)}`)
    : '+0.00';

  // Normalize UCI string of Stockfish's suggested best move
  const bestMoveUci = useMemo(() => {
    if (!stockfishEval?.bestMove) return null;
    const bm: any = stockfishEval.bestMove;
    if (typeof bm === 'string') {
      const clean = bm.toLowerCase().replace(/[^a-h1-8qrbn]/gi, '');
      return clean.length >= 4 ? clean : null;
    }
    if (bm.rawUci) {
      return bm.rawUci.toLowerCase().trim();
    }
    if (bm.from && bm.to) {
      return `${bm.from}${bm.to}${bm.promotion || ''}`.toLowerCase().trim();
    }
    return null;
  }, [stockfishEval?.bestMove]);

  // Derive SAN string of Stockfish's suggested best move for clear matching and display
  const bestMoveSan = useMemo(() => {
    if (!stockfishEval?.bestMove) return null;
    const bm: any = stockfishEval.bestMove;
    if (typeof bm === 'string' && !/^[a-h][1-8][a-h][1-8]/.test(bm)) {
      return bm.trim();
    }
    const targetFen = currentFen || lichessData?.fen;
    if (!targetFen) return null;
    try {
      const c = new Chess(targetFen);
      if (bm.from && bm.to) {
        const res = c.move({
          from: bm.from,
          to: bm.to,
          promotion: bm.promotion,
        });
        return res ? res.san : null;
      } else if (bestMoveUci && bestMoveUci.length >= 4) {
        const res = c.move({
          from: bestMoveUci.substring(0, 2),
          to: bestMoveUci.substring(2, 4),
          promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined,
        });
        return res ? res.san : null;
      }
    } catch {
      return null;
    }
    return null;
  }, [stockfishEval?.bestMove, currentFen, lichessData?.fen, bestMoveUci]);

  // Check if a move matches the latest stockfishEval bestMove
  const isMatchBestMove = (m: LichessExplorerMove): boolean => {
    if (!stockfishEval?.bestMove) return false;
    const bm: any = stockfishEval.bestMove;

    // 1. Direct UCI match
    if (m.uci && bestMoveUci) {
      if (m.uci.toLowerCase().trim() === bestMoveUci) return true;
    }

    // 2. Direct SAN match
    if (m.san && bestMoveSan) {
      if (m.san.trim() === bestMoveSan.trim()) return true;
    }

    // 3. Fallback string match
    if (typeof bm === 'string') {
      const str = bm.trim().toLowerCase();
      if (m.san?.toLowerCase().trim() === str || m.uci?.toLowerCase().trim() === str) {
        return true;
      }
    }

    return false;
  };

  const bestMoveDisplay = bestMoveSan || bestMoveUci;

  // Handle 'Why this move?' request to Gemini API
  const handleWhyThisMove = async (m: LichessExplorerMove, e: React.MouseEvent) => {
    e.stopPropagation();

    if (activeMoveForExplanation === m.san) {
      setActiveMoveForExplanation(null);
      return;
    }

    setActiveMoveForExplanation(m.san);

    const cacheKey = `${lichessData?.fen || ''}_${m.san}`;
    if (explanations[cacheKey]) {
      return;
    }

    setIsGeneratingExplanation(true);
    try {
      const response = await fetch('/api/explain-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: lichessData?.fen,
          moveSan: m.san,
          openingName,
          eco: ecoCode,
          whiteWinPct: m.whiteWinPct,
          drawPct: m.drawPct,
          blackWinPct: m.blackWinPct,
          totalGames: m.totalGames,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.explanation) {
          setExplanations((prev) => ({
            ...prev,
            [cacheKey]: data.explanation,
            [m.san]: data.explanation,
          }));
        }
      } else {
        setExplanations((prev) => ({
          ...prev,
          [cacheKey]: `In this position, ${m.san} is a principal master choice to control key squares, facilitate harmonious piece development, and contest the initiative.`,
          [m.san]: `In this position, ${m.san} is a principal master choice to control key squares, facilitate harmonious piece development, and contest the initiative.`,
        }));
      }
    } catch (err) {
      console.warn('Error fetching Gemini move explanation:', err);
      setExplanations((prev) => ({
        ...prev,
        [cacheKey]: `Master play with ${m.san} focuses on active piece play, sound pawn structure, and central influence.`,
        [m.san]: `Master play with ${m.san} focuses on active piece play, sound pawn structure, and central influence.`,
      }));
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900/95 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-slate-200 select-none ${className}`}>
      {/* Header */}
      <div className="p-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Masters Book
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {ecoCode && (
            <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {ecoCode}
            </span>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
            FIDE 2200+
          </span>
        </div>
      </div>

      {/* Opening Name & Engine Comparison Banner */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="min-w-0 max-w-[60%]">
          <span
            className="font-bold text-slate-100 truncate block text-[11px] sm:text-xs"
            title={openingName || 'Chess Position'}
          >
            {openingName || (ecoCode ? 'Identified Variation' : 'Opening Position')}
          </span>
          {totalGames > 0 ? (
            <span className="text-[10px] font-mono text-slate-400">
              {totalGames.toLocaleString()} master games
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">Out of master book</span>
          )}
        </div>

        {/* Stockfish Engine Complement Pill */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 shrink-0">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold">{stockfishScoreStr}</span>
          {bestMoveDisplay && (
            <span className="text-[10px] text-emerald-400/90 font-normal">
              Best: <strong className="text-white font-bold">{bestMoveDisplay}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Overall Position Success Rate Bar (When games exist) */}
      {totalGames > 0 && (
        <div className="px-3 pt-2 pb-1.5 bg-slate-950/40 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-slate-100 mr-1 align-middle" />
              White {whiteWinPct}%
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-slate-500 mr-1 align-middle" />
              Draw {drawPct}%
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-slate-900 border border-slate-700 mr-1 align-middle" />
              Black {blackWinPct}%
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800">
            {whiteWinPct > 0 && (
              <div
                style={{ width: `${whiteWinPct}%` }}
                className="bg-slate-100 h-full"
                title={`White wins: ${whiteWinPct}% (${whiteTotal.toLocaleString()})`}
              />
            )}
            {drawPct > 0 && (
              <div
                style={{ width: `${drawPct}%` }}
                className="bg-slate-500 h-full"
                title={`Draws: ${drawPct}% (${drawsTotal.toLocaleString()})`}
              />
            )}
            {blackWinPct > 0 && (
              <div
                style={{ width: `${blackWinPct}%` }}
                className="bg-slate-900 h-full"
                title={`Black wins: ${blackWinPct}% (${blackTotal.toLocaleString()})`}
              />
            )}
          </div>
        </div>
      )}

      {/* Interactive Top Moves List with 'Why this move?' Gemini AI feature */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[290px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            <span>Fetching master moves...</span>
          </div>
        ) : moves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
            <BookOpen className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs font-semibold text-slate-300">No opening moves</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Position is beyond master database theory.
            </p>
          </div>
        ) : (
          moves.slice(0, 7).map((m: LichessExplorerMove) => {
            const isBest = isMatchBestMove(m);
            const isExplainingThis = activeMoveForExplanation === m.san;
            const cacheKey = `${lichessData?.fen || ''}_${m.san}`;
            const explanationText = explanations[cacheKey] || explanations[m.san];

            return (
              <div key={m.uci || m.san} className="flex flex-col gap-1">
                <div
                  className={`w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${
                    isBest
                      ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm shadow-emerald-950/60 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950/50 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  {/* Clickable Move Selector */}
                  <div
                    onClick={() => onSelectMove && onSelectMove(m.san)}
                    className={`flex-1 grid grid-cols-12 items-center gap-1 min-w-0 ${
                      onSelectMove ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    title={
                      isBest
                        ? `★ Stockfish Best Move: ${m.san} (${m.totalGames.toLocaleString()} games, ${m.playPct}% popularity)`
                        : `Play ${m.san}: ${m.totalGames.toLocaleString()} games (${m.playPct}% popularity)`
                    }
                  >
                    {/* Move SAN + Best Move Badge */}
                    <div className="col-span-3 flex items-center gap-1 font-mono text-xs overflow-hidden">
                      <span
                        className={`font-black tracking-tight ${
                          isBest ? 'text-emerald-300' : 'text-slate-100 group-hover:text-amber-300'
                        }`}
                      >
                        {m.san}
                      </span>
                      {isBest && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-xs shrink-0"
                          title="Matches Stockfish Best Move"
                        >
                          <Cpu className="w-2.5 h-2.5 text-emerald-400" />
                          Best
                        </span>
                      )}
                    </div>

                    {/* Popularity % & Games Count */}
                    <div className="col-span-4 flex items-center justify-between pr-1 font-mono text-[10px]">
                      <span className={`font-semibold ${isBest ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {m.playPct}%
                      </span>
                      <span className="text-slate-400">
                        {m.totalGames >= 1000000
                          ? `${(m.totalGames / 1000000).toFixed(1)}M`
                          : m.totalGames >= 1000
                          ? `${(m.totalGames / 1000).toFixed(1)}k`
                          : m.totalGames}
                      </span>
                    </div>

                    {/* Win / Draw / Loss Bar with Percentage Labels */}
                    <div className="col-span-5 pl-0.5">
                      <div className="w-full h-3 rounded overflow-hidden flex bg-slate-800 text-[8px] font-mono font-bold select-none border border-slate-700/50">
                        {m.whiteWinPct > 0 && (
                          <div
                            style={{ width: `${m.whiteWinPct}%` }}
                            className="bg-slate-100 text-slate-950 flex items-center justify-center overflow-hidden"
                            title={`White: ${m.whiteWinPct}%`}
                          >
                            {m.whiteWinPct >= 25 && <span>{m.whiteWinPct}%</span>}
                          </div>
                        )}
                        {m.drawPct > 0 && (
                          <div
                            style={{ width: `${m.drawPct}%` }}
                            className="bg-slate-500 text-slate-100 flex items-center justify-center overflow-hidden"
                            title={`Draw: ${m.drawPct}%`}
                          >
                            {m.drawPct >= 25 && <span>{m.drawPct}%</span>}
                          </div>
                        )}
                        {m.blackWinPct > 0 && (
                          <div
                            style={{ width: `${m.blackWinPct}%` }}
                            className="bg-slate-900 text-slate-300 flex items-center justify-center overflow-hidden border-l border-slate-700/40"
                            title={`Black: ${m.blackWinPct}%`}
                          >
                            {m.blackWinPct >= 25 && <span>{m.blackWinPct}%</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 'Why this move?' Gemini AI explanation button */}
                  <button
                    onClick={(e) => handleWhyThisMove(m, e)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all shrink-0 cursor-pointer ${
                      isExplainingThis
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                        : 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-amber-300 border border-slate-700/70 hover:border-amber-500/40'
                    }`}
                    title={`Ask Gemini AI why master players choose ${m.san}`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="whitespace-nowrap">Why this move?</span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMoveForExplanation(null);
                        }}
                        className="text-slate-400 hover:text-slate-200 text-xs px-1 hover:bg-slate-800 rounded transition-colors"
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
          })
        )}
      </div>
    </div>
  );
};


