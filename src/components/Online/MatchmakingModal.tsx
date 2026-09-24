import React, { useState, useEffect } from 'react';
import { TimeControl } from '../../types/chess';
import { TIME_CONTROLS } from '../../utils/mockData';
import { Globe, Swords, Copy, Check, Users, Loader2, Sparkles } from 'lucide-react';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchFound: (opponent: { name: string; elo: number; avatar: string; title?: string }, timeControl: TimeControl, isWhite: boolean) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  onMatchFound,
}) => {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(0);
  const [tab, setTab] = useState<'quick' | 'custom'>('quick');
  const [roomCode, setRoomCode] = useState('GM-' + Math.floor(1000 + Math.random() * 9000));
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  useEffect(() => {
    let interval: any;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTimer(t => t + 1);
      }, 1000);

      // Simulate match finding after 2.5 seconds
      const timeout = setTimeout(() => {
        setIsSearching(false);
        const opponents = [
          { name: 'KasparovApprentice', elo: 1680, avatar: '♚', title: 'FM' },
          { name: 'FrenchDefenseGod', elo: 1620, avatar: '♞' },
          { name: 'SpeedDemonGM', elo: 1710, avatar: '♛', title: 'IM' },
          { name: 'BobbyFischerFan', elo: 1650, avatar: '♝' },
        ];
        const opp = opponents[Math.floor(Math.random() * opponents.length)];
        const isWhite = Math.random() > 0.5;
        onMatchFound(opp, selectedTimeControl, isWhite);
      }, 2500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setSearchTimer(0);
    }
  }, [isSearching]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoinCustomRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onMatchFound(
      { name: `Challenger_${joinCodeInput.slice(-4)}`, elo: 1600, avatar: '♜' },
      selectedTimeControl,
      true
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-100">
                Play Live Online Chess
              </h2>
              <p className="text-xs text-slate-400">
                Match with live players worldwide or create a private room
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => { setTab('quick'); setIsSearching(false); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'quick' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Quick Matchmaking
          </button>
          <button
            onClick={() => { setTab('custom'); setIsSearching(false); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'custom' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔑 Private Room Code
          </button>
        </div>

        {/* Time Controls Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Select Time Control
          </span>
          <div className="grid grid-cols-4 gap-2">
            {TIME_CONTROLS.slice(0, 6).map((tc) => (
              <button
                key={tc.id}
                onClick={() => setSelectedTimeControl(tc)}
                disabled={isSearching}
                className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  selectedTimeControl.id === tc.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-xs">{tc.name}</div>
                <div className="text-[10px] opacity-80 uppercase">{tc.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Matchmaking Tab Content */}
        {tab === 'quick' && (
          <div className="space-y-4 pt-2">
            {isSearching ? (
              <div className="p-6 bg-slate-950 rounded-xl border border-amber-500/40 text-center space-y-3 animate-pulse">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-100">
                  Searching for a {selectedTimeControl.name} Opponent...
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Time in queue: {searchTimer}s · Rating range: ±100 Elo
                </p>
                <button
                  onClick={() => setIsSearching(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel Queue
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearching(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>Find Online Match</span>
              </button>
            )}
          </div>
        )}

        {/* Private Room Tab Content */}
        {tab === 'custom' && (
          <div className="space-y-4 pt-2">
            {/* Shareable Room Code */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block">Your Private Room Code</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomCode}
                  className="flex-1 bg-slate-900 text-slate-100 text-sm font-mono font-bold px-3 py-2 rounded-lg border border-slate-700 outline-none"
                />
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Share this code with your friend so they can join your game.
              </p>
            </div>

            {/* Join by Code */}
            <form onSubmit={handleJoinCustomRoom} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block">Join Friend's Room</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="Paste room code (e.g. GM-4892)"
                  className="flex-1 bg-slate-900 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Join Game
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
