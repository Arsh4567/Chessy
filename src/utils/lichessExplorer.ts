/**
 * Lightweight On-Demand Lichess Opening Explorer Client & Cache
 * 
 * Requests ONLY the aggregated move counts for the currently selected FEN on demand.
 * Does NOT download or store any game database in the browser.
 * Includes:
 * - Request cancellation (AbortController)
 * - FEN-keyed LRU cache
 * - Rate-limit (HTTP 429) handling
 * - Automatic circuit-breaker / temporary cooldown on failures to prevent main-thread or network choking
 */

export type ExplorerDatabase = 'lichess' | 'masters';

export interface LichessExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  totalGames: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  playPct: number;
}

export interface LichessExplorerResult {
  fen: string;
  database: ExplorerDatabase;
  totalGames: number;
  whiteTotal: number;
  drawsTotal: number;
  blackTotal: number;
  opening?: {
    eco: string;
    name: string;
  } | null;
  moves: LichessExplorerMove[];
  isCached?: boolean;
}

export interface ExplorerResponse {
  status: 'success' | 'rate_limited' | 'error' | 'disabled';
  data?: LichessExplorerResult;
  message?: string;
  cooldownSeconds?: number;
}

// In-memory bounded cache for visited positions only (max 100 small objects)
const fenCache = new Map<string, LichessExplorerResult>();
const MAX_CACHE_SIZE = 100;

// Circuit breaker state to protect against spamming failed or rate-limited endpoints
let disabledUntilTimestamp: number = 0;
let consecutiveFailures: number = 0;
let activeAbortController: AbortController | null = null;

/**
 * Normalizes FEN for opening explorer lookup (pieces, side-to-move, castling, en-passant)
 */
export function normalizeOpeningFen(fen: string): string {
  if (!fen) return '';
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return fen.trim();
  // Strip halfmove and fullmove counters to match opening transposition
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

/**
 * Checks if Lichess requests are currently in a cooldown period
 */
export function getLichessCooldown(): number {
  const now = Date.now();
  if (now < disabledUntilTimestamp) {
    return Math.ceil((disabledUntilTimestamp - now) / 1000);
  }
  return 0;
}

/**
 * Manually resets the circuit breaker
 */
export function resetLichessCircuitBreaker(): void {
  disabledUntilTimestamp = 0;
  consecutiveFailures = 0;
}

/**
 * Fetches lightweight on-demand statistics for a single FEN position
 */
export async function fetchLichessOpeningStats(
  fen: string,
  database: ExplorerDatabase = 'lichess'
): Promise<ExplorerResponse> {
  const normalizedFen = normalizeOpeningFen(fen);
  if (!normalizedFen) {
    return { status: 'error', message: 'Invalid FEN' };
  }

  const cacheKey = `${database}:${normalizedFen}`;

  // 1. Check in-memory cache first
  if (fenCache.has(cacheKey)) {
    return {
      status: 'success',
      data: { ...fenCache.get(cacheKey)!, isCached: true },
    };
  }

  // 2. Check if circuit breaker is active
  const cooldown = getLichessCooldown();
  if (cooldown > 0) {
    return {
      status: 'disabled',
      message: `Lichess database temporarily paused (${cooldown}s cooldown remaining). Stockfish analysis remains active.`,
      cooldownSeconds: cooldown,
    };
  }

  // 3. Cancel any previous in-flight network request
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  // 4. Build small on-demand query (topGames=0 to avoid downloading unnecessary payload)
  const encodedFen = encodeURIComponent(normalizedFen);
  const endpoint =
    database === 'masters'
      ? `https://explorer.lichess.ovh/masters?fen=${encodedFen}&moves=10&topGames=0`
      : `https://explorer.lichess.ovh/lichess?fen=${encodedFen}&ratings=1600,1800,2000,2200,2500&speeds=blitz,rapid,classical&moves=10&topGames=0`;

  // Set a 4.5s request timeout
  const timeoutId = setTimeout(() => {
    if (activeAbortController) {
      activeAbortController.abort();
    }
  }, 4500);

  try {
    const response = await fetch(endpoint, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    // Handle Rate Limiting (HTTP 429)
    if (response.status === 429) {
      consecutiveFailures++;
      disabledUntilTimestamp = Date.now() + 60000; // 60s cooldown
      return {
        status: 'rate_limited',
        message: 'Lichess API rate limit reached. Pausing explorer requests for 60 seconds.',
        cooldownSeconds: 60,
      };
    }

    if (!response.ok) {
      consecutiveFailures++;
      if (consecutiveFailures >= 2) {
        disabledUntilTimestamp = Date.now() + 30000; // 30s cooldown on repeated failures
      }
      return {
        status: 'error',
        message: `Lichess server returned status ${response.status}`,
      };
    }

    const data = await response.json();
    consecutiveFailures = 0; // Reset failure count on success

    const whiteTotal = Number(data.white || 0);
    const drawsTotal = Number(data.draws || 0);
    const blackTotal = Number(data.black || 0);
    const totalGames = whiteTotal + drawsTotal + blackTotal;

    const rawMoves = Array.isArray(data.moves) ? data.moves : [];
    const totalMoveGamesSum = rawMoves.reduce(
      (sum: number, m: any) => sum + (Number(m.white || 0) + Number(m.draws || 0) + Number(m.black || 0)),
      0
    );

    const moves: LichessExplorerMove[] = rawMoves.map((m: any) => {
      const w = Number(m.white || 0);
      const d = Number(m.draws || 0);
      const b = Number(m.black || 0);
      const mTotal = w + d + b;

      const whiteWinPct = mTotal > 0 ? Math.round((w / mTotal) * 100) : 0;
      const drawPct = mTotal > 0 ? Math.round((d / mTotal) * 100) : 0;
      const blackWinPct = mTotal > 0 ? Math.max(0, 100 - whiteWinPct - drawPct) : 0;
      const playPct = totalMoveGamesSum > 0 ? Math.round((mTotal / totalMoveGamesSum) * 100) : 0;

      return {
        uci: m.uci || '',
        san: m.san || '',
        white: w,
        draws: d,
        black: b,
        totalGames: mTotal,
        whiteWinPct,
        drawPct,
        blackWinPct,
        playPct,
      };
    });

    // Sort moves descending by total games count
    moves.sort((a, b) => b.totalGames - a.totalGames);

    const result: LichessExplorerResult = {
      fen: normalizedFen,
      database,
      totalGames,
      whiteTotal,
      drawsTotal,
      blackTotal,
      opening: data.opening
        ? {
            eco: data.opening.eco || '',
            name: data.opening.name || '',
          }
        : null,
      moves,
    };

    // Store in bounded cache
    if (fenCache.size >= MAX_CACHE_SIZE) {
      const firstKey = fenCache.keys().next().value;
      if (firstKey) fenCache.delete(firstKey);
    }
    fenCache.set(cacheKey, result);

    return {
      status: 'success',
      data: result,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      // Intentionally aborted due to position change or timeout
      return { status: 'error', message: 'Request cancelled' };
    }

    consecutiveFailures++;
    if (consecutiveFailures >= 2) {
      disabledUntilTimestamp = Date.now() + 30000; // 30s cooldown
    }

    return {
      status: 'error',
      message: 'Network or connectivity issue reaching Lichess',
    };
  }
}
