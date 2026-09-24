import React, { useState, useEffect, useCallback } from 'react';
import { 
  ExplorerDatabase, 
  LichessExplorerResult, 
  fetchLichessOpeningStats, 
  LichessExplorerMove,
  getLichessCooldown,
  resetLichessCircuitBreaker
} from '../../utils/lichessExplorer';
import { StockfishEvaluation } from '../../utils/stockfishWorker';
import { Database, Award, BookOpen, RefreshCw, Cpu, AlertTriangle, ShieldCheck, Play } from 'lucide-react';

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
  const [database, setDatabase] = useState<ExplorerDatabase>('lichess');
  const [explorerData, setExplorerData] = useState<LichessExplorerResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Debounced, safe on-demand fetch for only the current FEN
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setStatusMessage(null);

    const cooldown = getLichessCooldown();
    setCooldownSeconds(cooldown);

    const timer = setTimeout(async () => {
      try {
        const response = await fetchLichessOpeningStats(fen, database);
        if (!isMounted) return;

        if (response.status === 'success' && response.data) {
          setExplorerData(response.data);
          setStatusMessage(null);
          setCooldownSeconds(0);
        } else if (response.status === 'disabled' || response.status === 'rate_limited') {
          setExplorerData(null);
          setStatusMessage(response.message || 'Lichess explorer temporarily paused.');
          setCooldownSeconds(response.cooldownSeconds || getLichessCooldown());
        } else if (response.status === 'error') {
          if (response.message !== 'Request cancelled') {
            setExplorerData(null);
            setStatusMessage(response.message || 'Unable to fetch database statistics.');
          }
        }
      } catch (e) {
        if (isMounted) {
          setExplorerData(null);
          setStatusMessage('Database connection unavailable.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fen, database]);

  // Countdown timer for cooldown display
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          setStatusMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleManualRetry = useCallback(async () => {
    resetLichessCircuitBreaker();
    setCooldownSeconds(0);
    setStatusMessage(null);
    setIsLoading(true);
    try {
      const response = await fetchLichessOpeningStats(fen, database);
      if (response.status === 'success' && response.data) {
        setExplorerData(response.data);
      } else {
        setStatusMessage(response.message || 'Database unavailable');
      }
    } catch {
      setStatusMessage('Network connection failed');
    } finally {
      setIsLoading(false);
    }
  }, [fen, database]);

  const moves = explorerData?.moves || [];
  const openingName = explorerData?.opening?.name;
  const ecoCode = explorerData?.opening?.eco;
  const totalGames = explorerData?.totalGames || 0;

  // Stockfish evaluation display
  const stockfishScoreStr = stockfishEval
    ? stockfishEval.displayEval ||
      (stockfishEval.evalPawns !== undefined
        ? `${stockfishEval.evalPawns > 0 ? '+' : ''}${stockfishEval.evalPawns.toFixed(2)}`
        : `${(stockfishEval.scoreCp / 100).toFixed(2)}`)
    : '+0.00';

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-200 select-none">
      {/* Header with Title & Database Toggle */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Opening Explorer
          </span>
        </div>

        {/* Database Selector: Most Played vs Masters */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
          <button
            onClick={() => setDatabase('lichess')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              database === 'lichess'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Most Played online rated games on Lichess"
          >
            <Database className="w-3 h-3" />
            <span>Most Played</span>
          </button>
          <button
            onClick={() => setDatabase('masters')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              database === 'masters'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="FIDE 2200+ Master over-the-board tournament games"
          >
            <Award className="w-3 h-3" />
            <span>Masters</span>
          </button>
        </div>
      </div>

      {/* Opening Name & ECO Banner */}
      <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {ecoCode && (
            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              {ecoCode}
            </span>
          )}
          <span className="font-bold text-xs text-slate-100 truncate" title={openingName || 'Standard Opening'}>
            {openingName || (ecoCode ? 'Identified Variation' : 'Position')}
          </span>
        </div>
        {totalGames > 0 && (
          <span className="text-[11px] font-mono font-medium text-slate-400 shrink-0">
            {totalGames.toLocaleString()} games
          </span>
        )}
      </div>

      {/* Independent Local Stockfish Engine Best Card */}
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
          <span className="text-[9px] font-semibold text-emerald-400/90 block">Local Engine</span>
          <span className="text-[9px] text-slate-400 block">Separate calculation</span>
        </div>
      </div>

      {/* Move Explorer Table & State Container */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-[140px]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center py-8 space-y-2 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span className="text-xs font-medium">Fetching opening statistics...</span>
          </div>
        ) : cooldownSeconds > 0 || statusMessage ? (
          <div className="h-full flex flex-col items-center justify-center py-6 px-4 text-center space-y-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-400/90" />
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-semibold">{statusMessage || 'Lichess Database Unavailable'}</p>
              <p className="text-[11px] text-slate-400">
                {cooldownSeconds > 0
                  ? `Cooldown active: ${cooldownSeconds}s remaining to respect API limits.`
                  : 'Board and Stockfish analysis continue running smoothly.'}
              </p>
            </div>
            <button
              onClick={handleManualRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 cursor-pointer shadow transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Explorer</span>
            </button>
          </div>
        ) : moves.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-1">
            <BookOpen className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs font-medium text-slate-300">No database games recorded</p>
            <p className="text-[11px] text-slate-500">Position is out of opening book</p>
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

            {/* Move Rows */}
            {moves.map((m: LichessExplorerMove) => {
              return (
                <button
                  key={m.uci || m.san}
                  onClick={() => onSelectMove(m.san)}
                  className="w-full grid grid-cols-12 items-center px-2 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/90 border border-slate-800/80 hover:border-amber-500/40 transition-all text-left group cursor-pointer"
                  title={`Play ${m.san} (${m.totalGames.toLocaleString()} games in ${database === 'masters' ? 'Masters' : 'Lichess'} database)`}
                >
                  {/* Move SAN */}
                  <div className="col-span-2 flex items-center gap-1 font-mono font-black text-xs text-slate-100 group-hover:text-amber-300">
                    <span>{m.san}</span>
                  </div>

                  {/* Frequency / Play % */}
                  <div className="col-span-2 text-center font-mono font-bold text-xs text-amber-400">
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
                    <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-800 text-[9px] font-mono font-black select-none border border-slate-700/60">
                      {m.whiteWinPct > 0 && (
                        <div
                          style={{ width: `${m.whiteWinPct}%` }}
                          className="bg-slate-100 text-slate-950 flex items-center justify-center overflow-hidden transition-all"
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
                          className="bg-slate-900 text-slate-300 flex items-center justify-center overflow-hidden transition-all border-l border-slate-700/40"
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
          <Database className="w-3 h-3 text-amber-400" />
          <span>Lichess Opening DB</span>
        </span>
        <span className="text-slate-500 font-mono">
          {database === 'masters' ? 'FIDE 2200+ Masters' : 'Rated 1600-2500+'}
        </span>
      </div>
    </div>
  );
});
