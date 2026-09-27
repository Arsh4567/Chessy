import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../ChessBoard/ChessBoard';
import { sound } from '../../../utils/sound';
import confetti from 'canvas-confetti';
import { 
  RepertoireItem, 
  RepertoireLine, 
  SrsRating, 
  SrsMastery,
  STARTER_REPERTOIRES, 
  loadUserRepertoires, 
  saveUserRepertoires, 
  calculateNextSrsReview, 
  isLineDueForReview, 
  getRepertoireMasteryStats,
  INITIAL_SRS_DATA
} from '../../../utils/repertoireSrs';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle, 
  RotateCcw, 
  Play, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft,
  Calendar, 
  Flame, 
  Award, 
  Layers, 
  Edit3, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Clock,
  Shield,
  Zap,
  Maximize2
} from 'lucide-react';

interface RepertoireTrainerProps {
  onAnalyzeFen?: (fen: string) => void;
}

type ViewState = 'dashboard' | 'practice' | 'editor';

export const RepertoireTrainer: React.FC<RepertoireTrainerProps> = ({
  onAnalyzeFen,
}) => {
  const [repertoires, setRepertoires] = useState<RepertoireItem[]>(loadUserRepertoires);
  const [viewState, setViewState] = useState<ViewState>('dashboard');
  const [selectedRepertoireId, setSelectedRepertoireId] = useState<string>(
    STARTER_REPERTOIRES[0].id
  );
  const [colorFilter, setColorFilter] = useState<'all' | 'w' | 'b'>('all');

  // Active Practice Mode state
  const [practiceQueue, setPracticeQueue] = useState<{ repertoire: RepertoireItem; line: RepertoireLine }[]>([]);
  const [practiceIndex, setPracticeIndex] = useState<number>(0);
  const [moveStep, setMoveStep] = useState<number>(0);
  const [practiceStatus, setPracticeStatus] = useState<'playing' | 'completed' | 'failed'>('playing');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hintShown, setHintShown] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [completedSessionCount, setCompletedSessionCount] = useState<number>(0);

  // Line Editor state
  const [editingLine, setEditingLine] = useState<RepertoireLine | null>(null);
  const [editorMoves, setEditorMoves] = useState<string[]>([]);
  const [editorStep, setEditorStep] = useState<number>(0);
  const [showAddLineModal, setShowAddLineModal] = useState<boolean>(false);
  const [showNewRepertoireModal, setShowNewRepertoireModal] = useState<boolean>(false);

  // Active board chess instance
  const [chess, setChess] = useState<Chess>(new Chess());

  // Save changes to localStorage whenever repertoires change
  const updateRepertoires = useCallback((updated: RepertoireItem[]) => {
    setRepertoires(updated);
    saveUserRepertoires(updated);
  }, []);

  const selectedRepertoire = useMemo(() => {
    return repertoires.find((r) => r.id === selectedRepertoireId) || repertoires[0] || STARTER_REPERTOIRES[0];
  }, [repertoires, selectedRepertoireId]);

  // Aggregated stats
  const allDueLines = useMemo(() => {
    const dueList: { repertoire: RepertoireItem; line: RepertoireLine }[] = [];
    for (const rep of repertoires) {
      for (const line of rep.lines) {
        if (isLineDueForReview(line)) {
          dueList.push({ repertoire: rep, line });
        }
      }
    }
    return dueList;
  }, [repertoires]);

  const currentPracticeItem = practiceQueue[practiceIndex];

  // Initialize practice session with specific lines or all due lines
  const startPractice = (linesToPractice?: { repertoire: RepertoireItem; line: RepertoireLine }[]) => {
    const queue = linesToPractice && linesToPractice.length > 0 ? linesToPractice : allDueLines;
    if (queue.length === 0) {
      // If no lines due, practice all lines from selected repertoire
      const fallbackQueue = selectedRepertoire.lines.map((line) => ({
        repertoire: selectedRepertoire,
        line,
      }));
      setPracticeQueue(fallbackQueue);
    } else {
      setPracticeQueue(queue);
    }

    setPracticeIndex(0);
    setMoveStep(0);
    setPracticeStatus('playing');
    setFeedbackMsg(null);
    setHintShown(false);
    setLastMove(null);
    setViewState('practice');

    const firstItem = (queue[0] || selectedRepertoire.lines[0]);
    if (firstItem) {
      setupPracticeBoard(firstItem.line);
    }
  };

  const setupPracticeBoard = (line: RepertoireLine) => {
    const newBoard = new Chess();
    setChess(newBoard);
    setMoveStep(0);
    setPracticeStatus('playing');
    setFeedbackMsg(null);
    setHintShown(false);
    setLastMove(null);

    // If practicing as Black and White moves first, play White's 1st move automatically
    if (line.color === 'b' && line.moves.length > 0) {
      setTimeout(() => {
        try {
          const firstMove = line.moves[0];
          const res = newBoard.move(firstMove);
          if (res) {
            setChess(new Chess(newBoard.fen()));
            setLastMove({ from: res.from, to: res.to });
            setMoveStep(1);
            sound.playMove();
          }
        } catch {}
      }, 350);
    }
  };

  // Handle player making a move during SRS drill
  const handlePracticeMove = (moveObj: { from: string; to: string; promotion?: string }): boolean => {
    if (practiceStatus !== 'playing' || !currentPracticeItem) return false;

    const currentLine = currentPracticeItem.line;
    const testBoard = new Chess(chess.fen());
    let moveRes: any = null;

    try {
      moveRes = testBoard.move(moveObj);
    } catch {
      sound.playIllegal();
      return false;
    }

    if (!moveRes) {
      sound.playIllegal();
      return false;
    }

    const expectedSan = currentLine.moves[moveStep];

    if (moveRes.san === expectedSan) {
      // Correct repertoire move!
      if (moveRes.captured) sound.playCapture();
      else sound.playMove();

      setChess(testBoard);
      setLastMove({ from: moveRes.from, to: moveRes.to });
      setFeedbackMsg(null);

      const nextStep = moveStep + 1;
      setMoveStep(nextStep);

      // Check if line complete
      if (nextStep >= currentLine.moves.length) {
        setPracticeStatus('completed');
        sound.playCheckmate();
        setCompletedSessionCount((prev) => prev + 1);

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      } else {
        // Automatic opponent counter-move
        setTimeout(() => {
          try {
            const oppSan = currentLine.moves[nextStep];
            if (oppSan) {
              const oppMoveRes = testBoard.move(oppSan);
              if (oppMoveRes) {
                if (oppMoveRes.captured) sound.playCapture();
                else sound.playMove();

                setChess(new Chess(testBoard.fen()));
                setLastMove({ from: oppMoveRes.from, to: oppMoveRes.to });
                setMoveStep(nextStep + 1);
              }
            }
          } catch (e) {
            console.warn('Opponent counter-move error:', e);
          }
        }, 220);
      }
      return true;
    } else {
      // Deviation / Incorrect move
      sound.playIllegal();
      setPracticeStatus('failed');
      setFeedbackMsg({
        type: 'error',
        text: `Deviation! Your prepared repertoire move was "${expectedSan}". (You played ${moveRes.san})`,
      });
      return false;
    }
  };

  // Submit SRS rating for the completed line
  const handleRateLine = (rating: SrsRating) => {
    if (!currentPracticeItem) return;

    const { repertoire, line } = currentPracticeItem;
    const updatedSrs = calculateNextSrsReview(line.srsData || INITIAL_SRS_DATA, rating);

    const updatedRepertoires = repertoires.map((rep) => {
      if (rep.id !== repertoire.id) return rep;
      return {
        ...rep,
        lines: rep.lines.map((l) => (l.id === line.id ? { ...l, srsData: updatedSrs } : l)),
      };
    });

    updateRepertoires(updatedRepertoires);

    // Advance to next line in practice queue
    const nextIdx = practiceIndex + 1;
    if (nextIdx < practiceQueue.length) {
      setPracticeIndex(nextIdx);
      const nextLine = practiceQueue[nextIdx].line;
      setupPracticeBoard(nextLine);
    } else {
      // Session finished!
      setViewState('dashboard');
      sound.playMatchStart();
    }
  };

  const handleRetryPracticeLine = () => {
    if (currentPracticeItem) {
      setupPracticeBoard(currentPracticeItem.line);
    }
  };

  // Filtered repertoires list
  const displayedRepertoires = useMemo(() => {
    if (colorFilter === 'all') return repertoires;
    return repertoires.filter((r) => r.color === colorFilter);
  }, [repertoires, colorFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Repertoire Stats Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl shadow-inner shrink-0">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-display text-white">
                Opening Repertoire & Spaced Repetition (SRS)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-400 font-bold hidden sm:inline-block">
                SM-2 Algorithm
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Build custom opening trees, commit theory to long-term memory, and drill variations like flashcards.
            </p>
          </div>
        </div>

        {/* Global Due & Mastery HUD */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-center px-2">
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">Due for Review</span>
            <span className="text-lg font-mono font-black text-amber-400">
              🔥 {allDueLines.length} {allDueLines.length === 1 ? 'Line' : 'Lines'}
            </span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4 pr-2">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Reviewed Today</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              ✨ {completedSessionCount}
            </span>
          </div>
          <button
            onClick={() => startPractice()}
            disabled={allDueLines.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Drill Due ({allDueLines.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: REPERTOIRE DASHBOARD */}
      {/* ========================================================================= */}
      {viewState === 'dashboard' && (
        <div className="space-y-6">
          {/* Color Filter Tabs & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-1">
              {[
                { id: 'all' as const, label: 'All Repertoires' },
                { id: 'w' as const, label: '⚪ White Lines' },
                { id: 'b' as const, label: '⚫ Black Lines' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setColorFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    colorFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewRepertoireModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Repertoire</span>
              </button>
            </div>
          </div>

          {/* Repertoires Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {displayedRepertoires.map((rep) => {
              const stats = getRepertoireMasteryStats(rep);
              const isSelected = selectedRepertoireId === rep.id;

              return (
                <div
                  key={rep.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    isSelected
                      ? 'bg-slate-900/90 border-amber-500/50 shadow-lg ring-1 ring-amber-500/20'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {rep.color === 'w' ? '⚪' : '⚫'}
                        </span>
                        <h3 className="font-bold text-base text-white">
                          {rep.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                          {rep.eco}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {rep.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black font-mono text-emerald-400">
                        {stats.masteryPct}%
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Mastery
                      </span>
                    </div>
                  </div>

                  {/* Mastery Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(stats.mastered / stats.total) * 100}%` }}
                        className="h-full bg-emerald-500"
                        title={`Mastered: ${stats.mastered}`}
                      />
                      <div
                        style={{ width: `${(stats.review / stats.total) * 100}%` }}
                        className="h-full bg-sky-500"
                        title={`In Review: ${stats.review}`}
                      />
                      <div
                        style={{ width: `${(stats.learning / stats.total) * 100}%` }}
                        className="h-full bg-amber-500"
                        title={`Learning: ${stats.learning}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{rep.lines.length} Variations</span>
                      <span className="text-amber-400 font-bold">
                        {stats.due > 0 ? `🔥 ${stats.due} Due for Drill` : '✅ All Caught Up'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <button
                      onClick={() => {
                        setSelectedRepertoireId(rep.id);
                        const dueLines = rep.lines
                          .filter(isLineDueForReview)
                          .map((line) => ({ repertoire: rep, line }));
                        startPractice(dueLines);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{stats.due > 0 ? `Practice Due (${stats.due})` : 'Practice All'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRepertoireId(rep.id);
                        setEditingLine(rep.lines[0] || null);
                        if (rep.lines[0]) {
                          const b = new Chess();
                          for (const m of rep.lines[0].moves) {
                            try { b.move(m); } catch {}
                          }
                          setChess(b);
                        }
                        setViewState('editor');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>View Lines</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INTERACTIVE SPACED REPETITION DRILL (SRS FLASHCARD) */}
      {/* ========================================================================= */}
      {viewState === 'practice' && currentPracticeItem && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Practice Session Navigation Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewState('dashboard')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  {currentPracticeItem.repertoire.name}
                </span>
                <h2 className="text-sm font-bold text-white">
                  {currentPracticeItem.line.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                Card {practiceIndex + 1} of {practiceQueue.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Interactive Chess Board Column */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-[500px]">
                <ChessBoard
                  chess={chess}
                  onMove={handlePracticeMove}
                  isFlipped={currentPracticeItem.line.color === 'b'}
                  disabled={practiceStatus !== 'playing'}
                  lastMove={lastMove}
                />
              </div>
            </div>

            {/* Drill Sidebar & SRS Feedback Console */}
            <div className="lg:col-span-5 space-y-4">
              {/* Practice Status Card */}
              <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Your Turn ({currentPracticeItem.line.color === 'w' ? 'White' : 'Black'})
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                    practiceStatus === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : practiceStatus === 'failed'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {practiceStatus === 'completed' ? 'Line Mastered!' : practiceStatus === 'failed' ? 'Mistake' : 'Play Prepared Move'}
                  </span>
                </div>

                {/* Key Strategic Idea */}
                {currentPracticeItem.line.keyIdea && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300">
                    <span className="text-amber-400 font-bold block mb-1">💡 Key Strategic Idea:</span>
                    {currentPracticeItem.line.keyIdea}
                  </div>
                )}

                {/* Feedback Message */}
                {feedbackMsg && (
                  <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in ${
                    feedbackMsg.type === 'error'
                      ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                      : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{feedbackMsg.text}</span>
                  </div>
                )}

                {/* Move Sequence Tracker */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Prepared Sequence:</span>
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                    {currentPracticeItem.line.moves.map((m, idx) => {
                      const isCurrent = idx === moveStep;
                      const isPlayed = idx < moveStep;
                      return (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 font-black scale-105 shadow-sm'
                              : isPlayed
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                              : 'bg-slate-800/60 text-slate-500'
                          }`}
                        >
                          {Math.floor(idx / 2) + 1}{idx % 2 === 0 ? '.' : '...'} {m}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* SRS Rating Buttons when line is completed */}
                {practiceStatus === 'completed' && (
                  <div className="space-y-3 pt-3 border-t border-slate-800 animate-in fade-in">
                    <span className="text-xs font-bold text-white block text-center">
                      How well did you know this variation?
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { rating: 'again' as SrsRating, label: 'Again', desc: '< 1 day', color: 'hover:bg-rose-500 hover:text-white bg-rose-500/10 text-rose-300 border-rose-500/30' },
                        { rating: 'hard' as SrsRating, label: 'Hard', desc: '1-2 days', color: 'hover:bg-orange-500 hover:text-white bg-orange-500/10 text-orange-300 border-orange-500/30' },
                        { rating: 'good' as SrsRating, label: 'Good', desc: '3-5 days', color: 'hover:bg-emerald-500 hover:text-white bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
                        { rating: 'easy' as SrsRating, label: 'Easy', desc: '7+ days', color: 'hover:bg-sky-500 hover:text-white bg-sky-500/10 text-sky-300 border-sky-500/30' },
                      ].map((btn) => (
                        <button
                          key={btn.rating}
                          onClick={() => handleRateLine(btn.rating)}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${btn.color}`}
                        >
                          <span className="block text-xs font-black">{btn.label}</span>
                          <span className="block text-[10px] opacity-75 font-mono">{btn.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions when playing or failed */}
                {practiceStatus !== 'completed' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={handleRetryPracticeLine}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Board</span>
                    </button>
                    <button
                      onClick={() => setHintShown(true)}
                      className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-colors cursor-pointer border border-amber-500/30 flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{hintShown ? currentPracticeItem.line.moves[moveStep] : 'Hint'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: LINE EXPLORER & REPERTOIRE EDITOR */}
      {/* ========================================================================= */}
      {viewState === 'editor' && selectedRepertoire && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewState('dashboard')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-bold text-white">
                  {selectedRepertoire.name} Lines & Variations
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedRepertoire.lines.length} variations registered in this repertoire
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const items = selectedRepertoire.lines.map((l) => ({
                    repertoire: selectedRepertoire,
                    line: l,
                  }));
                  startPractice(items);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Drill This Repertoire</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedRepertoire.lines.map((line) => {
              const isDue = isLineDueForReview(line);
              return (
                <div
                  key={line.id}
                  className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-white">{line.name}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                      isDue ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isDue ? 'Due' : `${line.srsData?.interval || 0}d`}
                    </span>
                  </div>

                  {line.keyIdea && (
                    <p className="text-xs text-slate-400 line-clamp-2">{line.keyIdea}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="text-[11px] font-mono text-slate-400">{line.moves.length} moves</span>
                    <button
                      onClick={() => {
                        startPractice([{ repertoire: selectedRepertoire, line }]);
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Practice Line
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: New Custom Repertoire */}
      {showNewRepertoireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-white">Create Custom Repertoire</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Repertoire Name</label>
                <input
                  id="new-rep-name"
                  type="text"
                  placeholder="e.g. My Sicilian Najdorf as Black"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Play As</label>
                <select
                  id="new-rep-color"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                >
                  <option value="w">White ⚪</option>
                  <option value="b">Black ⚫</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">ECO Code</label>
                <input
                  id="new-rep-eco"
                  type="text"
                  placeholder="e.g. B90"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewRepertoireModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const nameEl = document.getElementById('new-rep-name') as HTMLInputElement;
                  const colorEl = document.getElementById('new-rep-color') as HTMLSelectElement;
                  const ecoEl = document.getElementById('new-rep-eco') as HTMLInputElement;
                  if (nameEl && nameEl.value.trim()) {
                    const newRep: RepertoireItem = {
                      id: `custom-rep-${Date.now()}`,
                      name: nameEl.value.trim(),
                      color: (colorEl?.value as 'w' | 'b') || 'w',
                      eco: ecoEl?.value.trim() || 'A00',
                      description: 'Custom user repertoire.',
                      isCustom: true,
                      lines: [],
                    };
                    updateRepertoires([newRep, ...repertoires]);
                    setSelectedRepertoireId(newRep.id);
                    setShowNewRepertoireModal(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
              >
                Create Repertoire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
