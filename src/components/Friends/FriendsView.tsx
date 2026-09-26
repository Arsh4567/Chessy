import React, { useState } from 'react';
import { TIME_CONTROLS } from '../../utils/mockData';
import { TimeControl, PieceColor } from '../../types/chess';
import { 
  Users, 
  Swords, 
  Play, 
  RotateCcw, 
  Clock, 
  ArrowLeftRight,
  Shield,
  Sparkles
} from 'lucide-react';

interface FriendsViewProps {
  onStartLocalGame: (timeControl: TimeControl, playerColor: PieceColor, customFen?: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  onStartLocalGame,
}) => {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0
  const [selectedSide, setSelectedSide] = useState<PieceColor>('w');
  const [customFen, setCustomFen] = useState<string>('');

  const handleLaunch = () => {
    onStartLocalGame(selectedTimeControl, selectedSide, customFen.trim() || undefined);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400">
            <Users className="w-4 h-4" />
            <span>Local Pass & Play Multiplayer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
            Play with Friends
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
            Challenge a friend on the same screen with automatic board flipping, custom clock controls, and live Stockfish move evaluation.
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-3xl shrink-0 text-sky-400">
          👥
        </div>
      </div>

      {/* Setup Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        {/* Time Control Selection */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Select Time Control</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.id}
                onClick={() => setSelectedTimeControl(tc)}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedTimeControl.id === tc.id
                    ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                    : 'bg-slate-950/60 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <div className="text-xs font-bold">{tc.name}</div>
                <div className="text-[10px] font-mono opacity-80 mt-0.5 capitalize">{tc.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Side Selection */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-sky-400" />
            <span>Starting Perspective</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedSide('w')}
              className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                selectedSide === 'w'
                  ? 'bg-slate-800 border-sky-500/60 ring-1 ring-sky-500/40 text-white font-bold'
                  : 'bg-slate-950/60 hover:bg-slate-850 text-slate-400 border-slate-800'
              }`}
            >
              <span className="text-2xl">♔</span>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-100">White Moves First</div>
                <div className="text-[10px] text-slate-400">Standard orientation</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedSide('b')}
              className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                selectedSide === 'b'
                  ? 'bg-slate-800 border-sky-500/60 ring-1 ring-sky-500/40 text-white font-bold'
                  : 'bg-slate-950/60 hover:bg-slate-850 text-slate-400 border-slate-800'
              }`}
            >
              <span className="text-2xl">♚</span>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-100">Black Perspective</div>
                <div className="text-[10px] text-slate-400">Flipped orientation</div>
              </div>
            </button>
          </div>
        </div>

        {/* Custom FEN Optional */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Custom Starting Position (Optional FEN)
          </label>
          <input
            type="text"
            value={customFen}
            onChange={(e) => setCustomFen(e.target.value)}
            placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-400"
          />
        </div>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Swords className="w-4 h-4" />
          <span>Launch Local Battle</span>
        </button>
      </div>
    </div>
  );
};
