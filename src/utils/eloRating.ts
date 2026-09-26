/**
 * Advanced Multiplayer Elo Rating System
 * 
 * Rules:
 * - Default Initial Rating: 800 Elo
 * - Placement Phase: First 7 matches (1 through 7)
 *     Performance affects rating drastically:
 *     - Win: around +100
 *     - Loss: around -100
 *     - Draw: around 0
 * - Established Phase: After 7 matches (8+)
 *     Performance affects rating with stable adjustments:
 *     - Win: around +7 to +8
 *     - Loss: around -7 to -8
 *     - Draw: around 0 (or ±0 to 1)
 * - Minimum rating floor: 100 Elo
 */

export const INITIAL_RATING = 800;
export const PLACEMENT_MATCHES_COUNT = 7;

export interface EloCalculationResult {
  newRating: number;
  ratingDelta: number;
  isProvisional: boolean;
  matchesPlayed: number;
  expectedScore: number;
  performanceTier: string;
}

export interface EloTierInfo {
  name: string;
  minRating: number;
  badgeColor: string;
  icon: string;
}

export const ELO_TIERS: EloTierInfo[] = [
  { name: 'Grandmaster', minRating: 2200, badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10', icon: '👑' },
  { name: 'Master', minRating: 1800, badgeColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10', icon: '💎' },
  { name: 'Expert', minRating: 1500, badgeColor: 'text-sky-400 border-sky-500/40 bg-sky-500/10', icon: '⚔️' },
  { name: 'Intermediate', minRating: 1100, badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', icon: '🛡️' },
  { name: 'Apprentice', minRating: 850, badgeColor: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10', icon: '♟️' },
  { name: 'Novice', minRating: 0, badgeColor: 'text-slate-400 border-slate-700 bg-slate-800/40', icon: '🌱' },
];

export function getEloTier(rating: number): EloTierInfo {
  for (const tier of ELO_TIERS) {
    if (rating >= tier.minRating) return tier;
  }
  return ELO_TIERS[ELO_TIERS.length - 1];
}

/**
 * Computes expected score using the standard logistic Elo formula:
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function getExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculates new Elo rating and delta after a match result.
 * 
 * @param playerRating Current rating of the player (starts at 800)
 * @param opponentRating Current rating of the opponent (starts at 800)
 * @param result 'win' | 'loss' | 'draw'
 * @param gamesPlayed Number of multiplayer games this player has completed BEFORE this match
 */
export function calculateEloUpdate(
  playerRating: number = INITIAL_RATING,
  opponentRating: number = INITIAL_RATING,
  result: 'win' | 'loss' | 'draw',
  gamesPlayed: number = 0
): EloCalculationResult {
  const isProvisional = gamesPlayed < PLACEMENT_MATCHES_COUNT;
  const expected = getExpectedScore(playerRating, opponentRating);
  const actualScore = result === 'win' ? 1.0 : result === 'loss' ? 0.0 : 0.5;

  let delta: number;

  if (isProvisional) {
    // -------------------------------------------------------------
    // Provisional Placement Phase (Matches 1..7)
    // -------------------------------------------------------------
    // Drastic rating adjustments: around +100 for win, -100 for loss, 0 for draw
    // Using effective K = 200:
    // Against equal opponent (expected = 0.5):
    // Win: 200 * (1 - 0.5) = +100
    // Loss: 200 * (0 - 0.5) = -100
    // Draw: 200 * (0.5 - 0.5) = 0
    const rawDelta = 200 * (actualScore - expected);

    if (result === 'draw') {
      // Draw in placement: 0, bounded tightly to max ±5 for very large rating disparities
      delta = Math.round(Math.max(-5, Math.min(5, rawDelta)));
    } else if (result === 'win') {
      // Win in placement: guaranteed drastic jump around +100 (bounded between +80 and +125)
      delta = Math.round(Math.max(80, Math.min(125, rawDelta)));
    } else {
      // Loss in placement: guaranteed drastic drop around -100 (bounded between -125 and -80)
      delta = Math.round(Math.min(-80, Math.max(-125, rawDelta)));
    }
  } else {
    // -------------------------------------------------------------
    // Established Stable Phase (Matches 8+)
    // -------------------------------------------------------------
    // Stable rating adjustments: around +7 to +8 for win, -7 to -8 for loss, 0 for draw
    // Using effective K = 15:
    // Against equal opponent (expected = 0.5):
    // Win: 15 * (1 - 0.5) = +7.5 => rounds to +8
    // Loss: 15 * (0 - 0.5) = -7.5 => rounds to -8
    // Draw: 15 * (0.5 - 0.5) = 0
    const rawDelta = 15 * (actualScore - expected);

    if (result === 'draw') {
      delta = Math.round(rawDelta); // 0 or ±1
    } else if (result === 'win') {
      delta = Math.round(Math.max(5, Math.min(10, rawDelta))); // +7 or +8 typically
    } else {
      delta = Math.round(Math.min(-5, Math.max(-10, rawDelta))); // -7 or -8 typically
    }
  }

  // Minimum rating floor is 100
  const newRating = Math.max(100, Math.round(playerRating + delta));
  const actualDelta = newRating - playerRating;

  return {
    newRating,
    ratingDelta: actualDelta,
    isProvisional,
    matchesPlayed: gamesPlayed + 1,
    expectedScore: expected,
    performanceTier: getEloTier(newRating).name,
  };
}
