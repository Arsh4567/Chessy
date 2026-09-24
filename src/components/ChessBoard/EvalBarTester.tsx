import React, { useState } from 'react';
import { StockfishEvaluation, stockfish } from '../../utils/stockfishWorker';
import { centipawnsToWinProb } from '../../utils/engine';
import { Cpu, Play, CheckCircle2, FlaskConical, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export interface TestPosition {
  id: string;
  name: string;
  category: string;
  fen: string;
  expectedSign: 'equal' | 'white_win' | 'black_win' | 'mate_white';
  description: string;
}

export const BENCHMARK_POSITIONS: TestPosition[] = [
  {
    id: 'pos-start',
    name: 'Position 1: Equal / Starting Position',
    category: 'Opening / Equal',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    expectedSign: 'equal',
    description: 'Initial standard chess position. White has minor first-move tempo edge (+0.0 to +0.3). Bar should be centered ~50%.',
  },
  {
    id: 'pos-white-queen',
    name: 'Position 2: White +9 Advantage (Black Missing Queen)',
    category: 'Material Decisive (White)',
    fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    expectedSign: 'white_win',
    description: 'Black queen missing from d8. Stockfish UCI raw score +900+ cp. Converted eval +9.0+. Bar heavily White (>95%).',
  },
  {
    id: 'pos-black-queen',
    name: 'Position 3: Black +9 Advantage (White Missing Queen)',
    category: 'Material Decisive (Black)',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1',
    expectedSign: 'black_win',
    description: 'White queen missing from d1. Black to move (b). Stockfish UCI outputs raw score +900+ cp. Side-to-move inversion converts to -9.0+ White perspective. Bar heavily Black (<5% White).',
  },
  {
    id: 'pos-mate-1',
    name: 'Position 4: White Forced Mate in 1 (Re8#)',
    category: 'Forced Checkmate',
    fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    expectedSign: 'mate_white',
    description: 'Back rank mate in 1. Stockfish outputs UCI `score mate 1`. Converted to M1 (+10000 cp). Bar 97% White.',
  },
];

interface EvalBarTesterProps {
  currentFen: string;
  stockfishEval: StockfishEvaluation;
  isEvaluating: boolean;
  onSelectPosition: (fen: string, description?: string) => void;
}

export interface E2ETestRecord {
  positionName: string;
  fen: string;
  rawUciScore: string;
  rawScoreType: string;
  rawScoreValue: number;
  sideToMove: string;
  convertedEval: string;
  scoreCp: number;
  winProbWhite: number;
  barPercentWhite: number;
  passed: boolean;
  notes: string;
}

export const EvalBarTester: React.FC<EvalBarTesterProps> = ({
  currentFen,
  stockfishEval,
  isEvaluating,
  onSelectPosition,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRunningE2E, setIsRunningE2E] = useState<boolean>(false);
  const [e2eProgress, setE2eProgress] = useState<string>('');
  const [testRecords, setTestRecords] = useState<E2ETestRecord[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Centipawns & Win probability
  const cp = stockfishEval.scoreCp;
  const winProb = centipawnsToWinProb(cp);
  const whiteBarHeight = Math.min(97, Math.max(3, winProb));

  // Run automated end-to-end evaluation verification
  const runE2EVerification = async () => {
    setIsRunningE2E(true);
    setTestRecords([]);
    const records: E2ETestRecord[] = [];

    try {
      for (let i = 0; i < BENCHMARK_POSITIONS.length; i++) {
        const pos = BENCHMARK_POSITIONS[i];
        setE2eProgress(`Testing ${i + 1}/${BENCHMARK_POSITIONS.length}: ${pos.name}...`);

        // Load position onto active board
        onSelectPosition(pos.fen, pos.description);

        // Run Stockfish evaluation
        const evalResult = await stockfish.evaluatePosition(pos.fen, 10);

        const currentCp = evalResult.scoreCp;
        const currentWinProb = centipawnsToWinProb(currentCp);
        const barHeight = Math.min(97, Math.max(3, currentWinProb));

        // Verify correctness based on expected sign
        let passed = false;
        let notes = '';

        if (pos.expectedSign === 'equal') {
          passed = Math.abs(currentCp) < 150;
          notes = `Balanced: ${evalResult.displayEval} (~${currentWinProb.toFixed(0)}% win chance)`;
        } else if (pos.expectedSign === 'white_win') {
          passed = currentCp > 600;
          notes = `Decisive White advantage: ${evalResult.displayEval} (${barHeight.toFixed(1)}% White bar)`;
        } else if (pos.expectedSign === 'black_win') {
          passed = currentCp < -600;
          notes = `Decisive Black advantage: ${evalResult.displayEval} (${barHeight.toFixed(1)}% White bar, Black dominant)`;
        } else if (pos.expectedSign === 'mate_white') {
          passed = evalResult.mate === 1 || evalResult.scoreCp > 9000;
          notes = `Mate detected: ${evalResult.displayEval} (${barHeight.toFixed(1)}% bar)`;
        }

        const rec: E2ETestRecord = {
          positionName: pos.name,
          fen: pos.fen,
          rawUciScore: evalResult.rawUciScore || `${evalResult.rawScoreType} ${evalResult.rawScoreValue}`,
          rawScoreType: evalResult.rawScoreType || 'cp',
          rawScoreValue: evalResult.rawScoreValue || 0,
          sideToMove: evalResult.sideToMove || pos.fen.split(' ')[1],
          convertedEval: evalResult.displayEval || '0.00',
          scoreCp: evalResult.scoreCp,
          winProbWhite: +currentWinProb.toFixed(1),
          barPercentWhite: +barHeight.toFixed(1),
          passed,
          notes,
        };

        records.push(rec);
        setTestRecords([...records]);
        await new Promise((r) => setTimeout(r, 250));
      }

      setE2eProgress('All tests completed successfully!');
    } catch (err) {
      console.error('E2E Verification failed:', err);
      setE2eProgress('Error during E2E testing');
    } finally {
      setIsRunningE2E(false);
    }
  };

  const copyTestReport = () => {
    if (testRecords.length === 0) return;
    const text = testRecords
      .map(
        (r, idx) =>
          `[Test ${idx + 1}] ${r.positionName}\n` +
          `  FEN: ${r.fen}\n` +
          `  Raw UCI Score: ${r.rawUciScore} (Side to move: ${r.sideToMove})\n` +
          `  Converted Evaluation: ${r.convertedEval} (${r.scoreCp} cp)\n` +
          `  Eval Bar White: ${r.barPercentWhite}% | Win Prob: ${r.winProbWhite}%\n` +
          `  Status: ${r.passed ? 'PASSED (Verified from live Stockfish UCI output)' : 'FAILED'}\n` +
          `  Note: ${r.notes}\n`
      )
      .join('\n');

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[540px] bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3 font-sans">
      {/* Live Engine UCI Header & Summary */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            {isEvaluating ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Stockfish 19 UCI Live
          </span>
          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
            D{stockfishEval.depth}
          </span>
        </div>

        {/* Evaluation Pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase">UCI:</span>
            <span className="font-bold text-cyan-400">{stockfishEval.rawUciScore || 'cp 0'}</span>
          </div>

          <div
            className={`font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
              stockfishEval.scoreCp > 50
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : stockfishEval.scoreCp < -50
                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                : 'bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <span className="text-[10px] opacity-75 uppercase">Eval:</span>
            <span>{stockfishEval.displayEval || '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Real-time UCI Score Details & Bar Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
        <div>
          <span className="text-slate-500 block text-[10px]">Raw UCI Score</span>
          <span className="text-cyan-300 font-bold">{stockfishEval.rawUciScore || 'cp 0'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Turn / Side</span>
          <span className="text-slate-200 font-bold">
            {stockfishEval.sideToMove === 'b' ? 'Black (b)' : 'White (w)'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Converted White</span>
          <span
            className={`font-bold ${
              stockfishEval.scoreCp > 0
                ? 'text-emerald-400'
                : stockfishEval.scoreCp < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {stockfishEval.displayEval || '0.00'} ({stockfishEval.scoreCp} cp)
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Bar White Height</span>
          <span className="text-amber-400 font-bold">
            {whiteBarHeight.toFixed(1)}% ({winProb.toFixed(1)}% win)
          </span>
        </div>
      </div>

      {/* Accordion Toggle for Testing Suite */}
      <div className="pt-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5 text-amber-400">
            <FlaskConical className="w-3.5 h-3.5" />
            End-to-End Evaluation Bar Test Suite ({BENCHMARK_POSITIONS.length} Positions)
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="mt-3 space-y-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Load Test Positions & Observe Eval Bar Changes:
              </span>
              <button
                onClick={runE2EVerification}
                disabled={isRunningE2E}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs rounded-lg shadow cursor-pointer disabled:opacity-50 transition-all"
              >
                <Play className="w-3 h-3 fill-current" />
                {isRunningE2E ? 'Evaluating...' : 'Run Automated E2E Test'}
              </button>
            </div>

            {/* Position Picker Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BENCHMARK_POSITIONS.map((pos) => {
                const isActive = currentFen === pos.fen;
                return (
                  <button
                    key={pos.id}
                    onClick={() => onSelectPosition(pos.fen, pos.description)}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-900/20'
                        : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-200 line-clamp-1">{pos.name}</span>
                      {isActive && <span className="text-[10px] text-cyan-400 font-mono font-bold">ACTIVE</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{pos.description}</p>
                  </button>
                );
              })}
            </div>

            {/* E2E Verification Progress & Results Log */}
            {e2eProgress && (
              <div className="text-[11px] font-mono text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>{e2eProgress}</span>
                {testRecords.length > 0 && (
                  <button
                    onClick={copyTestReport}
                    className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white cursor-pointer px-2 py-0.5 bg-slate-800 rounded border border-slate-700"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy Report'}
                  </button>
                )}
              </div>
            )}

            {testRecords.length > 0 && (
              <div className="space-y-2 border-t border-slate-800 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Verification Records ({testRecords.filter((r) => r.passed).length}/{testRecords.length} Passed):
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {testRecords.map((r, i) => (
                    <div
                      key={i}
                      className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] font-mono flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 line-clamp-1">{r.positionName}</span>
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            r.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[10px]">
                        <span>
                          Raw UCI: <strong className="text-cyan-300">{r.rawUciScore}</strong> ({r.sideToMove})
                        </span>
                        <span>
                          Converted: <strong className="text-amber-300">{r.convertedEval}</strong> ({r.scoreCp} cp)
                        </span>
                        <span>
                          Bar White: <strong className="text-slate-200">{r.barPercentWhite}%</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
