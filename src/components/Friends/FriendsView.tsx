import React from 'react';
import { TimeControl, PieceColor } from '../../types/chess';
import { UserStats } from '../../utils/storage';
import { MultiplayerView } from '../Multiplayer/MultiplayerView';

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
  return (
    <MultiplayerView
      stats={stats}
      onStatsUpdate={onStatsUpdate}
      onStartLocalGame={onStartLocalGame}
      initialRoomCode={initialRoomCode}
      onReviewGame={onReviewGame}
    />
  );
};
