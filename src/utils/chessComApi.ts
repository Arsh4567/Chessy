export interface ChessComPlayer {
  username: string;
  name?: string;
  avatar?: string;
  title?: string;
  status?: string;
  countryCode?: string;
  joined?: number;
  lastOnline?: number;
  stats?: {
    rapid?: number;
    blitz?: number;
    bullet?: number;
    daily?: number;
    puzzle?: number;
  };
}

export interface ChessComGame {
  id: string;
  url: string;
  pgn: string;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
  timeControl: string;
  timeClass: string;
  endTime: number;
  date: string;
  openingName?: string;
  eco?: string;
  userResult: 'win' | 'loss' | 'draw';
  userColor: 'white' | 'black';
  opponentName: string;
  opponentRating: number;
  movesCount?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache
const memoryCache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

function parseOpeningFromPgn(pgn: string, ecoUrl?: string): string | undefined {
  if (ecoUrl) {
    const match = ecoUrl.split('/openings/')[1];
    if (match) {
      return decodeURIComponent(match.replace(/-/g, ' '));
    }
  }

  // Try extracting ECOUrl or Opening header from PGN
  const ecoUrlMatch = pgn.match(/\[ECOUrl\s+"https?:\/\/[^/]+\/openings\/([^"]+)"\]/i);
  if (ecoUrlMatch && ecoUrlMatch[1]) {
    return decodeURIComponent(ecoUrlMatch[1].replace(/-/g, ' '));
  }

  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/i);
  if (openingMatch && openingMatch[1]) {
    return openingMatch[1];
  }

  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/i);
  if (ecoMatch && ecoMatch[1]) {
    return `ECO ${ecoMatch[1]}`;
  }

  return undefined;
}

function parseMovesCountFromPgn(pgn: string): number {
  const matches = pgn.match(/\b\d+\.\s/g);
  return matches ? matches.length : 0;
}

function determineUserResult(resultCode: string): 'win' | 'loss' | 'draw' {
  if (resultCode === 'win') return 'win';
  if (
    resultCode === 'agreed' ||
    resultCode === 'repetition' ||
    resultCode === 'stalemate' ||
    resultCode === 'timevsinsufficient' ||
    resultCode === 'insufficient' ||
    resultCode === '50move'
  ) {
    return 'draw';
  }
  return 'loss';
}

function formatTimeControl(timeControl: string, timeClass: string): string {
  if (!timeControl) return timeClass ? timeClass.toUpperCase() : 'GAME';
  if (timeControl.includes('/')) {
    return 'Daily';
  }
  const parts = timeControl.split('+');
  const baseSecs = parseInt(parts[0], 10);
  const incSecs = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isNaN(baseSecs)) return timeClass.toUpperCase();

  const mins = Math.floor(baseSecs / 60);
  if (incSecs > 0) {
    return `${mins}+${incSecs}`;
  }
  return `${mins}m`;
}

