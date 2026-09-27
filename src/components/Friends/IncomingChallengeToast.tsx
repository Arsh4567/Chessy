import React, { useState, useEffect } from 'react';
import { 
  GameChallenge, 
  subscribeToIncomingChallenges, 
  respondToGameChallenge 
} from '../../firebase/socialService';
import { useAuth } from '../../context/AuthContext';
import { TimeControl, PieceColor } from '../../types/chess';
import { sound } from '../../utils/sound';
import { Swords, Check, X, Clock, Shield } from 'lucide-react';

interface IncomingChallengeToastProps {
  onAcceptChallenge: (timeControl: TimeControl, color: PieceColor, roomId: string) => void;
}

export const IncomingChallengeToast: React.FC<IncomingChallengeToastProps> = ({
  onAcceptChallenge,
}) => {
  const { user } = useAuth();
  const [activeChallenges, setActiveChallenges] = useState<GameChallenge[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToIncomingChallenges(user.uid, (challenges) => {
      if (challenges.length > activeChallenges.length) {
        sound.playMatchStart();
      }
      setActiveChallenges(challenges);
    });

    return () => unsub();
  }, [user]);

  if (activeChallenges.length === 0) return null;

  const currentChallenge = activeChallenges[0];

  const handleAccept = async () => {
    sound.playMatchStart();
    await respondToGameChallenge(currentChallenge.id, 'accepted');
    
    // Invert challenger color for recipient
    let assignedColor: PieceColor = 'b';
    if (currentChallenge.challengerColor === 'w') {
      assignedColor = 'b';
    } else if (currentChallenge.challengerColor === 'b') {
      assignedColor = 'w';
    } else {
      assignedColor = Math.random() > 0.5 ? 'w' : 'b';
    }

    onAcceptChallenge(currentChallenge.timeControl, assignedColor, currentChallenge.roomId);
  };

  const handleDecline = async () => {
    sound.playGameOver();
    await respondToGameChallenge(currentChallenge.id, 'declined');
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-4 shadow-2xl shadow-amber-500/20 animate-in slide-in-from-top duration-300">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl shrink-0 shadow-inner">
          ⚔️
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
              Live Game Challenge
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {currentChallenge.timeControl?.name || 'Match'} • {currentChallenge.isRated ? 'Rated' : 'Casual'}
            </span>
          </div>

          <h4 className="text-sm font-bold text-white">
            {currentChallenge.challengerDisplayName}
          </h4>

          <p className="text-xs text-slate-300">
            challenged you to a {currentChallenge.timeControl?.name || 'chess'} match!
          </p>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Accept</span>
            </button>
            <button
              onClick={handleDecline}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 font-bold text-xs transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
