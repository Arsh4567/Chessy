import React from 'react';
import { BookOpen, Lightbulb, ArrowRight } from 'lucide-react';
import { OpeningTheoryReport, ImprovementPlanItem } from '../../utils/chessReportEngine';

interface ReportTheoryAndActionPlanProps {
  openingReport: OpeningTheoryReport;
  improvementPlan: ImprovementPlanItem[];
}

export const ReportTheoryAndActionPlan: React.FC<ReportTheoryAndActionPlanProps> = ({
  openingReport,
  improvementPlan,
}) => {
  return (
    <div className="space-y-6">
      {/* 7. Opening Theory Report */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            7. Opening Report & Theory Departure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-300">Primary White Weapon</span>
            {openingReport.whiteMainOpening ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-amber-400">
                  {openingReport.whiteMainOpening.name}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {openingReport.whiteMainOpening.gamesCount} games ·{' '}
                  <span className="text-emerald-400 font-bold">
                    {openingReport.whiteMainOpening.winRate}% Win
                  </span>{' '}
                  · Avg Eval M10: {openingReport.whiteMainOpening.avgEvalAfterOpening}
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Average theoretical departure: Move{' '}
                  <span className="font-mono font-bold text-slate-300">
                    {openingReport.whiteTheoryDivergence.hasEnoughData
                      ? openingReport.whiteTheoryDivergence.avgMove
                      : 'Not enough data'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Not enough data</div>
            )}
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-300">Primary Black Defense</span>
            {openingReport.blackMainOpening ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-sky-400">
                  {openingReport.blackMainOpening.name}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {openingReport.blackMainOpening.gamesCount} games ·{' '}
                  <span className="text-emerald-400 font-bold">
                    {openingReport.blackMainOpening.winRate}% Win
                  </span>{' '}
                  · Avg Eval M10: {openingReport.blackMainOpening.avgEvalAfterOpening}
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Average theoretical departure: Move{' '}
                  <span className="font-mono font-bold text-slate-300">
                    {openingReport.blackTheoryDivergence.hasEnoughData
                      ? openingReport.blackTheoryDivergence.avgMove
                      : 'Not enough data'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Not enough data</div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Data-Backed Improvement Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            8. Improvement Plan (Data-Backed)
          </h2>
        </div>

        <div className="space-y-3">
          {improvementPlan.map((plan, idx) => (
            <div
              key={plan.id}
              className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-200">{plan.area}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    plan.priority === 'high'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {plan.priority} priority
                </span>
              </div>

              <div className="text-xs text-slate-300 font-medium">
                <span className="text-slate-400">Finding:</span> {plan.finding}
              </div>

              <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                <span className="text-amber-400 font-semibold">Evidence:</span> {plan.evidence}
              </div>

              <div className="text-xs text-emerald-300 font-semibold flex items-start gap-1.5 pt-1">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Action Step: {plan.actionableStep}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
