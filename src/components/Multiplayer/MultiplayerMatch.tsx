import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import {
  MultiplayerRoomState,
  MultiplayerRole,
} from '../../types/multiplayer';
import { MultiplayerGameRatingSummary } from '../../hooks/useMultiplayerGame';
import { getEloTier } from '../../utils/eloRating';
import { 
  Users, 
  Clock, 
  Flag, 
  Handshake, 
  RotateCcw, 
  Share2, 
  Copy, 
  Check, 
  MessageSquare, 
  Send, 
  ArrowLeft,
  Crown,
  Eye,
  Wifi,
  WifiOff,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Shield,
  Zap,
  Award
} from 'lucide-react';

interface MultiplayerMatchProps {
  chess: Chess;
  roomState: MultiplayerRoomState;
  myRole: MultiplayerRole;
  whiteTimeMs: number;
  blackTimeMs: number;
  drawOfferReceived: boolean;
  rematchOfferReceived: boolean;
  lastGameRatingSummary?: MultiplayerGameRatingSummary | null;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onOfferRematch: () => void;
  onAcceptRematch: () => void;
  onSendChat: (text: string) => void;
  onLeaveRoom: () => void;
  onReviewInStudio?: (pgn: string) => void;
}

function formatClockTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds < 20) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${tenths}`;
  }

  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const QUICK_EMOJIS = ['👍', '🔥', '😮', '🤝', '🧠', '👑', '🎉', '☕'];
const QUICK_PHRASES = ['Good luck!', 'Nice move!', 'Thanks for the game!', 'Well played!'];

export const MultiplayerMatch: React.FC<MultiplayerMatchProps> = ({
  chess,
  roomState,
  myRole,
  whiteTimeMs,
  blackTimeMs,
  drawOfferReceived,
  rematchOfferReceived,
  lastGameRatingSummary,
  onMove,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onOfferRematch,
  onAcceptRematch,
  onSendChat,
  onLeaveRoom,
  onReviewInStudio,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const [rematchOfferSent, setRematchOfferSent] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [roomState.chat]);

  const isFlipped = myRole === 'black';
  const turn = chess.turn();
  const isMyTurn = (turn === 'w' && myRole === 'white') || (turn === 'b' && myRole === 'black');

  // Identify players
  const topPlayer = isFlipped ? roomState.white : roomState.black;
  const bottomPlayer = isFlipped ? roomState.black : roomState.white;
  const topTimeMs = isFlipped ? whiteTimeMs : blackTimeMs;
  const bottomTimeMs = isFlipped ? blackTimeMs : whiteTimeMs;
  const isTopPlayerTurn = isFlipped ? turn === 'w' : turn === 'b';
  const isBottomPlayerTurn = isFlipped ? turn === 'b' : turn === 'w';

  const shareableUrl = `${window.location.origin}/?room=${roomState.roomId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const handleSendEmoji = (emoji: string) => {
    onSendChat(emoji);
  };

  // Determine game outcome for current player
  const myResult: 'win' | 'loss' | 'draw' | 'spectating' = 
    !roomState.gameOver 
      ? 'spectating' 
      : myRole === 'spectator'
      ? 'spectating'
      : roomState.gameOver.winner === 'draw'
      ? 'draw'
      : (roomState.gameOver.winner === 'w' && myRole === 'white') || (roomState.gameOver.winner === 'b' && myRole === 'black')
      ? 'win'
      : 'loss';

  const myRatingDelta = myRole === 'white' 
    ? roomState.gameOver?.whiteRatingDelta 
    : myRole === 'black'
    ? roomState.gameOver?.blackRatingDelta
    : undefined;

  const myNewRating = myRole === 'white'
    ? roomState.gameOver?.whiteRating
    : myRole === 'black'
    ? roomState.gameOver?.blackRating
    : undefined;

  const oppRatingDelta = myRole === 'white'
    ? roomState.gameOver?.blackRatingDelta
    : myRole === 'black'
    ? roomState.gameOver?.whiteRatingDelta
    : undefined;

  const oppNewRating = myRole === 'white'
    ? roomState.gameOver?.blackRating
    : myRole === 'black'
    ? roomState.gameOver?.whiteRating
    : undefined;

  // Active or fallback rating summary
  const effectiveDelta = lastGameRatingSummary?.ratingDelta ?? myRatingDelta ?? 0;
  const effectiveNewRating = lastGameRatingSummary?.newRating ?? myNewRating ?? (bottomPlayer?.rating || 800);
  const effectiveOldRating = lastGameRatingSummary?.oldRating ?? (effectiveNewRating - effectiveDelta);
  const effectiveMatches = lastGameRatingSummary?.matchesPlayed ?? (bottomPlayer?.gamesPlayed ?? 0) + 1;
  const effectiveIsProvisional = lastGameRatingSummary?.isProvisional ?? (effectiveMatches <= 7);
  const tierInfo = getEloTier(effectiveNewRating);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
      {/* Top Match Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Leave Room & Return to Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                ROOM: {roomState.roomId}
              </span>

              {roomState.spectatorsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center gap-1">
                  <Eye className="w-3 h-3 text-sky-400" />
                  <span>{roomState.spectatorsCount} watching</span>
                </span>
              )}

              {myRole === 'spectator' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                  Spectator Mode
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 mt-0.5">
              {roomState.timeControl.name || 'Standard Match'}
            </div>
          </div>
        </div>

        {/* Share Link Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
              copiedLink
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chessboard, Right Chat & Match Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board & Player Clocks (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-3">
          {/* Top Player (Opponent) Card */}
          <div className={`w-full max-w-[460px] p-3 rounded-2xl border transition-all flex items-center justify-between ${
            isTopPlayerTurn && roomState.isGameActive
              ? 'bg-slate-850 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                {isFlipped ? '♔' : '♚'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>{topPlayer?.name || 'Waiting for opponent...'}</span>
                  {topPlayer?.connected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Online" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" title="Offline / Reconnecting" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span>{isFlipped ? 'White' : 'Black'}</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">{topPlayer?.rating ?? 800} Elo</span>
                  {topPlayer && topPlayer.gamesPlayed < 7 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Placement ({topPlayer.gamesPlayed}/7)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Clock */}
            {roomState.timeControl.initialSeconds > 0 && (
              <div className={`px-3 py-1.5 rounded-xl font-mono text-base font-black transition-colors ${
                topTimeMs < 30000
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : isTopPlayerTurn
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}>
                {formatClockTime(topTimeMs)}
              </div>
            )}
          </div>

          {/* Chess Board */}
          <div className="w-full max-w-[460px] aspect-square rounded-3xl overflow-hidden p-2 bg-slate-900/90 border border-slate-800 shadow-2xl flex items-center justify-center">
            <ChessBoard
              chess={chess}
              isFlipped={isFlipped}
              disabled={!isMyTurn || !roomState.isGameActive || Boolean(roomState.gameOver)}
              onMove={(m) => onMove(m)}
              boardTheme="emerald"
              showCoordinates
              showLegalMoves
            />
          </div>

          {/* Bottom Player (You) Card */}
          <div className={`w-full max-w-[460px] p-3 rounded-2xl border transition-all flex items-center justify-between ${
            isBottomPlayerTurn && roomState.isGameActive
              ? 'bg-slate-850 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                {isFlipped ? '♚' : '♔'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>{bottomPlayer?.name || 'You'}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    You
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span>{isFlipped ? 'Black' : 'White'}</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">{bottomPlayer?.rating ?? 800} Elo</span>
                  {bottomPlayer && bottomPlayer.gamesPlayed < 7 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Placement ({bottomPlayer.gamesPlayed}/7)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Clock */}
            {roomState.timeControl.initialSeconds > 0 && (
              <div className={`px-3 py-1.5 rounded-xl font-mono text-base font-black transition-colors ${
                bottomTimeMs < 30000
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : isBottomPlayerTurn
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}>
                {formatClockTime(bottomTimeMs)}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat, In-Game Controls & Status (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Waiting for Opponent Banner */}
          {(!roomState.white || !roomState.black) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-200">
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">Waiting for Opponent to Join</span>
                <span className="text-[11px] text-amber-300/80 block">Share your room link or code: <strong>{roomState.roomId}</strong></span>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Copy Link
              </button>
            </div>
          )}

          {/* Draw Offer Banner */}
          {drawOfferReceived && !roomState.gameOver && (
            <div className="p-4 rounded-2xl bg-sky-950/80 border border-sky-500/40 space-y-2.5 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
                <Handshake className="w-4 h-4 text-sky-400" />
                <span>Opponent has offered a draw</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onAcceptDraw}
                  className="flex-1 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Accept Draw
                </button>
                <button
                  onClick={onDeclineDraw}
                  className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Rematch Offer Received Banner */}
          {rematchOfferReceived && (
            <div className="p-4 rounded-2xl bg-sky-950/80 border border-sky-500/40 space-y-2.5 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <span>Opponent wants a rematch!</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Accepting will start a new game with alternating colors.
              </p>
              <button
                onClick={onAcceptRematch}
                className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
              >
                Accept Rematch
              </button>
            </div>
          )}

          {/* Advanced Elo Rating Settlement & Game Over Card */}
          {roomState.gameOver && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/40 shadow-2xl space-y-4 animate-in zoom-in-95">
              {/* Header result banner */}
              <div className="text-center space-y-1.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-lg ${
                  myResult === 'win'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                    : myResult === 'loss'
                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-rose-500/10'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
                }`}>
                  {myResult === 'win' ? '🏆' : myResult === 'loss' ? '💔' : '🤝'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {myResult === 'win'
                      ? 'Victory!'
                      : myResult === 'loss'
                      ? 'Defeat'
                      : myResult === 'draw'
                      ? 'Game Drawn'
                      : roomState.gameOver.winner === 'w'
                      ? 'White Wins!'
                      : 'Black Wins!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {roomState.gameOver.reason}
                  </p>
                </div>
              </div>

              {/* Player Elo Rating Calculation Breakdown */}
              {myRole !== 'spectator' && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rating Adjustment</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tierInfo.badgeColor}`}>
                      {tierInfo.icon} {tierInfo.name}
                    </span>
                  </div>

                  {/* Rating Numbers Transition */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono">Rating Progression</div>
                      <div className="text-lg font-black font-mono text-white flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400">{effectiveOldRating}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-white">{effectiveNewRating}</span>
                        <span className="text-xs font-normal text-slate-500">Elo</span>
                      </div>
                    </div>

                    {/* Delta Pill */}
                    <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-black flex items-center gap-1 border shadow-sm ${
                      effectiveDelta > 0
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : effectiveDelta < 0
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      {effectiveDelta > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : effectiveDelta < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      <span>
                        {effectiveDelta > 0 ? `+${effectiveDelta}` : effectiveDelta}
                      </span>
                    </div>
                  </div>

                  {/* Placement Phase vs Established Phase Breakdown */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">
                        {effectiveIsProvisional ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <span>⚡ Placement Match</span>
                            <span className="text-white">{Math.min(7, effectiveMatches)} of 7</span>
                          </span>
                        ) : (
                          <span className="text-sky-400 font-bold flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span>Established Rating</span>
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {effectiveIsProvisional ? 'High Volatility (±100)' : 'Stable Adjustments (±7–8)'}
                      </span>
                    </div>

                    {/* 7-Match Placement Visual Track */}
                    {effectiveIsProvisional && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                            const isDone = num <= effectiveMatches;
                            const isCurrent = num === effectiveMatches;
                            return (
                              <div
                                key={num}
                                className={`flex-1 h-1.5 rounded-full transition-all ${
                                  isCurrent
                                    ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                                    : isDone
                                    ? 'bg-emerald-400'
                                    : 'bg-slate-800'
                                }`}
                                title={`Placement Match ${num} of 7`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          First 7 matches drastically calibrate rating (±100 per game). Stable +-7 or 8 afterwards.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Opponent Rating Change Row */}
                  {typeof oppNewRating === 'number' && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Opponent ({topPlayer?.name || 'Opponent'}):</span>
                      <span className="font-mono">
                        {oppNewRating} Elo{' '}
                        {typeof oppRatingDelta === 'number' && (
                          <span className={oppRatingDelta > 0 ? 'text-emerald-400 font-bold' : oppRatingDelta < 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            ({oppRatingDelta > 0 ? `+${oppRatingDelta}` : oppRatingDelta})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {myRole !== 'spectator' && (
                  <button
                    onClick={() => {
                      setRematchOfferSent(true);
                      onOfferRematch();
                    }}
                    disabled={rematchOfferSent}
                    className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{rematchOfferSent ? 'Rematch Offered...' : 'Offer Rematch (Colors Swap)'}</span>
                  </button>
                )}

                {onReviewInStudio && (
                  <button
                    onClick={() => onReviewInStudio(roomState.pgn || chess.pgn())}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Review Game with Stockfish</span>
                  </button>
                )}

                <button
                  onClick={onLeaveRoom}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          )}

          {/* In-Game Action Bar (Resign & Draw Buttons) */}
          {roomState.isGameActive && !roomState.gameOver && myRole !== 'spectator' && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setDrawOfferSent(true);
                  onOfferDraw();
                }}
                disabled={drawOfferSent}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Offer a mutual draw"
              >
                <Handshake className="w-3.5 h-3.5 text-amber-400" />
                <span>{drawOfferSent ? 'Draw Offered' : 'Offer Draw'}</span>
              </button>

              <button
                onClick={() => setShowResignConfirm(true)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer"
                title="Resign this game"
              >
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>Resign</span>
              </button>
            </div>
          )}

          {/* Confirm Resign Dialog */}
          {showResignConfirm && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-2 text-center animate-in zoom-in-95">
              <span className="text-xs font-bold text-rose-200 block">Are you sure you want to resign?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowResignConfirm(false);
                    onResign();
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Yes, Resign
                </button>
                <button
                  onClick={() => setShowResignConfirm(false)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Real-time In-Game Chat Box */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 flex flex-col h-[340px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Game Chat</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {roomState.chat.length} messages
              </span>
            </div>

            {/* Chat Messages Log */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {roomState.chat.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-[11px] italic">
                  No chat messages yet. Say hello or tap a quick phrase!
                </div>
              ) : (
                roomState.chat.map((msg) => (
                  <div key={msg.id} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${
                        msg.senderColor === 'w' ? 'text-amber-200' : msg.senderColor === 'b' ? 'text-sky-300' : 'text-slate-400'
                      }`}>
                        {msg.sender}
                      </span>
                      <span className="text-slate-600 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-snug">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Quick Reactions Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition-colors cursor-pointer shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={120}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
