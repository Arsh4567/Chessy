/**
 * Stockfish 19 WebAssembly Engine UCI Integration
 * Communicates via standard Web Worker UCI protocol.
 */

export interface StockfishEvaluation {
  depth: number;
  scoreCp: number; // in centipawns (positive = white advantage)
  mate?: number; // moves to mate if detected
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
  private initPromise: Promise<boolean> | null = null;
  private readyCallbacks: (() => void)[] = [];

  // Active search tracking
  private isSearching: boolean = false;
  private currentSearchResolve: ((move: ParsedMove | null) => void) | null = null;
  private currentEvalResolve: ((evalResult: StockfishEvaluation) => void) | null = null;

  private latestEval: StockfishEvaluation = { depth: 0, scoreCp: 0 };
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
          resolve(false);
          return;
        }

        // Initialize Web Worker using the Stockfish script
        this.worker = new Worker('/stockfish-19-lite-single.js');

        this.worker.onmessage = (event: MessageEvent) => {
          this.handleWorkerMessage(String(event.data || ''));
        };

        this.worker.onerror = (err) => {
          console.error('[Stockfish] Worker error:', err);
        };

        // Send UCI handshake
        this.sendCommand('uci');
        this.sendCommand('isready');

        // Check ready callback
        const readyTimeout = setTimeout(() => {
          this.isReady = true;
          this.isInitializing = false;
          resolve(true);
        }, 1500);

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
        this.isInitializing = false;
        resolve(false);
      }
    });

    return this.initPromise;
  }

  public async ensureReady(): Promise<boolean> {
    if (this.isReady && this.worker) return true;
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
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private handleWorkerMessage(messageData: string) {
    // A single message from worker may contain multiple lines
    const lines = messageData.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Broadcast raw line
      this.rawListeners.forEach((l) => l(line));

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
          this.listeners.forEach((cb) => cb(parsed));
        }
      }

      // Parse bestmove
      if (line.startsWith('bestmove')) {
        this.isSearching = false;
        const parts = line.split(/\s+/);
        const rawUci = parts[1]; // e.g. "e1g1", "e7e8q"

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
      let scoreCp = 0;
      let mate: number | undefined = undefined;
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
            scoreCp = parseInt(parts[i + 2], 10);
          } else if (parts[i + 1] === 'mate' && parts[i + 2]) {
            mate = parseInt(parts[i + 2], 10);
            scoreCp = mate > 0 ? 10000 : -10000;
          }
        }
        if (parts[i] === 'pv') {
          for (let j = i + 1; j < parts.length; j++) {
            pvMoves.push(parts[j]);
          }
          break;
        }
      }

      let bestMove: { from: string; to: string; promotion?: string; rawUci?: string } | undefined = undefined;
      if (pvMoves.length > 0) {
        const parsed = parseUciMove(pvMoves[0]);
        if (parsed) {
          bestMove = parsed;
        }
      }

      return { depth, scoreCp, mate, bestMove, rawPv: pvMoves, nodes, nps, time };
    } catch {
      return null;
    }
  }

  /**
   * Set Stockfish engine skill level (0 to 20)
   */
  public setSkillLevel(skill: number) {
    const clamped = Math.max(0, Math.min(20, skill));
    this.sendCommand(`setoption name Skill Level value ${clamped}`);
  }

  /**
   * Request best move from Stockfish for a given FEN
   * Gives engine 7-10 seconds of full calculation without low-depth premature cutoff
   */
  public async getBestMove(
    fen: string,
    skillLevel: number = 10,
    depth: number = 24,
    movetimeMs: number = 8000
  ): Promise<ParsedMove | null> {
    await this.ensureReady();

    // If a previous search is still running, halt it and clear pending resolver
    if (this.isSearching) {
      this.currentSearchResolve = null;
      this.sendCommand('stop');
      await new Promise((r) => setTimeout(r, 60));
    }

    return new Promise<ParsedMove | null>((resolve) => {
      this.isSearching = true;

      // Timeout watchdog: allow movetimeMs + 4000ms buffer before forcing stop
      const timer = setTimeout(() => {
        if (this.currentSearchResolve === resolve) {
          this.sendCommand('stop');
        }
      }, movetimeMs + 4000);

      this.currentSearchResolve = (move) => {
        clearTimeout(timer);
        this.isSearching = false;
        resolve(move);
      };

      this.setSkillLevel(skillLevel);
      this.sendCommand(`position fen ${fen}`);
      // Send go movetime so Stockfish searches for the requested analysis time (e.g. 7000 - 10000ms)
      this.sendCommand(`go movetime ${movetimeMs}`);
    });
  }

  /**
   * Evaluates a position with Stockfish
   */
  public async evaluatePosition(fen: string, depth: number = 12): Promise<StockfishEvaluation> {
    await this.ensureReady();

    if (this.isSearching) {
      this.currentEvalResolve = null;
      this.sendCommand('stop');
      await new Promise((r) => setTimeout(r, 60));
    }

    return new Promise((resolve) => {
      this.isSearching = true;

      const timer = setTimeout(() => {
        if (this.currentEvalResolve === resolve) {
          this.sendCommand('stop');
        }
      }, 3500);

      this.currentEvalResolve = (evalResult) => {
        clearTimeout(timer);
        this.isSearching = false;
        resolve(evalResult);
      };

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }
}

// Global Singleton
export const stockfish = new StockfishEngine();
