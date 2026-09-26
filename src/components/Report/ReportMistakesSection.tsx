import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MistakePattern } from '../../utils/chessReportEngine';

interface ReportMistakesSectionProps {
  commonMistakes: MistakePattern[];
}

export const ReportMistakesSection: React.FC<ReportMistakesSectionProps> = ({
  commonMistakes,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
          4. Common Mistakes (Stockfish Analyzed)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {commonMistakes.map((m) => (
          <div
            key={m.id}
            className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-100">{m.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    m.occurrences > 0
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {m.occurrences > 0 ? `${m.occurrences}x found` : 'Clean'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.description}</p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Affected Games:</span>
              <span className="font-bold text-slate-300">
                {m.hasEnoughData
                  ? `${m.affectedGamesCount} (${m.percentageOfGames}%)`
                  : 'Not enough data'}
              </span>
            </div>

            {m.exampleMoveSan && (
              <div className="text-[10px] font-mono bg-slate-900 p-1.5 rounded text-amber-300/90 truncate">
                Ex: {m.exampleMoveSan} {m.exampleOpponent ? `vs ${m.exampleOpponent}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
