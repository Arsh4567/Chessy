import React from 'react';
import { Cpu, Layers } from 'lucide-react';
import { StockfishEvaluation } from '../../utils/stockfishWorker';

interface EngineStatusHudProps {
  stockfishEval: StockfishEvaluation;
  livePvSan: string[];
  displayEval: string;
}

export const EngineStatusHud: React.FC<EngineStatusHudProps> = ({
  stockfishEval,
  livePvSan,
  displayEval,
}) => {
  return (
    <div className="w-full max-w-[540px] bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">Stockfish 19 WebAssembly</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>Depth</span>
            <span className="font-black text-xs">{stockfishEval.depth > 0 ? stockfishEval.depth : '...'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {stockfishEval.nps && stockfishEval.nps > 0 && (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline tabular-nums">
              {stockfishEval.nps >= 1000000
                ? `${(stockfishEval.nps / 1000000).toFixed(1)}M nps`
                : `${Math.round(stockfishEval.nps / 1000)}k nps`}
            </span>
          )}
          <span className={`text-sm font-mono font-black px-2.5 py-0.5 rounded-lg tabular-nums ${
            stockfishEval.scoreCp > 50
              ? 'bg-emerald-500/20 text-emerald-400'
              : stockfishEval.scoreCp < -50
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {stockfishEval.displayEval || displayEval}
          </span>
        </div>
      </div>

      {/* Live PV (Principal Variation) Continuation */}
      {livePvSan.length > 0 && (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Live Engine Continuation Line
            </span>
            {stockfishEval.bestMove && (
              <span className="text-emerald-400 font-mono text-[10px] font-bold">
                Top: {livePvSan[0] || `${stockfishEval.bestMove.from}${stockfishEval.bestMove.to}`}
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-slate-300 flex flex-wrap gap-1.5 items-center leading-relaxed">
            {livePvSan.slice(0, 10).map((san, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded ${
                  i === 0
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300'
                }`}
              >
                {san}
              </span>
            ))}
            {livePvSan.length > 10 && (
              <span className="text-[10px] text-slate-500 font-sans">
                +{livePvSan.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
