import React from 'react';
import { 
  RotateCcw, 
  Copy, 
  Check, 
  Upload, 
  Globe,
  ChevronLeft
} from 'lucide-react';

interface AnalysisHeaderProps {
  opening?: { eco: string; name: string } | null;
  isProgressivelyAnalyzing: boolean;
  analysisProgress: number;
  showChessCom: boolean;
  showPgnImport: boolean;
  isFlipped: boolean;
  copiedPgn: boolean;
  copiedFen: boolean;
  onExitAnalysis: () => void;
  onToggleChessCom: () => void;
  onTogglePgnImport: () => void;
  onToggleFlip: () => void;
  onCopyPgn: () => void;
  onCopyFen: () => void;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  opening,
  isProgressivelyAnalyzing,
  analysisProgress,
  showChessCom,
  showPgnImport,
  isFlipped,
  copiedPgn,
  copiedFen,
  onExitAnalysis,
  onToggleChessCom,
  onTogglePgnImport,
  onToggleFlip,
  onCopyPgn,
  onCopyFen,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onExitAnalysis}
          className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-black font-display text-white">
            Stockfish Analysis Board
          </h1>
          {opening && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-lg">
              <span className="font-bold">{opening.eco}</span>
              <span className="text-slate-300 font-sans truncate max-w-[200px]">{opening.name}</span>
            </span>
          )}
          {isProgressivelyAnalyzing && analysisProgress < 100 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Evaluating {analysisProgress}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleChessCom}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
            showChessCom
              ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>Chess.com</span>
        </button>
        <button
          onClick={onTogglePgnImport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span>Import</span>
        </button>
        <button
          onClick={onToggleFlip}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Flip Board"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Flip</span>
        </button>
        <button
          onClick={onCopyPgn}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Copy PGN"
        >
          {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>PGN</span>
        </button>
        <button
          onClick={onCopyFen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Copy FEN"
        >
          {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>FEN</span>
        </button>
      </div>
    </div>
  );
};

