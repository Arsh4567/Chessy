import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { LichessExplorerMove } from '../../utils/lichessExplorer';
import { StockfishEvaluation } from '../../utils/stockfishWorker';

interface UseLichessStockfishMatchProps {
  stockfishEval?: StockfishEvaluation;
  currentFen?: string;
  lichessFen?: string;
  moves: LichessExplorerMove[];
}

export function useLichessStockfishMatch({
  stockfishEval,
  currentFen,
  lichessFen,
  moves,
}: UseLichessStockfishMatchProps) {
  // Stockfish evaluation score display
  const stockfishScoreStr = useMemo(() => {
    if (!stockfishEval) return '+0.00';
    return (
      stockfishEval.displayEval ||
      (stockfishEval.evalPawns !== undefined
        ? `${stockfishEval.evalPawns > 0 ? '+' : ''}${stockfishEval.evalPawns.toFixed(2)}`
        : `${(stockfishEval.scoreCp / 100).toFixed(2)}`)
    );
  }, [stockfishEval]);

  // Normalize UCI string of Stockfish's suggested best move
  const bestMoveUci = useMemo(() => {
    if (!stockfishEval?.bestMove) return null;
    const bm: any = stockfishEval.bestMove;
    if (typeof bm === 'string') {
      const clean = bm.toLowerCase().replace(/[^a-h1-8qrbn]/gi, '');
      return clean.length >= 4 ? clean : null;
    }
    if (bm.rawUci) {
      return bm.rawUci.toLowerCase().trim();
    }
    if (bm.from && bm.to) {
      return `${bm.from}${bm.to}${bm.promotion || ''}`.toLowerCase().trim();
    }
    return null;
  }, [stockfishEval?.bestMove]);

  // Derive SAN string of Stockfish's suggested best move for clear matching and display
  const bestMoveSan = useMemo(() => {
    if (!stockfishEval?.bestMove) return null;
    const bm: any = stockfishEval.bestMove;
    if (typeof bm === 'string' && !/^[a-h][1-8][a-h][1-8]/.test(bm)) {
      return bm.trim();
    }
    const targetFen = currentFen || lichessFen;
    if (!targetFen) return null;
    try {
      const c = new Chess(targetFen);
      if (bm.from && bm.to) {
        const res = c.move({
          from: bm.from,
          to: bm.to,
          promotion: bm.promotion,
        });
        return res ? res.san : null;
      } else if (bestMoveUci && bestMoveUci.length >= 4) {
        const res = c.move({
          from: bestMoveUci.substring(0, 2),
          to: bestMoveUci.substring(2, 4),
          promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined,
        });
        return res ? res.san : null;
      }
    } catch {
      return null;
    }
    return null;
  }, [stockfishEval?.bestMove, currentFen, lichessFen, bestMoveUci]);

  // Check if a move matches the latest stockfishEval bestMove with robust UCI, SAN, and normalized matching
  const isMatchBestMove = (m: LichessExplorerMove): boolean => {
    if (!stockfishEval?.bestMove) return false;
    const bm: any = stockfishEval.bestMove;

    // 1. Direct UCI match
    if (m.uci && bestMoveUci) {
      if (m.uci.toLowerCase().trim() === bestMoveUci.toLowerCase().trim()) return true;
    }

    // 2. Direct SAN match
    if (m.san && bestMoveSan) {
      const cleanMSan = m.san.replace(/[+#x!?-]/g, '').trim();
      const cleanBMSan = bestMoveSan.replace(/[+#x!?-]/g, '').trim();
      if (cleanMSan === cleanBMSan || m.san.trim() === bestMoveSan.trim()) return true;
    }

    // 3. Coordinate match with bm object
    if (m.uci && bm.from && bm.to) {
      const expectedUci = `${bm.from}${bm.to}${bm.promotion || ''}`.toLowerCase();
      if (m.uci.toLowerCase().trim() === expectedUci) return true;
    }

    // 4. Raw PV first move match
    if (stockfishEval.rawPv && stockfishEval.rawPv.length > 0) {
      const pvFirst = stockfishEval.rawPv[0]?.toLowerCase().trim();
      if (m.uci && m.uci.toLowerCase().trim() === pvFirst) return true;
      if (m.san && pvFirst && m.san.toLowerCase() === pvFirst) return true;
    }

    // 5. Fallback string match
    if (typeof bm === 'string') {
      const str = bm.trim().toLowerCase();
      if (m.san?.toLowerCase().trim() === str || m.uci?.toLowerCase().trim() === str) {
        return true;
      }
    }

    return false;
  };

  const matchingMasterMove = useMemo(() => {
    return moves.find((m) => isMatchBestMove(m));
  }, [moves, stockfishEval?.bestMove, bestMoveUci, bestMoveSan]);

  const bestMoveDisplay = bestMoveSan || bestMoveUci;

  return {
    stockfishScoreStr,
    bestMoveUci,
    bestMoveSan,
    bestMoveDisplay,
    isMatchBestMove,
    matchingMasterMove,
  };
}