export async function fetchChessComPlayer(username: string): Promise<ChessComPlayer> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) {
    throw new Error('Username required');
  }

  const cacheKey = `player_${cleanUsername}`;
  const cached = getFromCache<ChessComPlayer>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanUsername)}`, {
    headers: {
      'User-Agent': 'GrandmasterStudioChessApp/1.0',
    },
  });

  if (res.status === 404) {
    throw new Error(`Player "${username}" not found on Chess.com`);
  }
  if (res.status === 429) {
    throw new Error('Chess.com API rate limit reached. Please wait a moment and try again.');
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch player: HTTP ${res.status}`);
  }

  const data = await res.json();

  // Fetch ratings/stats in parallel
  let stats: ChessComPlayer['stats'] = {};
  try {
    const statsRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanUsername)}/stats`, {
      headers: {
        'User-Agent': 'GrandmasterStudioChessApp/1.0',
      },
    });
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      stats = {
        rapid: statsData.chess_rapid?.last?.rating,
        blitz: statsData.chess_blitz?.last?.rating,
        bullet: statsData.chess_bullet?.last?.rating,
        daily: statsData.chess_daily?.last?.rating,
        puzzle: statsData.tactics?.highest?.rating,
      };
    }
  } catch {
    // Non-critical if stats fail
  }

  const player: ChessComPlayer = {
    username: data.username,
    name: data.name,
    avatar: data.avatar,
    title: data.title,
    status: data.status,
    countryCode: data.country ? data.country.split('/').pop() : undefined,
    joined: data.joined,
    lastOnline: data.last_online,
    stats,
  };

  setInCache(cacheKey, player);
  return player;
}

export async function fetchChessComRecentGames(
  username: string,
  limit = 20
): Promise<{ player: ChessComPlayer; games: ChessComGame[] }> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) {
    throw new Error('Username required');
  }

  const cacheKey = `games_${cleanUsername}_${limit}`;
  const cached = getFromCache<{ player: ChessComPlayer; games: ChessComGame[] }>(cacheKey);
  if (cached) return cached;

  // 1. Verify Player Profile
  const player = await fetchChessComPlayer(cleanUsername);

  // 2. Fetch Monthly Archives List
  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(cleanUsername)}/games/archives`,
    {
      headers: {
        'User-Agent': 'GrandmasterStudioChessApp/1.0',
      },
    }
  );

  if (!archivesRes.ok) {
    if (archivesRes.status === 429) {
      throw new Error('Chess.com API rate limit reached. Please wait a moment.');
    }
    throw new Error('Could not fetch player game archives.');
  }

  const archivesData = await archivesRes.json();
  const archives: string[] = archivesData.archives || [];

  if (archives.length === 0) {
    const result = { player, games: [] };
    setInCache(cacheKey, result);
    return result;
  }

  // Fetch the most recent archives first (up to last 2 months if needed to satisfy limit)
  const rawGames: any[] = [];
  const recentArchives = archives.slice(-2).reverse();

  for (const archiveUrl of recentArchives) {
    try {
      const monthRes = await fetch(archiveUrl, {
        headers: {
          'User-Agent': 'GrandmasterStudioChessApp/1.0',
        },
      });
      if (monthRes.ok) {
        const monthData = await monthRes.json();
        const monthGames: any[] = monthData.games || [];
        // Newer games are at the end of the month array, so we reverse it
        rawGames.push(...monthGames.reverse());
        if (rawGames.length >= limit) break;
      }
    } catch (err) {
      console.warn('Error fetching month archive:', archiveUrl, err);
    }
  }

  // Slice to limit
  const selectedGames = rawGames.slice(0, limit);

  const formattedGames: ChessComGame[] = selectedGames.map((g, idx) => {
    const isWhite = g.white.username.toLowerCase() === cleanUsername;
    const userColor: 'white' | 'black' = isWhite ? 'white' : 'black';
    const userResultCode = isWhite ? g.white.result : g.black.result;
    const userResult = determineUserResult(userResultCode);
    const opponent = isWhite ? g.black : g.white;
    const dateStr = g.end_time
      ? new Date(g.end_time * 1000).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Recent';

    const openingName = parseOpeningFromPgn(g.pgn || '', g.eco);
    const movesCount = parseMovesCountFromPgn(g.pgn || '');

    return {
      id: g.url ? g.url.split('/').pop() || `game_${idx}` : `game_${idx}`,
      url: g.url || '',
      pgn: g.pgn || '',
      white: {
        username: g.white.username,
        rating: g.white.rating || 0,
        result: g.white.result,
      },
      black: {
        username: g.black.username,
        rating: g.black.rating || 0,
        result: g.black.result,
      },
      timeControl: formatTimeControl(g.time_control, g.time_class),
      timeClass: g.time_class || 'standard',
      endTime: g.end_time || 0,
      date: dateStr,
      openingName,
      eco: g.eco,
      userResult,
      userColor,
      opponentName: opponent.username,
      opponentRating: opponent.rating || 0,
      movesCount,
    };
  });

  const result = { player, games: formattedGames };
  setInCache(cacheKey, result);
  return result;
}
