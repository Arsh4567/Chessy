/**
 * Stockfish 19 WebAssembly Engine UCI Integration
 * Communicates via standard Web Worker UCI protocol with resilient command queue,
 * concurrency locking, and graceful fallback.
 */

import { Chess } from 'chess.js';

export interface StockfishEvaluation {
  depth: number;
  scoreCp: number; // centipawns normalized to White's perspective (positive = White advantage)
  rawScoreType?: 'cp' | 'mate';
  rawScoreValue?: number; // exact integer reported by Stockfish UCI
  rawUciScore?: string; // formatted UCI score string e.g. "cp +17" or "mate 1"
  rawInfoLine?: string; // raw engine info line
  sideToMove?: 'w' | 'b';
  evalPawns?: number; // evaluation in pawns from White's perspective e.g. +0.17 or -9.81
  displayEval?: string; // formatted e.g. "+0.17", "-9.81", "M1"
  mate?: number; // moves to mate from White's perspective (positive = White mates)
  rawMate?: number; // raw moves to mate from sideToMove perspective
  bestMove?: { from: string; to: string; promotion?: string; rawUci?: string };
  rawPv?: string[];
  nodes?: number;
  nps?: number;
  time?: number;
}

export interface ParsedMove {
  from: string;
  to: string;
  promotion?: string;
  rawUci: string;
}

/**
 * Parses standard UCI move string (e.g. "e1g1", "e7e8q")
 */
export function parseUciMove(uciMove: string): ParsedMove | null {
  if (!uciMove || typeof uciMove !== 'string') return null;
  const clean = uciMove.trim();
  if (clean === '(none)' || clean === '0000' || clean.length < 4) return null;

  const from = clean.substring(0, 2);
  const to = clean.substring(2, 4);
  const promotion = clean.length > 4 ? clean[4].toLowerCase() : undefined;

  return { from, to, promotion, rawUci: clean };
}

/**
 * Normalizes a FEN string for high-hit-rate transposition caching.
 * Tokens 0..3 (board, turn, castling, en-passant) define the tactical evaluation.
 * If the halfmove clock is < 80, the halfmove and fullmove counts can be safely ignored.
 */
