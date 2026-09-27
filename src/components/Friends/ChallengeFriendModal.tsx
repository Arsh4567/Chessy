import React, { useState, useEffect } from 'react';
import { 
  FriendUser, 
  GameChallenge, 
  sendGameChallenge, 
  subscribeToOutgoingChallenge, 
  respondToGameChallenge 
} from '../../firebase/socialService';
import { TimeControl, PieceColor } from '../../types/chess';
import { TIME_CONTROLS } from '../../utils/mockData';
import { sound } from '../../utils/sound';
import { 
  X, 
  Swords, 
  Clock, 
  Shield, 
  Zap, 
  Check, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

interface ChallengeFriendModalProps {
  friend: FriendUser;
  isOpen: boolean;
  onClose: () => void;
  onGameAccepted: (timeControl: TimeControl, color: PieceColor, roomId: string) => void;
}

export const ChallengeFriendModal: React.FC<ChallengeFriendModalProps> = ({
  friend,
  isOpen,
  onClose,
  onGameAccepted,
}) => {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // 3-0 Blitz
  const [preferredColor, setPreferredColor] = useState<PieceColor | 'random'>('random');
  const [isRated, setIsRated] = useState<boolean>(true);

  // Active Challenge State
  const [activeChallenge, setActiveChallenge] = useState<GameChallenge | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(120);

  // Subscribe to outgoing challenge status updates
  useEffect(() => {
    if (!activeChallenge?.id) return;

    const unsub = subscribeToOutgoingChallenge(activeChallenge.id, (updated) => {
      if (!updated) return;

      if (updated.status === 'accepted') {
        sound.playMatchStart();
        // Resolve assigned color
        let assignedColor: PieceColor = 'w';
        if (updated.challengerColor === 'random') {
          assignedColor = Math.random() > 0.5 ? 'w' : 'b';
        } else {
          assignedColor = updated.challengerColor as PieceColor;
        }

        onGameAccepted(updated.timeControl, assignedColor, updated.roomId);
        onClose();
      } else if (updated.status === 'declined' || updated.status === 'expired') {
        sound.playGameOver();
        setActiveChallenge(null);
      }
    });

    return () => unsub();
  }, [activeChallenge?.id, onGameAccepted, onClose]);

  // Countdown timer for active pending challenge
  useEffect(() => {
    if (!activeChallenge) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          respondToGameChallenge(activeChallenge.id, 'cancelled');
          setActiveChallenge(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeChallenge]);

  if (!isOpen) return null;

  const handleSendChallenge = async () => {
    setIsSending(true);
    try {
      const challenge = await sendGameChallenge(friend, selectedTimeControl, preferredColor, isRated);
      setActiveChallenge(challenge);
      setCountdown(120);
      sound.playMove();
    } catch (err) {
      console.warn('Failed to send challenge:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelChallenge = async () => {
    if (activeChallenge) {
      await respondToGameChallenge(activeChallenge.id, 'cancelled');
      setActiveChallenge(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shadow-inner">
              ⚔️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Direct Game Challenge</h3>
              <p className="text-xs text-slate-400">vs {friend.displayName} ({friend.rating || 1200} ELO)</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleCancelChallenge();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WAITING STATE: Challenge Sent */}
        {activeChallenge ? (
          <div className="py-6 space-y-4 text-center animate-in fade-in">
            <div className="relative inline-flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
              <span className="absolute font-mono font-bold text-xs text-amber-400">
                {countdown}s
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                Challenge Sent to {friend.displayName}!
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Waiting for {friend.displayName} to accept the {selectedTimeControl.name} match...
              </p>
            </div>

            <button
              onClick={handleCancelChallenge}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer border border-slate-700"
            >
              Cancel Challenge
            </button>
          </div>
        ) : (
          /* CONFIGURATION FORM */
          <div className="space-y-4">
            {/* Time Control Options */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Time Control</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_CONTROLS.slice(0, 6).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTimeControl(opt)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedTimeControl.id === opt.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.name}</span>
                    <span className={`block text-[10px] uppercase font-mono ${selectedTimeControl.id === opt.id ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {opt.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Play As Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Play As</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'w' as const, label: 'White', icon: '⚪' },
                  { id: 'random' as const, label: 'Random', icon: '🎲' },
                  { id: 'b' as const, label: 'Black', icon: '⚫' },
                ].map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setPreferredColor(col.id)}
                    className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      preferredColor === col.id
                        ? 'bg-slate-800 border-amber-400 text-white font-bold ring-1 ring-amber-400/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{col.icon}</span>
                    <span className="text-xs">{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rated Match Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Rated Match</span>
                <span className="text-[10px] text-slate-400 block">Updates multiplayer Elo ratings</span>
              </div>
              <button
                onClick={() => setIsRated(!isRated)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isRated ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    isRated ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendChallenge}
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Swords className="w-4 h-4" />
                <span>Send Challenge</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
