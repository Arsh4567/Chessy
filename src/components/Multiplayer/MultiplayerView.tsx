import React, { useState, useEffect } from 'react';
import { useMultiplayerGame } from '../../hooks/useMultiplayerGame';
import { MultiplayerLobby } from './MultiplayerLobby';
import { MultiplayerMatch } from './MultiplayerMatch';
import { TimeControl, PieceColor } from '../../types/chess';
import { TIME_CONTROLS } from '../../utils/mockData';
import { UserStats } from '../../utils/storage';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Clock, 
  ArrowLeftRight, 
  Play, 
  Globe
} from 'lucide-react';

interface MultiplayerViewProps {
  stats?: UserStats;
  onStartLocalGame?: (timeControl: TimeControl, playerColor: PieceColor, customFen?: string) => void;
  initialRoomCode?: string;
  onStatsUpdate?: (stats: UserStats) => void;
  onReviewGame?: (pgn: string) => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({
  stats,
  onStartLocalGame,
  initialRoomCode,
  onStatsUpdate,
  onReviewGame,
}) => {
  // Mode: 'online' (Live WebSockets) vs 'local' (Pass & Play on same screen)
  const [subMode, setSubMode] = useState<'online' | 'local'>('online');

  // Local Pass & Play state
  const [localTimeControl, setLocalTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0
  const [localSide, setLocalSide] = useState<PieceColor>('w');
  const [localFen, setLocalFen] = useState<string>('');

  const {
    connected,
    roomState,
    myRole,
    chess,
    drawOfferReceived,
    rematchOfferReceived,
    errorMessage,
    lastGameRatingSummary,
    whiteDisplayTimeMs,
    blackDisplayTimeMs,
    joinRoom,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    acceptRematch,
    sendChat,
    leaveRoom,
  } = useMultiplayerGame({ onStatsUpdated: onStatsUpdate });

  // Detect URL query parameter for ?room=... or #room=...
  useEffect(() => {
    if (initialRoomCode) {
      setSubMode('online');
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room') || window.location.hash.replace('#room=', '');
      if (roomParam) {
        setSubMode('online');
      }
    }
  }, [initialRoomCode]);

  const handleLaunchLocal = () => {
    if (onStartLocalGame) {
      onStartLocalGame(localTimeControl, localSide, localFen.trim() || undefined);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Mode Segmented Bar */}
      {!roomState && (
        <div className="max-w-4xl mx-auto px-4 pt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <button
              onClick={() => setSubMode('online')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                subMode === 'online'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Online Shareable Link</span>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-rose-400 ring-2 ring-rose-400/30'}`} />
            </button>

            <button
              onClick={() => setSubMode('local')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                subMode === 'local'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pass & Play</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            {connected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>Multiplayer Server Live</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Connecting to Server...</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Online Mode: Either In-Match or In-Lobby */}
      {subMode === 'online' ? (
        roomState ? (
          <MultiplayerMatch
            chess={chess}
            roomState={roomState}
            myRole={myRole}
            whiteTimeMs={whiteDisplayTimeMs}
            blackTimeMs={blackDisplayTimeMs}
            drawOfferReceived={drawOfferReceived}
            rematchOfferReceived={rematchOfferReceived}
            lastGameRatingSummary={lastGameRatingSummary}
            onMove={makeMove}
            onResign={resign}
            onOfferDraw={offerDraw}
            onAcceptDraw={acceptDraw}
            onDeclineDraw={declineDraw}
            onOfferRematch={offerRematch}
            onAcceptRematch={acceptRematch}
            onSendChat={sendChat}
            onLeaveRoom={leaveRoom}
            onReviewInStudio={onReviewGame}
          />
        ) : (
          <MultiplayerLobby
            onJoinRoom={joinRoom}
            onSwitchToLocalPassAndPlay={() => setSubMode('local')}
            initialRoomCode={initialRoomCode}
          />
        )
      ) : (
        /* Local Pass & Play Mode */
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400">
                <Users className="w-4 h-4" />
                <span>Same Device Play</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
                Pass & Play Multiplayer
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
                Play side-by-side with a friend on this device with optional auto board flipping, custom clocks, and move notation.
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-3xl shrink-0 text-sky-400">
              👥
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Select Time Control</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => setLocalTimeControl(tc)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      localTimeControl.id === tc.id
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

            <div className="space-y-3">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                <span>Starting Perspective</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLocalSide('w')}
                  className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                    localSide === 'w'
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
                  onClick={() => setLocalSide('b')}
                  className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                    localSide === 'b'
                      ? 'bg-slate-800 border-sky-500/60 ring-1 ring-sky-500/40 text-white font-bold'
                      : 'bg-slate-950/60 hover:bg-slate-850 text-slate-400 border-slate-800'
                  }`}
                >
                  <span className="text-2xl">♚</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Black Perspective</div>
                    <div className="text-[10px] text-slate-400">Board starts flipped</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleLaunchLocal}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Start Pass & Play Game</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
