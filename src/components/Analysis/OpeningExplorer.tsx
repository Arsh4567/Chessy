import React, { useState, useEffect } from 'react';
import { 
  LichessExplorerResult, 
  fetchLichessOpeningStats, 
  LichessExplorerMove 
} from '../../utils/lichessExplorer';
import { StockfishEvaluation } from '../../utils/stockfishWorker';
import { Award, BookOpen, RefreshCw, Cpu } from 'lucide-react';

interface OpeningExplorerProps {
  fen: string;
  onSelectMove: (san: string) => void;
  stockfishEval?: StockfishEvaluation;
  bestMoveSan?: string;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = React.memo(({
  fen,
  onSelectMove,
  stockfishEval,
  bestMoveSan,
}) => {
  const [explorerData, setExplorerData] = useState<LichessExplorerResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Safe on-demand fetch for only the exact current position FEN
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Debounce slightly to allow smooth board navigation
    const timer = setTimeout(async () => {
      try {
        const response = await fetchLichessOpeningStats(fen);
        if (!isMounted) return;

        if (response.status === 'success' && response.data) {
          setExplorerData(response.data);
        } else {
          setExplorerData(null);
        }
      } catch {
        if (isMounted) {
          setExplorerData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fen]);

  const moves = explorerData?.moves || [];
  const openingName = explorerData?.opening?.name;
  const ecoCode = explorerData?.opening?.eco;
  const totalGames = explorerData?.totalGames || 0;
  const whiteTotal = explorerData?.whiteTotal || 0;
  const drawsTotal = explorerData?.drawsTotal || 0;
  const blackTotal = explorerData?.blackTotal || 0;

  const whiteWinPct = totalGames > 0 ? Math.round((whiteTotal / totalGames) * 100) : 0;
  const drawPct = totalGames > 0 ? Math.round((drawsTotal / totalGames) * 100) : 0;
  const blackWinPct = totalGames > 0 ? Math.max(0, 100 - whiteWinPct - drawPct) : 0;

  // Independent Stockfish evaluation display
  const stockfishScoreStr = stockfishEval
    ? stockfishEval.displayEval ||
      (stockfishEval.evalPawns !== undefined
        ? `${stockfishEval.evalPawns > 0 ? '+' : ''}${stockfishEval.evalPawns.toFixed(2)}`
        : `${(stockfishEval.scoreCp / 100).toFixed(2)}`)
    : '+0.00';

  const isMatchBestMove = (m: LichessExplorerMove): boolean => {
    if (bestMoveSan && m.san) {
      const cleanMSan = m.san.replace(/[+#x!?-]/g, '').trim();
      const cleanBMSan = bestMoveSan.replace(/[+#x!?-]/g, '').trim();
      if (cleanMSan === cleanBMSan || m.san.trim() === bestMoveSan.trim()) return true;
    }
    if (stockfishEval?.bestMove) {
      const bm: any = stockfishEval.bestMove;
      if (m.uci && bm.rawUci && m.uci.toLowerCase() === bm.rawUci.toLowerCase()) return true;
      if (m.uci && bm.from && bm.to && m.uci.toLowerCase() === `${bm.from}${bm.to}${bm.promotion || ''}`.toLowerCase()) return true;
      if (typeof bm === 'string' && (m.san?.toLowerCase() === bm.toLowerCase() || m.uci?.toLowerCase() === bm.toLowerCase())) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-200 select-none">
      {/* Header */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Masters Opening Explorer
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
          FIDE 2200+ Masters
        </span>
      </div>

      {/* Opening Name & ECO Banner (displayed whenever available) */}
      <div className="px-3 py-2.5 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {ecoCode && (
            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              {ecoCode}
            </span>
          )}
          <span 
            className="font-bold text-xs text-slate-100 truncate" 
            title={openingName || 'Chess Position'}
          >
            {openingName || (ecoCode ? 'Identified Variation' : 'Chess Position')}
          </span>
        </div>
        {totalGames > 0 && (
          <span className="text-[11px] font-mono font-medium text-slate-400 shrink-0">
            {totalGames.toLocaleString()} games
          </span>
        )}
      </div>

      {/* Independent Local Stockfish Engine Best Card (Kept separate from Masters data) */}
      <div className="mx-3 my-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <span>Stockfish Best Move</span>
              {stockfishEval && stockfishEval.depth > 0 && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  D{stockfishEval.depth}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-black text-xs text-white bg-emerald-900/70 px-2 py-0.5 rounded border border-emerald-500/40">
                {bestMoveSan || (stockfishEval?.bestMove ? `${stockfishEval.bestMove.from}${stockfishEval.bestMove.to}` : 'Calculating...')}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {stockfishScoreStr}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-semibold text-emerald-400/90 block">Engine Calculation</span>
          <span className="text-[9px] text-slate-400 block">Independent evaluation</span>
        </div>
      </div>

      {/* Masters Statistics Summary Panel (When data is available) */}
      {totalGames > 0 && (
        <div className="mx-3 mb-2 p-2 bg-slate-950/70 border border-slate-800 rounded-xl shrink-0">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1.5 px-0.5">
            <span>
              <strong className="text-white">White wins:</strong> {whiteWinPct}% ({whiteTotal.toLocaleString()})
            </span>
            <span>
              <strong className="text-slate-400">Draws:</strong> {drawPct}% ({drawsTotal.toLocaleString()})
            </span>
            <span>
              <strong className="text-slate-400">Black wins:</strong> {blackWinPct}% ({blackTotal.toLocaleString()})
            </span>
          </div>
          {/* Position Win/Draw/Loss Bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800 border border-slate-700/50">
            {whiteWinPct > 0 && (
              <div 
                style={{ width: `${whiteWinPct}%` }} 
                className="bg-slate-100 h-full" 
                title={`White wins: ${whiteWinPct}%`} 
              />
            )}
            {drawPct > 0 && (
              <div 
                style={{ width: `${drawPct}%` }} 
                className="bg-slate-500 h-full" 
                title={`Draws: ${drawPct}%`} 
              />
            )}
            {blackWinPct > 0 && (
              <div 
                style={{ width: `${blackWinPct}%` }} 
                className="bg-slate-900 h-full" 
                title={`Black wins: ${blackWinPct}%`} 
              />
            )}
          </div>
        </div>
      )}

      {/* Masters Move Explorer Table or "No opening data" */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-[140px]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center py-8 space-y-2 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span className="text-xs font-medium">Fetching Masters opening statistics...</span>
          </div>
        ) : moves.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mb-1" />
            <p className="text-sm font-semibold text-slate-300">No opening data</p>
            <p className="text-xs text-slate-500 max-w-[260px]">
              {openingName 
                ? `No master games found for this variation of ${openingName}.` 
                : 'Position is out of Masters opening book.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider border-b border-slate-800/60">
              <span className="col-span-2">Move</span>
              <span className="col-span-2 text-center">Freq</span>
              <span className="col-span-3 text-right pr-2">Games</span>
              <span className="col-span-5 text-center">Win / Draw / Loss</span>
            </div>

            {/* Most-Played Moves Rows */}
            {moves.map((m: LichessExplorerMove) => {
              const isBest = isMatchBestMove(m);
              return (
                <button
                  key={m.uci || m.san}
                  onClick={() => onSelectMove(m.san)}
                  className={`w-full grid grid-cols-12 items-center px-2.5 py-2 rounded-xl border transition-all text-left group cursor-pointer ${
                    isBest
                      ? 'bg-gradient-to-r from-emerald-950/85 via-emerald-900/40 to-slate-900/95 border-emerald-400/90 shadow-[0_0_15px_rgba(16,185,129,0.22)] ring-1 ring-emerald-400/60'
                      : 'bg-slate-950/60 hover:bg-slate-800/90 border-slate-800/80 hover:border-amber-500/40'
                  }`}
                  title={
                    isBest
                      ? `★ Stockfish Engine #1 Choice: ${m.san} (${m.totalGames.toLocaleString()} games in Masters database)`
                      : `Play ${m.san} (${m.totalGames.toLocaleString()} games in Masters database)`
                  }
                >
                  {/* Move SAN */}
                  <div className="col-span-2 flex items-center gap-1 font-mono overflow-hidden">
                    <span
                      className={`font-black ${
                        isBest ? 'text-sm text-emerald-200 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'text-xs text-slate-100 group-hover:text-amber-300'
                      }`}
                    >
                      {m.san}
                    </span>
                    {isBest && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/70 shrink-0">
                        Best
                      </span>
                    )}
                  </div>

                  {/* Frequency / Play % */}
                  <div className={`col-span-2 text-center font-mono font-bold text-xs ${isBest ? 'text-emerald-300' : 'text-amber-400'}`}>
                    {m.playPct}%
                  </div>

                  {/* Games count */}
                  <div className="col-span-3 text-right font-mono text-[11px] text-slate-300 pr-2">
                    {m.totalGames >= 1000000
                      ? `${(m.totalGames / 1000000).toFixed(1)}M`
                      : m.totalGames >= 1000
                      ? `${(m.totalGames / 1000).toFixed(1)}k`
                      : m.totalGames.toLocaleString()}
                  </div>

                  {/* Win/Draw/Loss visual bar with percentages */}
                  <div className="col-span-5 flex flex-col gap-1 pl-1">
                    <div className={`w-full h-3.5 rounded-full overflow-hidden flex bg-slate-800 text-[9px] font-mono font-black select-none border ${isBest ? 'border-emerald-400/60 shadow-inner' : 'border-slate-700/60'}`}>
                      {m.whiteWinPct > 0 && (
                        <div
                          style={{ width: `${m.whiteWinPct}%` }}
                          className="bg-emerald-600 text-white flex items-center justify-center overflow-hidden transition-all"
                          title={`White Win: ${m.whiteWinPct}%`}
                        >
                          {m.whiteWinPct >= 18 && <span>{m.whiteWinPct}%</span>}
                        </div>
                      )}
                      {m.drawPct > 0 && (
                        <div
                          style={{ width: `${m.drawPct}%` }}
                          className="bg-slate-500 text-slate-100 flex items-center justify-center overflow-hidden transition-all"
                          title={`Draw: ${m.drawPct}%`}
                        >
                          {m.drawPct >= 18 && <span>{m.drawPct}%</span>}
                        </div>
                      )}
                      {m.blackWinPct > 0 && (
                        <div
                          style={{ width: `${m.blackWinPct}%` }}
                          className="bg-rose-600 text-white flex items-center justify-center overflow-hidden transition-all border-l border-slate-700/40"
                          title={`Black Win: ${m.blackWinPct}%`}
                        >
                          {m.blackWinPct >= 18 && <span>{m.blackWinPct}%</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1 text-slate-400">
          <BookOpen className="w-3 h-3 text-amber-400" />
          <span>Lichess Masters Opening DB</span>
        </span>
        <span className="text-slate-500 font-mono">
          https://explorer.lichess.ovh/masters
        </span>
      </div>
    </div>
  );
});
