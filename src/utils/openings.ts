import { Chess } from 'chess.js';

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
}

export const OPENINGS_DATABASE: OpeningInfo[] = [
  // Starting position & single first moves
  { eco: 'A00', name: 'Starting Position', moves: '' },
  { eco: 'B00', name: "King's Pawn Opening", moves: 'e4' },
  { eco: 'A40', name: "Queen's Pawn Opening", moves: 'd4' },
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A02', name: "Bird's Opening", moves: 'f4' },
  { eco: 'A01', name: 'Nimzo-Larsen Attack', moves: 'b3' },
  { eco: 'A00', name: 'Hungarian Opening', moves: 'g3' },

  // Open Game (1. e4 e5)
  { eco: 'C20', name: 'King\'s Pawn Game', moves: 'e4 e5' },
  { eco: 'C40', name: 'King\'s Knight Opening', moves: 'e4 e5 Nf3' },
  { eco: 'C44', name: 'King\'s Pawn Game', moves: 'e4 e5 Nf3 Nc6' },
  { eco: 'C50', name: 'Italian Game', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { eco: 'C50', name: 'Italian Game: Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5' },
  { eco: 'C55', name: 'Italian Game: Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6' },
  { eco: 'C60', name: 'Ruy Lopez', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { eco: 'C70', name: 'Ruy Lopez: Morphy Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6' },
  { eco: 'C88', name: 'Ruy Lopez: Closed Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7' },
  { eco: 'C45', name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4' },
  { eco: 'C46', name: 'Four Knights Game', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6' },
  { eco: 'C42', name: 'Petrov Defense', moves: 'e4 e5 Nf3 Nf6' },
  { eco: 'C30', name: "King's Gambit", moves: 'e4 e5 f4' },
  { eco: 'C25', name: 'Vienna Game', moves: 'e4 e5 Nc3' },

  // Semi-Open Games (1. e4 ...)
  { eco: 'B20', name: 'Sicilian Defense', moves: 'e4 c5' },
  { eco: 'B21', name: 'Sicilian Defense: Smith-Morra Gambit', moves: 'e4 c5 d4 cxd4 c3' },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', moves: 'e4 c5 c3' },
  { eco: 'B23', name: 'Sicilian Defense: Closed', moves: 'e4 c5 Nc3' },
  { eco: 'B27', name: 'Sicilian Defense: Open', moves: 'e4 c5 Nf3' },
  { eco: 'B50', name: 'Sicilian Defense', moves: 'e4 c5 Nf3 d6' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { eco: 'B80', name: 'Sicilian Defense: Scheveningen Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6' },
  { eco: 'B30', name: 'Sicilian Defense: Old Sicilian', moves: 'e4 c5 Nf3 Nc6' },
  { eco: 'B40', name: 'Sicilian Defense: French Variation', moves: 'e4 c5 Nf3 e6' },
  { eco: 'C00', name: 'French Defense', moves: 'e4 e6' },
  { eco: 'C01', name: 'French Defense: Exchange Variation', moves: 'e4 e6 d4 d5 exd5 exd5' },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: 'e4 e6 d4 d5 e5' },
  { eco: 'C10', name: 'French Defense: Paulsen Variation', moves: 'e4 e6 d4 d5 Nc3' },
  { eco: 'C15', name: 'French Defense: Winawer Variation', moves: 'e4 e6 d4 d5 Nc3 Bb4' },
  { eco: 'C11', name: 'French Defense: Classical Variation', moves: 'e4 e6 d4 d5 Nc3 Nf6' },
  { eco: 'C03', name: 'French Defense: Tarrasch Variation', moves: 'e4 e6 d4 d5 Nd2' },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: 'e4 c6' },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: 'e4 c6 d4 d5 e5' },
  { eco: 'B15', name: 'Caro-Kann Defense: Classical', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5' },
  { eco: 'B01', name: 'Scandinavian Defense', moves: 'e4 d5' },
  { eco: 'B01', name: 'Scandinavian Defense: Modern Variation', moves: 'e4 d5 exd5 Nf6' },
  { eco: 'B02', name: 'Alekhine Defense', moves: 'e4 Nf6' },
  { eco: 'B07', name: 'Pirc Defense', moves: 'e4 d6' },
  { eco: 'B07', name: 'Pirc Defense', moves: 'e4 d6 d4 Nf6 Nc3 g6' },
  { eco: 'B06', name: 'Modern Defense', moves: 'e4 g6' },

  // Closed Games (1. d4 d5)
  { eco: 'D00', name: "Queen's Pawn Game", moves: 'd4 d5' },
  { eco: 'D02', name: 'London System', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { eco: 'D00', name: 'London System', moves: 'd4 d5 Bf4' },
  { eco: 'D06', name: "Queen's Gambit", moves: 'd4 d5 c4' },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4' },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: 'd4 d5 c4 e6' },
  { eco: 'D31', name: "Queen's Gambit Declined: Semi-Slav", moves: 'd4 d5 c4 e6 Nc3 c6' },
  { eco: 'D35', name: "Queen's Gambit Declined: Exchange", moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5' },
  { eco: 'D10', name: 'Slav Defense', moves: 'd4 d5 c4 c6' },
  { eco: 'D15', name: 'Slav Defense: Three Knights', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3' },

  // Indian Defenses (1. d4 Nf6)
  { eco: 'A45', name: 'Indian Defense', moves: 'd4 Nf6' },
  { eco: 'A45', name: 'Trompowsky Attack', moves: 'd4 Nf6 Bg5' },
  { eco: 'E00', name: 'Indian Defense', moves: 'd4 Nf6 c4 e6' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { eco: 'E12', name: "Queen's Indian Defense", moves: 'd4 Nf6 c4 e6 Nf3 b6' },
  { eco: 'E01', name: 'Catalan Opening', moves: 'd4 Nf6 c4 e6 g3' },
  { eco: 'E60', name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6' },
  { eco: 'E61', name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6 Nc3 Bg7' },
  { eco: 'D70', name: 'Grünfeld Defense', moves: 'd4 Nf6 c4 g6 Nc3 d5' },
  { eco: 'A60', name: 'Benoni Defense', moves: 'd4 Nf6 c4 c5 d5' },
  { eco: 'A57', name: 'Benko Gambit', moves: 'd4 Nf6 c4 c5 d5 b5' },
  { eco: 'A80', name: 'Dutch Defense', moves: 'd4 f5' },

  // Flank Openings
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'A20', name: 'English Opening: King\'s English', moves: 'c4 e5' },
  { eco: 'A30', name: 'English Opening: Symmetrical', moves: 'c4 c5' },
  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A05', name: 'Réti Opening: King\'s Indian Attack', moves: 'Nf3 Nf6 g3' },
  { eco: 'A00', name: 'Van Geet Opening', moves: 'Nc3' }
];

// Normalize FEN for position-based lookup (pieces, active color, castling, en-passant)
function toFenKey(fen: string): string {
  if (!fen) return '';
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return fen.trim();
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

// Pre-computed map: normalized FEN key -> OpeningInfo
const fenToOpeningMap = new Map<string, OpeningInfo>();

function buildFenOpeningMap() {
  for (const op of OPENINGS_DATABASE) {
    try {
      const chess = new Chess();
      if (!op.moves.trim()) {
        fenToOpeningMap.set(toFenKey(chess.fen()), op);
        continue;
      }

      const moveTokens = op.moves.trim().split(/\s+/);
      let valid = true;
      for (const token of moveTokens) {
        const res = chess.move(token);
        if (!res) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const key = toFenKey(chess.fen());
        // Prefer longer/more specific variation names if multiple match same FEN
        if (!fenToOpeningMap.has(key) || (fenToOpeningMap.get(key)!.moves.split(' ').length < moveTokens.length)) {
          fenToOpeningMap.set(key, op);
        }
      }
    } catch {
      // Ignore move parsing errors in database
    }
  }
}

buildFenOpeningMap();

/**
 * Direct FEN position lookup for openings (handles transpositions and exact board state)
 */
export function getOpeningFromFen(fen: string): OpeningInfo | null {
  if (!fen) return null;
  const key = toFenKey(fen);
  return fenToOpeningMap.get(key) || null;
}

/**
 * Detects chess opening based on sequence of SAN moves played so far
 */
export function detectOpening(historySan: string[]): OpeningInfo | null {
  if (!historySan || historySan.length === 0) {
    return OPENINGS_DATABASE[0]; // Starting Position
  }
  const currentMovesStr = historySan.join(' ');
  
  let bestMatch: OpeningInfo | null = null;
  let maxMatchLength = 0;

  for (const op of OPENINGS_DATABASE) {
    if (!op.moves) continue;
    if (currentMovesStr.startsWith(op.moves)) {
      const matchLen = op.moves.split(' ').length;
      if (matchLen > maxMatchLength) {
        maxMatchLength = matchLen;
        bestMatch = op;
      }
    } else if (!bestMatch && op.moves.startsWith(currentMovesStr)) {
      bestMatch = op;
    }
  }

  return bestMatch;
}
