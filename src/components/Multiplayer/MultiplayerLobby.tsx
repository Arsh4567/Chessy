import React, { useState } from 'react';
import { MultiplayerTimeControl } from '../../types/multiplayer';
import { loadUserStats } from '../../utils/storage';
import { INITIAL_RATING, getEloTier } from '../../utils/eloRating';
import { 
  Users, 
  Clock, 
  ArrowLeftRight, 
  Play, 
  Key,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface MultiplayerLobbyProps {
  onJoinRoom: (roomId: string, playerName: string, preferredColor?: 'w' | 'b' | 'random') => void;
  onSwitchToLocalPassAndPlay?: () => void;
  initialRoomCode?: string;
}

const PRESET_TIME_CONTROLS: MultiplayerTimeControl[] = [
  { initialSeconds: 60, incrementSeconds: 0, name: '1m • Bullet' },
  { initialSeconds: 180, incrementSeconds: 0, name: '3m • Blitz' },
  { initialSeconds: 180, incrementSeconds: 2, name: '3+2 • Blitz' },
  { initialSeconds: 300, incrementSeconds: 0, name: '5m • Blitz' },
  { initialSeconds: 300, incrementSeconds: 3, name: '5+3 • Rapid' },
  { initialSeconds: 600, incrementSeconds: 0, name: '10m • Rapid' },
  { initialSeconds: 0, incrementSeconds: 0, name: '∞ • Unlimited' },
];

function generateRandomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(12);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 12; i++) array[i] = Math.floor(Math.random() * 256);
  }
  let segment1 = '';
  let segment2 = '';
  let segment3 = '';
  for (let i = 0; i < 4; i++) segment1 += chars[array[i] % chars.length];
  for (let i = 4; i < 8; i++) segment2 += chars[array[i] % chars.length];
  for (let i = 8; i < 12; i++) segment3 += chars[array[i] % chars.length];
  return `GM-${segment1}-${segment2}-${segment3}`;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onJoinRoom,
  onSwitchToLocalPassAndPlay,
  initialRoomCode = '',
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('gm_player_name') || 'Grandmaster';
  });
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [selectedTimeControl, setSelectedTimeControl] = useState<MultiplayerTimeControl>(PRESET_TIME_CONTROLS[3]); // 5m
  const [selectedColor, setSelectedColor] = useState<'w' | 'b' | 'random'>('random');
  const [showEloInfo, setShowEloInfo] = useState(false);

  // Load current user stats for Elo display
  const stats = loadUserStats();
  const currentRating = stats.multiplayerRating ?? INITIAL_RATING;
  const gamesPlayed = stats.multiplayerGamesPlayed ?? 0;
  const isProvisional = gamesPlayed < 7;
  const tier = getEloTier(currentRating);

  const handleNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('gm_player_name', name);
  };

  const handleCreateRoom = () => {
    const code = generateRandomRoomCode();
    onJoinRoom(code, playerName, selectedColor);
  };

  const handleJoinWithCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    onJoinRoom(cleanCode, playerName, 'random');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300 pb-20 md:pb-10">
      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400">
            <Users className="w-4 h-4" />
            <span>Real-Time Online Multiplayer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
            Play with Friends Online
          </h1>
          <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
            Create a live match room, share the invite link with a friend, and play with server-synchronized clocks and advance Elo rating tracking.
          </p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-3xl shrink-0 text-sky-400">
          ⚔️
        </div>
      </div>

      {/* Advance Elo Rating & Placement Progression Card */}
      <div className="p-6 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shrink-0">
              {tier.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Multiplayer Rating</span>
                <span className="text-xs font-bold text-amber-400">
                  {tier.name}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5 flex items-baseline gap-2">
                <span>{currentRating}</span>
                <span className="text-xs font-normal text-slate-400">Elo</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({stats.multiplayerWins}W · {stats.multiplayerLosses}L · {stats.multiplayerDraws}D)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowEloInfo(!showEloInfo)}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showEloInfo ? 'Hide Rating Rules' : 'How Elo Works'}</span>
          </button>
        </div>

        {/* 7-Match Placement Progress Bar */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              {isProvisional ? `Placement Phase: Match ${gamesPlayed + 1} of 7` : `Established Rating (${gamesPlayed} matches)`}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {isProvisional ? 'Placement Volatility (±100 Elo)' : 'Established Rate (±7 to ±8 Elo)'}
            </span>
          </div>

          {/* 7-Pip Progress Bar */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const isDone = num <= gamesPlayed;
              const isCurrent = num === gamesPlayed + 1;
              return (
                <div
                  key={num}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-amber-400 ring-2 ring-amber-400/30'
                      : isDone
                      ? 'bg-emerald-400'
                      : 'bg-slate-800'
                  }`}
                  title={`Placement Match ${num} of 7`}
                />
              );
            })}
          </div>

          {showEloInfo && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Advance Elo Rating System</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
                <li><strong className="text-slate-200">Starting Rating:</strong> All players start at <strong>800 Elo</strong>.</li>
                <li><strong className="text-amber-300">First 7 Matches (Placement):</strong> Win awards <strong>around +100 Elo</strong>, Loss subtracts <strong>around -100 Elo</strong>.</li>
                <li><strong className="text-sky-300">Established Matches (8+):</strong> Win awards <strong>+7 to +8 Elo</strong>, Loss subtracts <strong>-7 to -8 Elo</strong>.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Player Handle Bar */}
      <div className="p-5 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-slate-200">Your Player Name</label>
          <p className="text-xs text-slate-400">Display name shown during match and in room chat</p>
        </div>

        <input
          type="text"
          value={playerName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Your name..."
          maxLength={24}
          className="w-full sm:w-64 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-400 transition-colors"
        />
      </div>

      {/* Main Grid: Create Match vs Join Match */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Create Match Card (7 cols) */}
        <div className="md:col-span-7 p-6 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Create Match Room</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">Instant Link</span>
          </div>

          {/* Time Control Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Time Control</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_TIME_CONTROLS.map((tc) => {
                const isSelected = selectedTimeControl.name === tc.name;
                return (
                  <button
                    key={tc.name}
                    onClick={() => setSelectedTimeControl(tc)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-sky-400 border-slate-700 font-bold shadow-sm ring-1 ring-sky-500/30'
                        : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 border-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{tc.name.split('•')[0].trim()}</div>
                    <div className="text-[11px] font-mono opacity-80 mt-0.5">{tc.name.split('•')[1]?.trim() || ''}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Preference */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Starting Color</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'random' as const, label: 'Random', icon: '⚖️' },
                { id: 'w' as const, label: 'White', icon: '♔' },
                { id: 'b' as const, label: 'Black', icon: '♚' },
              ].map((side) => {
                const isSelected = selectedColor === side.id;
                return (
                  <button
                    key={side.id}
                    onClick={() => setSelectedColor(side.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-slate-800 border-sky-400 text-white font-bold ring-1 ring-sky-500/30'
                        : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span className="text-lg">{side.icon}</span>
                    <span className="text-xs">{side.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch Room Button */}
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Create Match & Share Link</span>
          </button>
        </div>

        {/* Join Match Card (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Join with Room Code</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter an invite code from your opponent:
              </p>
            </div>

            <form onSubmit={handleJoinWithCode} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. GM-4921-8201-9281"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-wider text-center text-sky-400 placeholder-slate-600 focus:outline-none focus:border-sky-400 transition-colors uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={!roomCodeInput.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/80 shadow-sm"
              >
                Join Match Room
              </button>
            </form>
          </div>

          {/* Local Pass & Play Switcher */}
          {onSwitchToLocalPassAndPlay && (
            <div className="p-4 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-sm flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">Playing on Same Screen?</span>
                <span className="text-[11px] text-slate-400 block">Use Pass & Play with auto board flipping</span>
              </div>
              <button
                onClick={onSwitchToLocalPassAndPlay}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold transition-colors cursor-pointer shrink-0 border border-slate-700/80 shadow-sm"
              >
                Pass & Play
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