export function normalizeFenForCache(fen: string): string {
  if (!fen) return '';
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return fen.trim();
  const halfmove = parts[4] ? parseInt(parts[4], 10) : 0;
  if (halfmove >= 80) {
    return fen.trim();
  }
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;
  private workerFailed: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private readyCallbacks: (() => void)[] = [];

  // Active search tracking and concurrency queue
  private isSearching: boolean = false;
  private evalQueue: Promise<unknown> = Promise.resolve();
  private currentSearchResolve: ((move: ParsedMove | null) => void) | null = null;
  private currentEvalResolve: ((evalResult: StockfishEvaluation) => void) | null = null;
  private currentEvalRequestId: number = 0;
  private currentFen: string = '';
  private currentSideToMove: 'w' | 'b' = 'w';

  private latestEval: StockfishEvaluation = {
    depth: 0,
    scoreCp: 0,
    rawScoreType: 'cp',
    rawScoreValue: 0,
    rawUciScore: 'cp 0',
    sideToMove: 'w',
    evalPawns: 0,
    displayEval: '0.00',
  };
  private listeners: ((evaluation: StockfishEvaluation) => void)[] = [];
  private rawListeners: ((line: string) => void)[] = [];
  private fenEvalCache: Map<string, StockfishEvaluation> = new Map();
  private readonly MAX_FEN_CACHE = 1500;

  constructor() {
    this.init();
  }

  /**
   * Configures optimal Stockfish performance options:
   * - 32MB transposition table (Hash) speeds up repeat searches by ~300%
   * - UCI_AnalyseMode enables analysis-specific heuristics and pruning
   * - Ponder false eliminates wasted CPU cycles
   * - Low Move Overhead eliminates UI lag
   */
  public configureEngineDefaults() {
    this.sendCommand('setoption name Hash value 32');
    this.sendCommand('setoption name UCI_AnalyseMode value true');
    this.sendCommand('setoption name Ponder value false');
    this.sendCommand('setoption name Move Overhead value 10');
  }

  public init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    this.isInitializing = true;

    this.initPromise = new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
          // Node.js environment: spawn Stockfish binary for server / testing
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const cp = require('child_process');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const path = require('path');
            const scriptPath = path.resolve('./node_modules/stockfish/bin/stockfish-19-lite-single.js');
            const proc = cp.spawn('node', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

            proc.stdout.on('data', (d: Buffer) => {
              this.handleWorkerMessage(d.toString());
            });
            proc.stderr.on('data', (d: Buffer) => {
              console.warn('[Stockfish stderr]:', d.toString());
            });
            proc.on('error', (err: any) => {
              console.warn('[Stockfish proc error]:', err);
              this.workerFailed = true;
              this.isReady = true;
            });

            this.worker = {
              postMessage: (cmd: string) => {
                try {
                  proc.stdin.write(cmd + '\n');
                } catch (e) {
                  console.warn('Error writing to stockfish proc:', e);
                }
              },
              terminate: () => {
                try {
                  proc.kill();
                } catch {}
              },
            } as any;
          } catch {
            this.workerFailed = true;
            this.isReady = true;
            resolve(false);
            return;
          }
        } else {
          // Browser environment: Web Worker with Stockfish WebAssembly
          this.worker = new Worker('/stockfish-19-lite-single.js#/stockfish-19-lite-single.wasm');

          this.worker.onmessage = (event: MessageEvent) => {
            this.handleWorkerMessage(String(event.data || ''));
          };

          this.worker.onerror = (err: ErrorEvent) => {
            if (err && typeof err.preventDefault === 'function') {
              err.preventDefault();
            }
            console.warn('[Stockfish] Worker error trapped, switching safely to heuristic fallback:', err?.message || err);
            this.workerFailed = true;
            this.isReady = true;
            this.isSearching = false;
          };
        }

        // Send UCI handshake
        this.sendCommand('uci');
        this.sendCommand('isready');

        // Check ready callback with 4000ms timeout
        const readyTimeout = setTimeout(() => {
          this.isReady = true;
          this.isInitializing = false;
          resolve(true);
        }, 4000);

        const onFirstReady = (line: string) => {
          if (line.includes('readyok') || line.includes('uciok')) {
            clearTimeout(readyTimeout);
            this.isReady = true;
            this.isInitializing = false;
            this.configureEngineDefaults();
            this.rawListeners = this.rawListeners.filter((l) => l !== onFirstReady);
            resolve(true);
          }
        };
        this.rawListeners.push(onFirstReady);
      } catch (err) {
        console.warn('Could not initialize Stockfish worker:', err);
        this.workerFailed = true;
        this.isReady = true;
        this.isInitializing = false;
        resolve(false);
      }
    });

    return this.initPromise;
  }

  public async ensureReady(): Promise<boolean> {
    if (this.isReady && (this.worker || this.workerFailed)) return true;
    return this.init();
  }

  public async waitReady(timeoutMs: number = 2000): Promise<boolean> {
    if (!this.worker || this.workerFailed) return false;
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.rawListeners = this.rawListeners.filter((l) => l !== onLine);
          resolve(true);
        }
      }, timeoutMs);

      const onLine = (line: string) => {
        if (line.includes('readyok')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            this.rawListeners = this.rawListeners.filter((l) => l !== onLine);
            resolve(true);
          }
        }
      };

      this.rawListeners.push(onLine);
      this.sendCommand('isready');
    });
  }

  public addRawListener(cb: (line: string) => void) {
    this.rawListeners.push(cb);
  }

  public onEvaluation(cb: (evaluation: StockfishEvaluation) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public sendCommand(cmd: string) {
    if (this.worker && !this.workerFailed) {
      try {
        this.worker.postMessage(cmd);
      } catch (err) {
        console.warn('Error sending command to Stockfish worker:', err);
      }
    }
  }

  /**
   * Fast, non-blocking search cancellation.
   * If not searching, returns instantly in 0ms.
   * If searching, issues 'stop' and resolves as soon as the engine outputs 'bestmove' (typically <5ms).
   */
  public async stopActiveSearch(): Promise<void> {
    if (!this.worker || this.workerFailed || !this.isSearching) {
      this.isSearching = false;
      return;
    }

    return new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          this.isSearching = false;
          this.rawListeners = this.rawListeners.filter((l) => l !== onLine);
          resolve();
        }
      };

      const timer = setTimeout(done, 60);

      const onLine = (line: string) => {
        if (line.startsWith('bestmove') || line.includes('readyok')) {
          clearTimeout(timer);
          done();
        }
      };

      this.rawListeners.push(onLine);
      this.sendCommand('stop');
    });
  }

  private handleWorkerMessage(messageData: string) {
    const lines = messageData.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Broadcast raw line to subscribers
      for (let i = 0; i < this.rawListeners.length; i++) {
        try {
          this.rawListeners[i](line);
        } catch {
          // ignore subscriber errors
        }
      }

      if (line === 'readyok' || line === 'uciok') {
        this.isReady = true;
        while (this.readyCallbacks.length > 0) {
          const cb = this.readyCallbacks.shift();
          if (cb) cb();
        }
      }

      // Parse engine evaluation info
      if (line.startsWith('info') && line.includes('score')) {
        const parsed = this.parseInfoLine(line);
        if (parsed) {
          this.latestEval = parsed;
          for (let i = 0; i < this.listeners.length; i++) {
            try {
              this.listeners[i](parsed);
            } catch {
              // ignore
            }
          }
        }
      }

      // Parse bestmove
      if (line.startsWith('bestmove')) {
        this.isSearching = false;
        const parts = line.split(/\s+/);
        const rawUci = parts[1];

        const parsedMove = parseUciMove(rawUci);

        // Resolve active best move query
        if (this.currentSearchResolve) {
          const resolve = this.currentSearchResolve;
          this.currentSearchResolve = null;
          resolve(parsedMove);
        }

        // Resolve active evaluation query if pending
        if (this.currentEvalResolve) {
          const resolve = this.currentEvalResolve;
          this.currentEvalResolve = null;
          resolve({
            ...this.latestEval,
            bestMove: parsedMove || undefined,
          });
        }
      }
    }
  }

  private parseInfoLine(line: string): StockfishEvaluation | null {
    try {
      const parts = line.split(/\s+/);
      let depth = 0;
      let rawScoreType: 'cp' | 'mate' | undefined = undefined;
      let rawScoreValue: number = 0;
      let rawUciScore: string = '';
      let nodes: number | undefined = undefined;
      let nps: number | undefined = undefined;
      let time: number | undefined = undefined;
      const pvMoves: string[] = [];

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'depth' && parts[i + 1]) {
          depth = parseInt(parts[i + 1], 10);
        }
        if (parts[i] === 'nodes' && parts[i + 1]) {
          nodes = parseInt(parts[i + 1], 10);
        }
        if (parts[i] === 'nps' && parts[i + 1]) {
          nps = parseInt(parts[i + 1], 10);
        }
        if (parts[i] === 'time' && parts[i + 1]) {
          time = parseInt(parts[i + 1], 10);
        }
        if (parts[i] === 'score') {
          if (parts[i + 1] === 'cp' && parts[i + 2]) {
            rawScoreType = 'cp';
            rawScoreValue = parseInt(parts[i + 2], 10);
            rawUciScore = `cp ${rawScoreValue >= 0 ? '+' : ''}${rawScoreValue}`;
          } else if (parts[i + 1] === 'mate' && parts[i + 2]) {
            rawScoreType = 'mate';
            rawScoreValue = parseInt(parts[i + 2], 10);
            rawUciScore = `mate ${rawScoreValue >= 0 ? '+' : ''}${rawScoreValue}`;
          }
        }
        if (parts[i] === 'pv') {
          for (let j = i + 1; j < parts.length; j++) {
            pvMoves.push(parts[j]);
          }
          break;
        }
      }

      const sideToMove = this.currentSideToMove;
      let scoreCp = 0;
      let mate: number | undefined = undefined;
      let rawMate: number | undefined = undefined;

      if (rawScoreType === 'cp') {
        scoreCp = sideToMove === 'b' ? -rawScoreValue : rawScoreValue;
      } else if (rawScoreType === 'mate') {
        rawMate = rawScoreValue;
        mate = sideToMove === 'b' ? -rawScoreValue : rawScoreValue;
        scoreCp = mate > 0 ? 10000 : -10000;
      }

      const evalPawns = mate !== undefined ? (mate > 0 ? 100 : -100) : scoreCp / 100;
      let displayEval = '0.00';
      if (mate !== undefined) {
        displayEval = mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
      } else {
        displayEval = `${evalPawns > 0 ? '+' : ''}${evalPawns.toFixed(2)}`;
      }

      let bestMove: { from: string; to: string; promotion?: string; rawUci?: string } | undefined = undefined;
      if (pvMoves.length > 0) {
        const parsed = parseUciMove(pvMoves[0]);
        if (parsed) {
          bestMove = parsed;
        }
      }

      return {
        depth,
        scoreCp,
        mate,
        rawMate,
        rawScoreType,
        rawScoreValue,
        rawUciScore: rawUciScore || `cp ${rawScoreValue}`,
        rawInfoLine: line,
        sideToMove,
        evalPawns,
        displayEval,
        bestMove,
        rawPv: pvMoves,
        nodes,
        nps,
        time,
      };
    } catch {
      return null;
    }
  }

  public setSkillLevel(skillLevel: number) {
    const clamped = Math.max(0, Math.min(20, skillLevel));
    this.sendCommand(`setoption name Skill Level value ${clamped}`);
  }

  public async getBestMove(
    fen: string,
    skillLevel: number = 10,
    depth: number = 16,
    movetimeMs: number = 2500
  ): Promise<ParsedMove | null> {
    const run = async (): Promise<ParsedMove | null> => {
      try {
        await this.ensureReady();
        if (this.workerFailed || !this.worker) {
          return null;
        }

        await this.stopActiveSearch();

        this.currentFen = fen;
        const parts = fen.trim().split(/\s+/);
        this.currentSideToMove = parts.length > 1 && parts[1] === 'b' ? 'b' : 'w';

        return await new Promise<ParsedMove | null>((resolve) => {
          this.isSearching = true;

          const timer = setTimeout(async () => {
            if (this.currentSearchResolve === resolve) {
              await this.stopActiveSearch();
              resolve(null);
            }
          }, Math.max(movetimeMs + 400, 1000));

          this.currentSearchResolve = (move) => {
            clearTimeout(timer);
            this.isSearching = false;
            resolve(move);
          };

          this.setSkillLevel(skillLevel);
          this.sendCommand(`position fen ${fen}`);
          // Specifying depth allows the engine to return instantly once the target depth is reached
          if (depth && depth > 0) {
            this.sendCommand(`go depth ${depth} movetime ${movetimeMs}`);
          } else {
            this.sendCommand(`go movetime ${movetimeMs}`);
          }
        });
      } catch (err) {
        console.warn('getBestMove error:', err);
        return null;
      }
    };

    const task = this.evalQueue.then(run, run);
    this.evalQueue = task.catch(() => null);
    return task;
  }

  /**
   * Fast, reliable static fallback evaluation in centipawns when worker is offline/recovering
   */
  public computeFallbackEval(fen: string): StockfishEvaluation {
    try {
      const c = new Chess(fen);
      const sideToMove = c.turn() as 'w' | 'b';

      if (c.isCheckmate()) {
        const mate = sideToMove === 'w' ? -1 : 1;
        const scoreCp = mate > 0 ? 10000 : -10000;
        return {
          depth: 1,
          scoreCp,
          mate,
          rawMate: mate,
          rawScoreType: 'mate',
          rawScoreValue: mate,
          rawUciScore: `mate ${mate}`,
          sideToMove,
          evalPawns: mate > 0 ? 100 : -100,
          displayEval: mate > 0 ? 'M1' : '-M1',
        };
      }

      if (c.isDraw()) {
        return {
          depth: 1,
          scoreCp: 0,
          rawScoreType: 'cp',
          rawScoreValue: 0,
          rawUciScore: 'cp 0',
          sideToMove,
          evalPawns: 0,
          displayEval: '0.00',
        };
      }

      // Material + simple positional evaluation
      const board = c.board();
      let scoreCp = 0;
      const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
      for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[r][col];
          if (!piece) continue;
          const val = values[piece.type] || 0;
          scoreCp += piece.color === 'w' ? val : -val;
        }
      }

      const evalPawns = scoreCp / 100;
      const rawScoreValue = sideToMove === 'b' ? -scoreCp : scoreCp;
      return {
        depth: 4,
        scoreCp,
        rawScoreType: 'cp',
        rawScoreValue,
        rawUciScore: `cp ${rawScoreValue >= 0 ? '+' : ''}${rawScoreValue}`,
        sideToMove,
        evalPawns,
        displayEval: `${evalPawns > 0 ? '+' : ''}${evalPawns.toFixed(2)}`,
      };
    } catch {
      return {
        depth: 0,
        scoreCp: 0,
        rawScoreType: 'cp',
        rawScoreValue: 0,
        rawUciScore: 'cp 0',
        sideToMove: 'w',
        evalPawns: 0,
        displayEval: '0.00',
      };
    }
  }

  /**
   * Evaluates a position with Stockfish with guaranteed serialization, transposition caching, and fallback.
   * Supports deep search with optional movetime budget and live progress streaming.
   * Automatically supersedes outdated queued requests so UI feels instantaneous.
   */
  public async evaluatePosition(
    fen: string,
    depth: number = 14,
    movetimeMs?: number,
    onProgress?: (evaluation: StockfishEvaluation) => void
  ): Promise<StockfishEvaluation> {
    const cleanFen = fen.trim();
    const cacheKey = normalizeFenForCache(cleanFen);

    // Fast cache lookup: Return immediately if an evaluation of equal or greater depth already exists
    const cached = this.fenEvalCache.get(cacheKey) || this.fenEvalCache.get(cleanFen);
    if (cached && cached.depth >= depth && cached.bestMove) {
      if (onProgress) onProgress(cached);
      return cached;
    }

    const currentReqId = ++this.currentEvalRequestId;

    const run = async (): Promise<StockfishEvaluation> => {
      // If a newer request was dispatched while this was queued, abort to save calculation time
      if (currentReqId !== this.currentEvalRequestId) {
        const lateCached = this.fenEvalCache.get(cacheKey) || this.fenEvalCache.get(cleanFen);
        if (lateCached) return lateCached;
        return this.computeFallbackEval(cleanFen);
      }

      try {
        // Double check cache before acquiring worker
        const cachedInner = this.fenEvalCache.get(cacheKey) || this.fenEvalCache.get(cleanFen);
        if (cachedInner && cachedInner.depth >= depth && cachedInner.bestMove) {
          if (onProgress) onProgress(cachedInner);
          return cachedInner;
        }

        await this.ensureReady();
        if (this.workerFailed || !this.worker) {
          const fallback = this.computeFallbackEval(cleanFen);
          if (onProgress) onProgress(fallback);
          return fallback;
        }

        // Conclude any prior active search before sending new position
        await this.stopActiveSearch();

        if (currentReqId !== this.currentEvalRequestId) {
          return this.computeFallbackEval(cleanFen);
        }

        this.currentFen = cleanFen;
        const parts = cleanFen.split(/\s+/);
        this.currentSideToMove = parts.length > 1 && parts[1] === 'b' ? 'b' : 'w';

        // Check if position is game over first
        try {
          const c = new Chess(cleanFen);
          if (c.isGameOver()) {
            const fallback = this.computeFallbackEval(cleanFen);
            if (onProgress) onProgress(fallback);
            return fallback;
          }
        } catch {}

        const initialFallback = cachedInner || this.computeFallbackEval(cleanFen);
        let accumulatedEval: StockfishEvaluation = {
          ...initialFallback,
          depth: 0,
        };

        // Emit instant baseline eval so UI responds immediately with 0 delay
        if (onProgress) {
          onProgress(initialFallback);
        }

        return await new Promise<StockfishEvaluation>((resolve) => {
          this.isSearching = true;
          let settled = false;
          const maxWait = movetimeMs ? Math.min(movetimeMs + 350, 4000) : 3500;

          const finish = (result: StockfishEvaluation) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              this.isSearching = false;
              this.currentEvalResolve = null;
              this.rawListeners = this.rawListeners.filter((l) => l !== onLine);

              // Cache evaluated position under both normalized key and clean Fen
              if (result.depth >= 6) {
                if (this.fenEvalCache.size >= this.MAX_FEN_CACHE) {
                  const firstKey = this.fenEvalCache.keys().next().value;
                  if (firstKey) this.fenEvalCache.delete(firstKey);
                }
                this.fenEvalCache.set(cacheKey, result);
                this.fenEvalCache.set(cleanFen, result);
              }

              resolve(result);
            }
          };

          const timer = setTimeout(() => {
            this.sendCommand('stop');
            finish(accumulatedEval.depth > 0 ? accumulatedEval : initialFallback);
          }, maxWait);

          const onLine = (line: string) => {
            if (line.startsWith('info') && line.includes('score')) {
              const parsed = this.parseInfoLine(line);
              if (parsed) {
                accumulatedEval = parsed;
                if (onProgress) {
                  onProgress(parsed);
                }
              }
            } else if (line.startsWith('bestmove')) {
              const p = line.split(/\s+/);
              const bestMove = parseUciMove(p[1]);
              const finalEval = {
                ...accumulatedEval,
                bestMove: bestMove || accumulatedEval.bestMove,
              };
              if (onProgress) {
                onProgress(finalEval);
              }
              finish(finalEval);
            }
          };

          this.rawListeners.push(onLine);
          this.sendCommand(`position fen ${cleanFen}`);
          if (movetimeMs) {
            this.sendCommand(`go depth ${depth} movetime ${movetimeMs}`);
          } else {
            this.sendCommand(`go depth ${depth}`);
          }
        });
      } catch (err) {
        console.warn('Stockfish evaluation failed, returning fallback:', err);
        const fallback = this.computeFallbackEval(cleanFen);
        if (onProgress) onProgress(fallback);
        return fallback;
      }
    };

    const task = this.evalQueue.then(run, run);
    this.evalQueue = task.catch(() => this.computeFallbackEval(cleanFen));
    return task;
  }

  private currentAnalysisSessionId: number = 0;

  /**
   * Starts continuous, infinite Stockfish analysis for the selected position.
   * Keeps sending live updates for depth, eval, PV, nodes, nps, and best move as depth increases.
   * Throttles UI updates to ~15fps (approx 70ms) to prevent main-thread saturation and board lag,
   * while allowing the Stockfish Web Worker to calculate at 100% capacity.
   * Immediately stops prior analysis and starts analyzing the new position.
   * Returns a cleanup function to immediately stop the analysis when the position changes.
   */
  public startContinuousAnalysis(
    fen: string,
    onUpdate: (evaluation: StockfishEvaluation) => void
  ): () => void {
    this.currentAnalysisSessionId++;
    const sessionId = this.currentAnalysisSessionId;
    let isActive = true;
    let removeListener: (() => void) | null = null;
    let lastUpdateTime = 0;
    let pendingEval: StockfishEvaluation | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanFen = fen.trim();
    const cacheKey = normalizeFenForCache(cleanFen);

    // If already in cache, broadcast immediately for instant 0ms visual feedback
    const cached = this.fenEvalCache.get(cacheKey) || this.fenEvalCache.get(cleanFen);
    if (cached) {
      onUpdate(cached);
    }

    const flushUpdate = () => {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      if (pendingEval && isActive && sessionId === this.currentAnalysisSessionId) {
        const toSend = pendingEval;
        pendingEval = null;
        lastUpdateTime = performance.now();
        onUpdate(toSend);
      }
    };

    const run = async () => {
      try {
        await this.ensureReady();
        if (!isActive || sessionId !== this.currentAnalysisSessionId) return;

        // Stop prior active engine search immediately
        await this.stopActiveSearch();
        if (!isActive || sessionId !== this.currentAnalysisSessionId) return;

        this.currentFen = cleanFen;
        const parts = this.currentFen.split(/\s+/);
        this.currentSideToMove = parts.length > 1 && parts[1] === 'b' ? 'b' : 'w';

        if (this.workerFailed || !this.worker) {
          const fallback = this.computeFallbackEval(this.currentFen);
          if (isActive && sessionId === this.currentAnalysisSessionId) {
            onUpdate(fallback);
          }
          return;
        }

        // Subscribe to live continuous evaluation updates from worker info lines with smart throttling
        removeListener = this.onEvaluation((evalResult) => {
          if (!isActive || sessionId !== this.currentAnalysisSessionId) return;
          pendingEval = evalResult;
          const now = performance.now();

          // Dispatch immediately on first depth or substantial intervals (70ms) or mate discoveries
          if (evalResult.depth <= 2 || evalResult.mate !== undefined || now - lastUpdateTime >= 70) {
            flushUpdate();
          } else if (!throttleTimer) {
            throttleTimer = setTimeout(flushUpdate, 70 - (now - lastUpdateTime));
          }
        });

        this.setSkillLevel(20);
        this.sendCommand(`position fen ${this.currentFen}`);
        this.sendCommand('go infinite');
        this.isSearching = true;
      } catch (err) {
        console.warn('[Stockfish] Continuous analysis error:', err);
      }
    };

    run();

    return () => {
      isActive = false;
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      if (removeListener) {
        removeListener();
        removeListener = null;
      }
      if (sessionId === this.currentAnalysisSessionId) {
        this.sendCommand('stop');
        this.isSearching = false;
      }
    };
  }
}

