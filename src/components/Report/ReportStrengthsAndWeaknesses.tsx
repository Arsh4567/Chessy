import React from 'react';
import { CheckCircle2, Target } from 'lucide-react';
import { StrengthArea, MistakePattern } from '../../utils/chessReportEngine';

interface ReportStrengthsAndWeaknessesProps {
  strongAreas: StrengthArea[];
  areasForImprovement: MistakePattern[];
}

export const ReportStrengthsAndWeaknesses: React.FC<ReportStrengthsAndWeaknessesProps> = ({
  strongAreas,
  areasForImprovement,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 5. Strong Areas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            5. Strong Areas
          </h2>
        </div>

        <div className="space-y-3">
          {strongAreas.map((sa) => (
            <div
              key={sa.id}
              className="bg-slate-950/60 border border-slate-800/90 p-3.5 rounded-xl space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{sa.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    sa.rating === 'elite'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : sa.rating === 'strong'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {sa.hasEnoughData ? sa.rating : 'Not enough data'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-slate-400">{sa.metric}</span>
                <span className="font-bold text-emerald-400">
                  {sa.hasEnoughData ? `${sa.scorePercent}%` : '—'}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 font-mono">
                {sa.hasEnoughData ? sa.supportingData : 'Needs >= 2 test positions'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Areas for Improvement */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            6. Areas for Improvement
          </h2>
        </div>

        <div className="space-y-3">
          {areasForImprovement.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Not enough data or no severe recurring weaknesses found in this sample.
            </div>
          ) : (
            areasForImprovement.slice(0, 4).map((weak) => (
              <div
                key={weak.id}
                className="bg-slate-950/60 border border-slate-800/90 p-3.5 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{weak.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {weak.occurrences} instances
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">{weak.description}</p>

                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>Frequency: {weak.percentageOfGames}% of games</span>
                  {weak.exampleMoveSan && (
                    <span className="text-amber-400 truncate max-w-[150px]">
                      Ex: {weak.exampleMoveSan}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
