/**
 * Chess Opening Repertoire & Spaced Repetition (SRS) Engine
 * Implements an advanced SM-2 inspired spaced repetition algorithm tailored for chess opening trees.
 */

import { Chess } from 'chess.js';

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsMastery = 'new' | 'learning' | 'review' | 'mastered';

export interface SrsCardData {
  repetitions: number;
  interval: number; // in days
  easeFactor: number; // default 2.5
  nextReviewDate: string; // ISO format
  lastReviewedDate?: string;
  masteryLevel: SrsMastery;
  totalReviews: number;
  mistakes: number;
}

export interface RepertoireLine {
  id: string;
  name: string;
  moves: string[]; // SAN moves sequence from starting position
  color: 'w' | 'b';
  notes?: string;
  tags?: string[];
  keyIdea?: string;
  srsData: SrsCardData;
}

export interface RepertoireItem {
  id: string;
  name: string;
  color: 'w' | 'b';
  description: string;
  eco: string;
  isCustom?: boolean;
  lines: RepertoireLine[];
}

export const INITIAL_SRS_DATA: SrsCardData = {
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
  nextReviewDate: new Date().toISOString(),
  masteryLevel: 'new',
  totalReviews: 0,
  mistakes: 0,
};

/**
 * Calculates updated SRS scheduling data using chess-optimized SM-2 algorithm
 */
export function calculateNextSrsReview(
  currentSrs: SrsCardData,
  rating: SrsRating
): SrsCardData {
  let { repetitions, interval, easeFactor, totalReviews, mistakes } = currentSrs;
  totalReviews += 1;

  let masteryLevel: SrsMastery = 'learning';

  if (rating === 'again') {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    mistakes += 1;
    masteryLevel = 'learning';
  } else if (rating === 'hard') {
    repetitions += 1;
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    masteryLevel = repetitions >= 4 ? 'review' : 'learning';
  } else if (rating === 'good') {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    masteryLevel = repetitions >= 5 ? 'mastered' : repetitions >= 2 ? 'review' : 'learning';
  } else if (rating === 'easy') {
    repetitions += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.15);
    if (repetitions === 1) {
      interval = 2;
    } else if (repetitions === 2) {
      interval = 5;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    masteryLevel = repetitions >= 4 ? 'mastered' : 'review';
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    repetitions,
    interval,
    easeFactor,
    nextReviewDate: nextDate.toISOString(),
    lastReviewedDate: new Date().toISOString(),
    masteryLevel,
    totalReviews,
    mistakes,
  };
}

/**
 * Check if a line is currently due for review
 */
export function isLineDueForReview(line: RepertoireLine): boolean {
  if (!line.srsData || line.srsData.masteryLevel === 'new') return true;
  const dueDate = new Date(line.srsData.nextReviewDate);
  const now = new Date();
  return dueDate <= now;
}

/**
 * Calculates aggregated mastery statistics for a repertoire
 */
export function getRepertoireMasteryStats(repertoire: RepertoireItem) {
  const total = repertoire.lines.length;
  if (total === 0) {
    return { total: 0, due: 0, mastered: 0, learning: 0, review: 0, newCount: 0, masteryPct: 0 };
  }

  let due = 0;
  let mastered = 0;
  let learning = 0;
  let review = 0;
  let newCount = 0;

  for (const line of repertoire.lines) {
    if (isLineDueForReview(line)) due++;
    const level = line.srsData?.masteryLevel || 'new';
    if (level === 'mastered') mastered++;
    else if (level === 'review') review++;
    else if (level === 'learning') learning++;
    else newCount++;
  }

  const masteryScore = (mastered * 1.0 + review * 0.6 + learning * 0.25) / total;
  const masteryPct = Math.round(masteryScore * 100);

  return {
    total,
    due,
    mastered,
    learning,
    review,
    newCount,
    masteryPct,
  };
}

/**
 * Pre-built Master Opening Repertoires (Battle-Tested Grandmaster Lines)
 */
