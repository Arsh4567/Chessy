import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessPuzzle } from '../../types/chess';
import { CHESS_PUZZLES } from '../../utils/puzzles';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Lightbulb, RotateCcw, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface PuzzleTrainerProps {
  puzzleRating: number;
  onUpdatePuzzleRating: (newRating: number) => void;
}

export const PuzzleTrainer: React.FC<PuzzleTrainerProps> = ({
  puzzleRating,
  onUpdatePuzzleRating,
}) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const currentPuzzle = CHESS_PUZZLES[puzzleIndex % CHESS_PUZZLES.length];

  const [chess, setChess] = useState<Chess>(new Chess(currentPuzzle.fen));
  const [moveStep, setMoveStep] = useState(0); // tracks move index in puzzle.moves
  const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [hintShown, setHintShown] = useState(false);
  const [streak, setStreak] = useState(3);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    resetPuzzle(currentPuzzle);
  }, [puzzleIndex]);

  const resetPuzzle = (puz: ChessPuzzle) => {
    const newChess = new Chess(puz.fen);
    setChess(newChess);
    setMoveStep(0);
    setStatus('playing');
    setHintShown(false);
    setLastMove(null);
  };

  const handlePlayerMove = (moveObj: { from: string; to: string; promotion?: string }): boolean => {
    if (status !== 'playing') return false;

    const testChess = new Chess(chess.fen());
    const moveResult = testChess.move(moveObj);
    if (!moveResult) {
      sound.playIllegal();
      return false;
    }

    const expectedSan = currentPuzzle.moves[moveStep];

    if (moveResult.san === expectedSan) {
      // Correct move
      sound.playMove();
      setChess(testChess);
      setLastMove({ from: moveObj.from, to: moveObj.to });

      const nextStep = moveStep + 1;
      setMoveStep(nextStep);

      // Check if puzzle completed
      if (nextStep >= currentPuzzle.moves.length) {
        setStatus('solved');
        sound.playCheckmate();
        onUpdatePuzzleRating(puzzleRating + 15);
        setStreak(s => s + 1);
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}
      } else {
        // Automatic opponent counter-move
        setTimeout(() => {
          const opponentSan = currentPuzzle.moves[nextStep];
          const oppMoveResult = testChess.move(opponentSan);
          if (oppMoveResult) {
            sound.playMove();
            setChess(new Chess(testChess.fen()));
            setLastMove({ from: oppMoveResult.from, to: oppMoveResult.to });
            setMoveStep(nextStep + 1);
          }
        }, 500);
      }

      return true;
    } else {
      // Incorrect move
      sound.playIllegal();
      setStatus('failed');
      onUpdatePuzzleRating(Math.max(400, puzzleRating - 10));
      setStreak(0);
      return false;
    }
  };

  const handleNextPuzzle = () => {
    setPuzzleIndex(i => i + 1);
  };

  const handleRetry = () => {
    resetPuzzle(currentPuzzle);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
            ⚡
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Tactical Puzzle Trainer
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Solve master tactics, skewers, forks, and sacrifices to boost your tactical rating
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Puzzle Rating</span>
            <span className="text-lg font-mono font-bold text-amber-400">{puzzleRating}</span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Streak</span>
            <span className="text-lg font-mono font-bold text-emerald-400">🔥 {streak}</span>
          </div>
        </div>
      </div>

      {/* Main Puzzle Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Board */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-[500px]">
            <ChessBoard
              chess={chess}
              isFlipped={currentPuzzle.playerColor === 'b'}
              onMove={handlePlayerMove}
              disabled={status !== 'playing'}
              lastMove={lastMove}
            />
          </div>
        </div>

        {/* Right: Puzzle Info, Hints & Actions */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                Difficulty: {currentPuzzle.rating} Elo
              </span>
              <h2 className="text-base font-bold text-slate-100 mt-2">
                {currentPuzzle.theme}
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
              {currentPuzzle.playerColor === 'w' ? 'White to Move' : 'Black to Move'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentPuzzle.description}
          </p>

          {/* Status Alert Banner */}
          {status === 'solved' && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Puzzle Solved! (+15 Rating)</span>
              </div>
              <p className="text-xs text-emerald-200">
                Outstanding tactical vision. You found the optimal sequence.
              </p>
            </div>
          )}

          {status === 'failed' && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-xl space-y-2 animate-in zoom-in-95">
              <div className="text-rose-400 font-bold text-sm">
                Incorrect Move (-10 Rating)
              </div>
              <p className="text-xs text-rose-200">
                That move misses the decisive tactic. Try again or check the hint!
              </p>
            </div>
          )}

          {/* Hint Reveal */}
          {hintShown && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
              <span className="font-bold block">💡 Tactical Clue:</span>
              <span>Next move starts with: <strong>{currentPuzzle.moves[moveStep]?.slice(0, 2)}</strong></span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {status === 'playing' ? (
              <button
                onClick={() => setHintShown(true)}
                disabled={hintShown}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4" />
                <span>{hintShown ? 'Hint Revealed' : 'Get Tactical Hint'}</span>
              </button>
            ) : status === 'solved' ? (
              <button
                onClick={handleNextPuzzle}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Next Puzzle</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRetry}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={handleNextPuzzle}
                  className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Skip Puzzle</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
