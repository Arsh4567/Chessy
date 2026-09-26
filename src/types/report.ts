export interface ReportFilter {
  color: 'all' | 'white' | 'black';
  timeClass: 'all' | 'rapid' | 'blitz' | 'bullet' | 'daily';
  opening: string; // 'all' or opening name substring
  timePeriodDays: number; // 0 = all, 30 = last month, 90 = last 3 months, 365 = last year
}

export interface OpeningStats {
  name: string;
  eco?: string;
  gamesCount: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  avgEvalAfterOpening: number; // in centipawns / pawns (e.g. +0.4)
  avgAccuracy?: number;
  divergenceMoveAvg?: number;
  mostCommonDivergenceFen?: string;
  mostCommonDivergenceMove?: string;
}

export interface MistakePattern {
  id: string;
  name: string;
  description: string;
  occurrences: number;
  affectedGamesCount: number;
  percentageOfGames: number;
  severity: 'high' | 'medium' | 'low';
  exampleGameId?: string;
  exampleOpponent?: string;
  exampleMoveSan?: string;
  exampleFen?: string;
  hasEnoughData: boolean;
}

export interface StrengthArea {
  id: string;
  name: string;
  metric: string;
  scorePercent: number;
  rating: 'elite' | 'strong' | 'solid' | 'developing';
  supportingData: string;
  hasEnoughData: boolean;
}

export interface ImprovementPlanItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  area: string;
  finding: string;
  evidence: string;
  actionableStep: string;
}

export interface OpeningTheoryReport {
  whiteMainOpening: OpeningStats | null;
  blackMainOpening: OpeningStats | null;
  whiteTheoryDivergence: {
    avgMove: number;
    commonPositionFen?: string;
    sampleCount: number;
    hasEnoughData: boolean;
  };
  blackTheoryDivergence: {
    avgMove: number;
    commonPositionFen?: string;
    sampleCount: number;
    hasEnoughData: boolean;
  };
}

export interface PersonalChessReport {
  generatedAt: number;
  totalGamesImported: number;
  totalGamesFiltered: number;
  playerName: string;
  overview: {
    gamesAnalyzed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    avgGameLengthMoves: number;
    whiteWinRate: number;
    blackWinRate: number;
    hasEnoughData: boolean;
  };
  whiteOpenings: OpeningStats[];
  blackOpenings: OpeningStats[];
  commonMistakes: MistakePattern[];
  strongAreas: StrengthArea[];
  areasForImprovement: MistakePattern[];
  openingReport: OpeningTheoryReport;
  improvementPlan: ImprovementPlanItem[];
  appliedFilter: ReportFilter;
}
