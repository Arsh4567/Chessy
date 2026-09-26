import React, { useState, useMemo } from 'react';
import { ChessComGame, ChessComPlayer } from '../../utils/chessComApi';
import { generatePersonalChessReport, ReportFilter } from '../../utils/chessReportEngine';
import { ReportHeader } from './ReportHeader';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportOverviewCards } from './ReportOverviewCards';
import { ReportOpeningsTables } from './ReportOpeningsTables';
import { ReportMistakesSection } from './ReportMistakesSection';
import { ReportStrengthsAndWeaknesses } from './ReportStrengthsAndWeaknesses';
import { ReportTheoryAndActionPlan } from './ReportTheoryAndActionPlan';

interface PersonalReportViewProps {
  games: ChessComGame[];
  player?: ChessComPlayer | null;
  username: string;
  onAnalyzeGame: (pgn: string) => void;
  onRefreshGames?: () => void;
  isLoading?: boolean;
}

export const PersonalReportView: React.FC<PersonalReportViewProps> = ({
  games,
  player,
  username,
  onAnalyzeGame: _onAnalyzeGame,
  onRefreshGames,
  isLoading = false,
}) => {
  // Filters state
  const [filter, setFilter] = useState<ReportFilter>({
    color: 'all',
    timeClass: 'all',
    opening: 'all',
    timePeriodDays: 0,
  });

  // Extract distinct openings for filter dropdown
  const availableOpenings = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.openingName) set.add(g.openingName);
    });
    return Array.from(set).sort();
  }, [games]);

  // Generate Report with Engine
  const report = useMemo(() => {
    return generatePersonalChessReport(games, username || 'Player', filter);
  }, [games, username, filter]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <ReportHeader
        player={player}
        username={username}
        gamesAnalyzedCount={report.overview.gamesAnalyzed}
        onRefreshGames={onRefreshGames}
        isLoading={isLoading}
      />

      {/* Filter Control Bar */}
      <ReportFilterBar
        filter={filter}
        setFilter={setFilter}
        totalGamesFiltered={report.totalGamesFiltered}
        totalGamesImported={report.totalGamesImported}
        availableOpenings={availableOpenings}
      />

      {/* 1. Overview Section */}
      <ReportOverviewCards overview={report.overview} />

      {/* 2 & 3. White & Black Openings Tables */}
      <ReportOpeningsTables
        whiteOpenings={report.whiteOpenings}
        blackOpenings={report.blackOpenings}
      />

      {/* 4. Common Mistakes Analyzed with Stockfish */}
      <ReportMistakesSection commonMistakes={report.commonMistakes} />

      {/* 5 & 6. Strong Areas & Areas for Improvement */}
      <ReportStrengthsAndWeaknesses
        strongAreas={report.strongAreas}
        areasForImprovement={report.areasForImprovement}
      />

      {/* 7 & 8. Opening Theory Report & Data-Backed Improvement Plan */}
      <ReportTheoryAndActionPlan
        openingReport={report.openingReport}
        improvementPlan={report.improvementPlan}
      />
    </div>
  );
};