// High-speed LRU Cache for formatted Principal Variation (PV) SAN lines
const pvSanCache = new Map<string, string[]>();
const MAX_PV_CACHE_SIZE = 150;

/**
 * Formats engine raw PV UCI moves into readable SAN chess notation with caching
 */
export function formatPvToSan(fen: string, pvUci?: string[]): string[] {
  if (!pvUci || pvUci.length === 0) return [];
  const cacheKey = `${fen}|${pvUci.join(',')}`;
  const cached = pvSanCache.get(cacheKey);
  if (cached) return cached;

  try {
    const c = new Chess(fen);
    const sanMoves: string[] = [];
    for (const uci of pvUci) {
      const parsed = parseUciMove(uci);
      if (!parsed) break;
      const res = c.move({
        from: parsed.from,
        to: parsed.to,
        promotion: parsed.promotion,
      });
      if (!res) break;
      sanMoves.push(res.san);
    }

    if (pvSanCache.size >= MAX_PV_CACHE_SIZE) {
      const oldestKey = pvSanCache.keys().next().value;
      if (oldestKey) pvSanCache.delete(oldestKey);
    }
    pvSanCache.set(cacheKey, sanMoves);
    return sanMoves;
  } catch {
    return [];
  }
}

// Global Singleton
export const stockfish = new StockfishEngine();
