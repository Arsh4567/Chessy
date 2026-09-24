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

  constructor() {
    this.init();
  }

  public init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    this.isInitializing = true;

    this.initPromise = new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
          this.workerFailed = true;
          this.isReady = true;
          resolve(false);
          return;
        }

        // Initialize Web Worker using the Stockfish script with explicit wasm target
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

        // Send UCI handshake
        this.sendCommand('uci');
        this.sendCommand('isready');

        // Check ready callback with 2000ms timeout
        const readyTimeout = setTimeout(() => {
          this.isReady = true;
          this.isInitializing = false;
          resolve(true);
        }, 2000);

        const onFirstReady = (line: string) => {
          if (line.includes('readyok') || line.includes('uciok')) {
            clearTimeout(readyTimeout);
            this.isReady = true;
            this.isInitializing = false;
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

  public async stopActiveSearch(): Promise<void> {
    if (!this.isSearching || !this.worker || this.workerFailed) {
      this.isSearching = false;
      return;
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          this.isSearching = false;
          this.rawListeners = this.rawListeners.filter((l) => l !== onMoveOrReady);
          resolve();
        }
      };

      const timer = setTimeout(finish, 200);

      const onMoveOrReady = (line: string) => {
        if (line.startsWith('bestmove') || line.includes('readyok')) {
          clearTimeout(timer);
          finish();
        }
      };

      this.rawListeners.push(onMoveOrReady);
      this.sendCommand('stop');
    });
  }

  private handleWorkerMessage(messageData: string) {
    const lines = messageData.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Broadcast raw line to subscribers
      this.rawListeners.forEach((l) => {
        try {
          l(line);
        } catch {
          // ignore subscriber errors
        }
      });

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
          this.listeners.forEach((cb) => {
            try {
              cb(parsed);
            } catch {
              // ignore
            }
          });
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
    depth: number = 24,
    movetimeMs: number = 5000
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
          }, movetimeMs + 3000);

          this.currentSearchResolve = (move) => {
            clearTimeout(timer);
            this.isSearching = false;
            resolve(move);
          };

          this.setSkillLevel(skillLevel);
          this.sendCommand(`position fen ${fen}`);
          this.sendCommand(`go movetime ${movetimeMs}`);
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
   * Evaluates a position with Stockfish with guaranteed serialization and fallback
   */
  public async evaluatePosition(fen: string, depth: number = 12): Promise<StockfishEvaluation> {
    const run = async (): Promise<StockfishEvaluation> => {
      try {
        await this.ensureReady();
        if (this.workerFailed || !this.worker) {
          return this.computeFallbackEval(fen);
        }

        // Conclude any prior active search before sending new position
        await this.stopActiveSearch();

        this.currentFen = fen;
        const parts = fen.trim().split(/\s+/);
        this.currentSideToMove = parts.length > 1 && parts[1] === 'b' ? 'b' : 'w';

        return await new Promise<StockfishEvaluation>((resolve) => {
          this.isSearching = true;

          const timer = setTimeout(async () => {
            if (this.currentEvalResolve === resolve) {
              await this.stopActiveSearch();
              resolve(this.latestEval.depth > 0 ? this.latestEval : this.computeFallbackEval(fen));
            }
          }, 3000);

          this.currentEvalResolve = (evalResult) => {
            clearTimeout(timer);
            this.isSearching = false;
            resolve(evalResult);
          };

          this.sendCommand(`position fen ${fen}`);
          this.sendCommand(`go depth ${depth}`);
        });
      } catch (err) {
        console.warn('Stockfish evaluation failed, returning fallback:', err);
        return this.computeFallbackEval(fen);
      }
    };

    const task = this.evalQueue.then(run, run);
    this.evalQueue = task.catch(() => this.computeFallbackEval(fen));
    return task;
  }
}

// Global Singleton
export const stockfish = new StockfishEngine();