export const STARTER_REPERTOIRES: RepertoireItem[] = [
  // 1. Italian Game & Evans Gambit (White)
  {
    id: 'starter-italian-white',
    name: 'Italian Game & Evans Gambit',
    color: 'w',
    description: 'Classical, dynamic 1.e4 kingside development with rich attacking chances and tactical initiative.',
    eco: 'C50',
    lines: [
      {
        id: 'it-main-giuoco-piano',
        name: 'Giuoco Piano: Mainline Center Build',
        color: 'w',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2'],
        keyIdea: 'White builds a formidable classical pawn center and quickly contests Black’s checking bishop.',
        tags: ['classical', 'center-control'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'it-evans-gambit',
        name: 'Evans Gambit: Romantic Wing Attack',
        color: 'w',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4'],
        keyIdea: 'Sacrifice a flank pawn to accelerate central domination and open lines against Black’s uncastled king.',
        tags: ['gambit', 'tactical', 'sharp'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'it-fried-liver-attack',
        name: 'Two Knights Defense: Fried Liver Attack',
        color: 'w',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+'],
        keyIdea: 'Knock out the f7 pawn and hunt Black’s exposed king across the open board.',
        tags: ['sacrifice', 'aggressive', 'kingsideAttack'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'it-two-knights-polerio',
        name: 'Two Knights: Polerio Mainline',
        color: 'w',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2'],
        keyIdea: 'White grabs a pawn and retreats securely to e2, neutralizing Black’s queenside compensation.',
        tags: ['pawn-up', 'theory'],
        srsData: { ...INITIAL_SRS_DATA },
      },
    ],
  },

  // 2. Solid London System (White)
  {
    id: 'starter-london-white',
    name: 'The Invincible London System',
    color: 'w',
    description: 'Universal, rock-solid pawn pyramid with safe development and venomous kingside attacking patterns.',
    eco: 'D02',
    lines: [
      {
        id: 'lon-main-d5-c5',
        name: 'London System vs 1...d5 & c5 Challenge',
        color: 'w',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3', 'Bd6', 'Bg3'],
        keyIdea: 'Preserve the strong dark-squared bishop by dropping it back to g3 to create open h-file attacking motifs.',
        tags: ['solid', 'pyramid'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'lon-kings-indian-setup',
        name: 'London vs King’s Indian Setup (g6/Bg7)',
        color: 'w',
        moves: ['d4', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'h3', 'd6', 'Be2', 'Nbd7', 'O-O'],
        keyIdea: 'Provide a retreat square with h3 and build up a compact, impregnable center.',
        tags: ['anti-kid', 'positional'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'lon-jobava-gambit',
        name: 'Jobava London: Aggressive Nc3 Setup',
        color: 'w',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c6', 'e3', 'Bf5', 'f3', 'e6', 'g4', 'Bg6', 'h4'],
        keyIdea: 'Storm Black’s kingside with f3-g4-h4 pawn advances to trap Black’s bishop and initiate a knockout.',
        tags: ['aggressive', 'kingsideStorm'],
        srsData: { ...INITIAL_SRS_DATA },
      },
    ],
  },

  // 3. Sicilian Defense: Dragon & Open Variation (Black)
  {
    id: 'starter-sicilian-black',
    name: 'Sicilian Defense: Sharp Dragon & Najdorf',
    color: 'b',
    description: 'The sharpest, most dynamic fighting response to 1.e4 with asymmetrical imbalance and counterplay.',
    eco: 'B70',
    lines: [
      {
        id: 'sic-dragon-yugoslav',
        name: 'Dragon Variation: Yugoslav Attack Counter',
        color: 'b',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5'],
        keyIdea: 'Black fianchettos the powerful dragon bishop on g7 and mobilizes the c-file counter-attack with ...Rc8 and ...Nc4.',
        tags: ['dragon', 'counter-attack', 'sharp'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'sic-najdorf-english',
        name: 'Najdorf Variation: English Attack Defense',
        color: 'b',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O', 'Nbd7'],
        keyIdea: 'Solidify the d5 outpost, clamp down on White’s queenside, and strike back with ...b5.',
        tags: ['najdorf', 'grandmaster-choice'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'sic-anti-alapin',
        name: 'Anti-Sicilian: Countering the 2.c3 Alapin',
        color: 'b',
        moves: ['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nf6', 'Nf3', 'Bg4', 'Be2', 'e6', 'O-O', 'Nc6'],
        keyIdea: 'Immediately counter in the center with 2...d5, pinning the f3 knight and putting active pressure on d4.',
        tags: ['anti-sicilian', 'active-pieces'],
        srsData: { ...INITIAL_SRS_DATA },
      },
    ],
  },

  // 4. Solid Caro-Kann Defense (Black)
  {
    id: 'starter-caro-kann-black',
    name: 'Caro-Kann Defense: The Classical Shield',
    color: 'b',
    description: 'Rock-solid pawn structure with easy piece development, immune to early tactical blowouts.',
    eco: 'B12',
    lines: [
      {
        id: 'ck-advance-variation',
        name: 'Advance Variation: Active Bishop Break',
        color: 'b',
        moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3', 'Qb6'],
        keyIdea: 'Develop the light-squared bishop outside the pawn chain to f5 before playing ...e6, then undermine d4 with ...c5 and ...Qb6.',
        tags: ['pawn-structure', 'solid'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'ck-classical-capablanca',
        name: 'Classical Variation: Capablanca 4...Bf5',
        color: 'b',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6'],
        keyIdea: 'Systematically trade minor pieces to enter an endgame where Black’s pawn majority is structurally superior.',
        tags: ['endgame-advantage', 'classical'],
        srsData: { ...INITIAL_SRS_DATA },
      },
      {
        id: 'ck-fantasy-variation',
        name: 'Fantasy Variation: 3.f3 Counter',
        color: 'b',
        moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'dxe4'],
        keyIdea: 'Break open White’s weakened dark squares and pressure the e4 pawn.',
        tags: ['tactical', 'counter'],
        srsData: { ...INITIAL_SRS_DATA },
      },
    ],
  },
];

const LOCAL_STORAGE_REPERTOIRES_KEY = 'gm_opening_repertoires_v1';

/**
 * Loads user repertoires from LocalStorage (or seeds with starter repertoires)
 */
export function loadUserRepertoires(): RepertoireItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPERTOIRES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Repertoire load warning:', err);
  }
  return STARTER_REPERTOIRES;
}

/**
 * Saves user repertoires to LocalStorage
 */
export function saveUserRepertoires(repertoires: RepertoireItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REPERTOIRES_KEY, JSON.stringify(repertoires));
  } catch (err) {
    console.warn('Repertoire save warning:', err);
  }
}
