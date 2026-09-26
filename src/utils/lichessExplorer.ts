/**
 * Lightweight On-Demand Lichess Masters Opening Explorer Client & Cache
 * 
 * Correctly targets: https://explorer.lichess.ovh/masters
 * Requests ONLY the aggregated move counts for the currently selected exact FEN on demand.
 * Does NOT download or store any game database in the browser.
 * Includes:
 * - Request cancellation (AbortController) on position change
 * - Exact FEN-keyed LRU cache
 * - Request timeout and graceful error handling
 * - Clean opening detection fallback
 * - Decoupled from Stockfish analysis
 */

import { getOpeningFromFen } from './openings';

export type ExplorerDatabase = 'masters' | 'lichess';

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
  averageRating?: number;
  opening?: {
    eco: string;
    name: string;
  } | null;
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
  hasLichessData: boolean;
}

export type LichessData = LichessExplorerResult;

export interface ExplorerResponse {
  status: 'success' | 'no_data' | 'error';
  data?: LichessExplorerResult;
  message?: string;
}

// In-memory bounded cache for visited positions only (keyed by exact database + FEN)
const fenCache = new Map<string, LichessExplorerResult>();
const MAX_CACHE_SIZE = 250;

// Active AbortController for in-flight request cancellation
let activeAbortController: AbortController | null = null;

/**
 * Fetches lightweight on-demand statistics for a single exact FEN position from Lichess Openings API
 */
export async function fetchLichessOpeningStats(
  fen: string,
  database: ExplorerDatabase = 'masters'
): Promise<ExplorerResponse> {
  const cleanFen = fen?.trim() || '';
  if (!cleanFen) {
    return { status: 'error', message: 'Invalid FEN' };
  }

  const cacheKey = `${database}_${cleanFen}`;

  // 1. Check in-memory cache first to avoid repeat requests
  if (fenCache.has(cacheKey)) {
    const cached = fenCache.get(cacheKey)!;
    return {
      status: 'success',
      data: { ...cached, isCached: true },
    };
  }

  // 2. Cancel any previous in-flight network request when moves change
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  // 3. Build small on-demand query using exact FEN
  const encodedFen = encodeURIComponent(cleanFen);
  const endpoint = `/api/lichess/${database}?fen=${encodedFen}&moves=15&topGames=0`;

  console.log('[Lichess Masters API] Request initiating via proxy:', {
    fen: cleanFen,
    endpoint,
  });

  // Optional client-side authentication token fallback
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('lichess_token') || (window as any).LICHESS_TOKEN || (import.meta as any).env?.VITE_LICHESS_TOKEN)
    : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token && typeof token === 'string' && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  // 4. Set a 3.5s request timeout
  let timeoutId: any = null;
  const timeoutPromise = new Promise<{ isTimeout: boolean }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ isTimeout: true }), 3500);
  });

  try {
    const fetchPromise = fetch(endpoint, {
      signal,
      headers,
    }).then(async (res) => ({ res, isTimeout: false }));

    const racedResult = await Promise.race([fetchPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);

    if (racedResult.isTimeout) {
      console.warn('[Lichess Masters API] Request timed out for FEN:', cleanFen);
      if (activeAbortController) {
        activeAbortController.abort();
      }
      return handleNoLichessDataFallback(cleanFen, 'Request timed out');
    }

    const response = (racedResult as any).res as Response;
    console.log('[Lichess Masters API] HTTP Status:', response.status, response.statusText, 'for URL:', endpoint);

    if (!response.ok) {
      console.warn('[Lichess Masters API] Non-OK response:', response.status, response.statusText);
      return handleNoLichessDataFallback(cleanFen, `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[Lichess Masters API] Parsed payload structure:', {
      white: data.white,
      draws: data.draws,
      black: data.black,
      opening: data.opening,
      movesCount: Array.isArray(data.moves) ? data.moves.length : 0,
      sampleMoves: Array.isArray(data.moves) ? data.moves.slice(0, 3) : [],
    });

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
        averageRating: m.averageRating ? Number(m.averageRating) : undefined,
        opening: m.opening && m.opening.name ? { eco: m.opening.eco || '', name: m.opening.name } : null,
      };
    });

    // Sort moves descending by total games count
    moves.sort((a, b) => b.totalGames - a.totalGames);

    // Resolve opening name/ECO: Prefer Lichess returned opening, fallback to local opening database
    let parsedOpening = data.opening && data.opening.name
      ? {
          eco: data.opening.eco || '',
          name: data.opening.name || '',
        }
      : null;

    if (!parsedOpening) {
      const localOp = getOpeningFromFen(cleanFen);
      if (localOp) {
        parsedOpening = { eco: localOp.eco, name: localOp.name };
      }
    }

    const result: LichessExplorerResult = {
      fen: cleanFen,
      database,
      totalGames,
      whiteTotal,
      drawsTotal,
      blackTotal,
      opening: parsedOpening,
      moves,
      hasLichessData: totalGames > 0 || moves.length > 0,
    };

    // Store in bounded cache
    storeInCache(cacheKey, result);

    return {
      status: 'success',
      data: result,
    };
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return { status: 'error', message: 'Request cancelled' };
    }

    return handleNoLichessDataFallback(cleanFen, err?.message || 'Network error', database);
  }
}

/**
 * Alias for fetchLichessOpeningStats
 */
export const fetchLichessData = fetchLichessOpeningStats;

/**
 * Graceful fallback when Lichess API returns non-200 or is unreachable.
 * Never throws an error or breaks the UI; retrieves opening name/ECO from local book
 * and marks hasLichessData as false so UI displays "No opening data".
 */
function handleNoLichessDataFallback(
  cleanFen: string,
  reason: string,
  database: ExplorerDatabase = 'masters'
): ExplorerResponse {
  const localOp = getOpeningFromFen(cleanFen);
  const parsedOpening = localOp ? { eco: localOp.eco, name: localOp.name } : null;

  const fallbackResult: LichessExplorerResult = {
    fen: cleanFen,
    database,
    totalGames: 0,
    whiteTotal: 0,
    drawsTotal: 0,
    blackTotal: 0,
    opening: parsedOpening,
    moves: [],
    hasLichessData: false,
  };

  // Cache to avoid repeat requests on the same position
  storeInCache(`${database}_${cleanFen}`, fallbackResult);

  return {
    status: 'success',
    data: fallbackResult,
  };
}

function storeInCache(key: string, result: LichessExplorerResult) {
  if (fenCache.size >= MAX_CACHE_SIZE) {
    const firstKey = fenCache.keys().next().value;
    if (firstKey) fenCache.delete(firstKey);
  }
  fenCache.set(key, result);
}
