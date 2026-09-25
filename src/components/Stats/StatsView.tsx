import React from 'react';
import { UserStats } from '../../utils/storage';
import { DashboardView } from '../Dashboard/DashboardView';
import { ChessComGame, ChessComPlayer } from '../../utils/chessComApi';

interface StatsViewProps {
  stats: UserStats;
  onReviewGame: (pgn: string) => void;
  onResetStats: () => void;
  onStartBotGame?: () => void;
  onSolvePuzzle?: () => void;
  onOpenReport?: (games: ChessComGame[], player: ChessComPlayer | null, username: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  onReviewGame,
  onResetStats,
  onStartBotGame,
  onSolvePuzzle,
  onOpenReport,
}) => {
  return (
    <DashboardView
      stats={stats}
      onReviewGame={onReviewGame}
      onResetStats={onResetStats}
      onStartBotGame={onStartBotGame}
      onSolvePuzzle={onSolvePuzzle}
      onOpenReport={onOpenReport}
    />
  );
};
