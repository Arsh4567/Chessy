import React, { useState } from 'react';
import { TimeControl, PieceColor } from '../../types/chess';
import { UserStats } from '../../utils/storage';
import { MultiplayerView } from '../Multiplayer/MultiplayerView';
import { FriendsHub } from './FriendsHub';
import { Users, Globe } from 'lucide-react';

interface FriendsViewProps {
  stats?: UserStats;
  onStatsUpdate?: (stats: UserStats) => void;
  onStartLocalGame: (timeControl: TimeControl, playerColor: PieceColor, customFen?: string) => void;
  initialRoomCode?: string;
  onReviewGame?: (pgn: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  stats,
  onStatsUpdate,
  onStartLocalGame,
  initialRoomCode,
  onReviewGame,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'social' | 'rooms'>('social');
  const [directRoomCode, setDirectRoomCode] = useState<string | undefined>(initialRoomCode);

  const handleStartDirectMatch = (timeControl: TimeControl, color: PieceColor, roomId: string) => {
    setDirectRoomCode(roomId);
    setActiveSubTab('rooms');
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation Segmented Switch */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
          <button
            onClick={() => setActiveSubTab('social')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'social'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends & Direct Messages</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'rooms'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Multiplayer & Custom Rooms</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'social' ? (
        <FriendsHub onStartDirectMatch={handleStartDirectMatch} />
      ) : (
        <MultiplayerView
          stats={stats}
          onStatsUpdate={onStatsUpdate}
          onStartLocalGame={onStartLocalGame}
          initialRoomCode={directRoomCode || initialRoomCode}
          onReviewGame={onReviewGame}
        />
      )}
    </div>
  );
};
