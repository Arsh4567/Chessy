import React, { useState, useEffect, useRef } from 'react';
import { AnalyzedMove } from '../../types/chess';
import { MoveMark } from '../ChessBoard/MoveMark';
import { fetchBeginnerMoveExplanation } from '../../utils/explainMoveApi';
import { 
  ChevronLeft, 
  ChevronRight, 
  CornerUpLeft, 
  Play, 
  Sparkles, 
  Bot, 
  X, 
  Loader2,
  Volume2
} from 'lucide-react';

interface MoveInspectorProps {
  currentMove: AnalyzedMove | null;
  currentMoveIdx: number;
  totalMoves: number;
  isProgressivelyAnalyzing: boolean;
  currentFen?: string;
  activeBestMoveSan?: string;
  isVariationActive?: boolean;
  onPrevMove: () => void;
  onNextMove: () => void;
  onPlayBestMove?: () => void;
  onReturnToMainline?: () => void;
}

export const MoveInspector: React.FC<MoveInspectorProps> = ({
  currentMove,
  currentMoveIdx,
  totalMoves,
  isProgressivelyAnalyzing,
  currentFen,
  activeBestMoveSan,
  isVariationActive,
  onPrevMove,
  onNextMove,
  onPlayBestMove,
  onReturnToMainline,
}) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const activeReqIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up speech synthesis and cancel stale AI explanation requests on move change
  useEffect(() => {
    activeReqIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setExplanation(null);
    setIsAiGenerated(false);
    setShowExplanation(false);
    setIsLoadingExplanation(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentMoveIdx, currentMove?.san]);

  // Clean up speech and in-flight fetch on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!currentMove) return null;

  const handleExplainMove = async () => {
    if (isLoadingExplanation) return;

    if (showExplanation && explanation) {
      setShowExplanation(!showExplanation);
      return;
    }

    const currentReqId = ++activeReqIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setShowExplanation(true);
    setIsLoadingExplanation(true);

    try {
      const result = await fetchBeginnerMoveExplanation({
        moveSan: currentMove.san,
        color: currentMove.color,
        classification: currentMove.classification,
        evalBefore: currentMove.evalBefore,
        evalAfter: currentMove.eval,
        bestMoveSan: activeBestMoveSan || currentMove.bestMoveSan,
        openingName: currentMove.openingName,
        fen: currentFen,
        moveNumber: Math.floor(currentMoveIdx / 2) + 1,
        signal: controller.signal,
      });

      // Guard against stale response
      if (activeReqIdRef.current === currentReqId) {
        setExplanation(result.explanation);
        setIsAiGenerated(result.isAiGenerated);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return; // Normal cancellation
      }
      console.warn('[MoveInspector] Notice in handleExplainMove:', err?.message || err);
      if (activeReqIdRef.current === currentReqId) {
        const side = currentMove.color === 'w' ? 'White' : 'Black';
        setExplanation(`${side} played ${currentMove.san}. In this position, prioritize king safety, piece coordination, and control of central squares.`);
        setIsAiGenerated(false);
      }
    } finally {
      if (activeReqIdRef.current === currentReqId) {
        setIsLoadingExplanation(false);
      }
    }
  };

  const handleSpeakExplanation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !explanation) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = explanation.replace(/💡|⭐|✨/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="w-full max-w-[540px] bg-[#0c1424] border border-slate-800 p-3 sm:p-4 rounded-2xl space-y-3 shadow-sm animate-in fade-in duration-150">
      {/* Top Move Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400">
            Move {Math.floor(currentMoveIdx / 2) + 1}
            {currentMove.color === 'w' ? '.' : '...'}
          </span>
          <span className="text-sm font-bold font-mono text-slate-100 px-2 py-0.5 rounded-lg bg-slate-800">
            {currentMove.san}
          </span>

          {currentMove.isVariation && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sparkles className="w-3 h-3" />
              <span>User Move</span>
            </span>
          )}

          {currentMove.classification ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 shadow-sm">
              <MoveMark classification={currentMove.classification} size={20} showGlow />
              <span className="font-sans font-bold text-[11px] text-slate-200 capitalize">
                {currentMove.classification}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-amber-300 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{isProgressivelyAnalyzing ? 'Analyzing...' : 'Ready'}</span>
            </div>
          )}

          {currentMove.isBookMove && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
              <span>📚</span>
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {currentMove.openingName || 'Theory'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentMove.evalBefore !== undefined && (
            <div className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className={currentMove.evalBefore >= 0 ? 'text-slate-200' : 'text-slate-400'}>
                {currentMove.evalBefore >= 0 ? `+${currentMove.evalBefore.toFixed(2)}` : currentMove.evalBefore.toFixed(2)}
              </span>
              <span className="text-slate-500 mx-1">→</span>
              <span className={currentMove.eval >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {currentMove.eval >= 0 ? `+${currentMove.eval.toFixed(2)}` : currentMove.eval.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMove}
              disabled={currentMoveIdx <= 0}
              aria-label="Previous move"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer border border-slate-700/80"
              title="Previous move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextMove}
              disabled={currentMoveIdx >= totalMoves - 1}
              aria-label="Next move"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer border border-slate-700/80"
              title="Next move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Engine Technical Commentary */}
      <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
        <p>{currentMove.commentary || 'Stockfish positional calculation.'}</p>
        
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          {activeBestMoveSan ? (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-bold">Top Engine Choice:</span>
              <span className="font-mono font-bold text-slate-100 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded">
                {activeBestMoveSan}
              </span>
            </div>
          ) : currentMove.bestMoveSan ? (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-bold">Best engine line:</span>
              <span className="font-mono font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
                {currentMove.bestMoveSan}
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* ✨ Gemini AI Beginner Explain Button */}
            <button
              onClick={handleExplainMove}
              aria-label="Explain move with AI Coach"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-[11px] shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
              title="Get a human-readable explanation of why this move was good or bad for beginners using Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white/20" />
              <span>{showExplanation ? 'Hide Explanation' : 'Explain'}</span>
            </button>

            {onPlayBestMove && activeBestMoveSan && (
              <button
                onClick={onPlayBestMove}
                aria-label={`Play engine choice ${activeBestMoveSan}`}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shadow-sm"
                title="Play the engine's recommended best move on the board"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play {activeBestMoveSan}</span>
              </button>
            )}

            {isVariationActive && onReturnToMainline && (
              <button
                onClick={onReturnToMainline}
                aria-label="Return to mainline original game"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                title="Return to original game"
              >
                <CornerUpLeft className="w-3 h-3" />
                <span>Back to Mainline</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Beginner AI Explanation Box */}
      {showExplanation && (
        <div className="p-3.5 bg-slate-900 border border-sky-500/40 rounded-xl space-y-2.5 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <span>Beginner Coach Explanation</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isAiGenerated
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                }`}>
                  {isAiGenerated ? 'Gemini AI' : 'Positional Guide'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              {explanation && (
                <button
                  onClick={handleSpeakExplanation}
                  aria-label={isSpeaking ? 'Stop speaking explanation' : 'Read explanation aloud'}
                  className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
                    isSpeaking
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                  }`}
                  title={isSpeaking ? 'Stop speaking' : 'Read explanation aloud'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowExplanation(false)}
                aria-label="Close AI explanation"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isLoadingExplanation ? (
            <div className="py-4 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span className="font-medium animate-pulse">Coach is analyzing this move for beginners...</span>
            </div>
          ) : (
            <div className="text-xs text-slate-200 leading-relaxed font-sans space-y-2">
              <p className="whitespace-pre-line">{explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
