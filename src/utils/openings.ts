export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
}

export const OPENINGS_DATABASE: OpeningInfo[] = [
  { eco: 'C50', name: 'Italian Game', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { eco: 'C55', name: 'Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6' },
  { eco: 'C60', name: 'Ruy Lopez', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { eco: 'C88', name: 'Ruy Lopez: Closed Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7' },
  { eco: 'B20', name: 'Sicilian Defense', moves: 'e4 c5' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { eco: 'B30', name: 'Sicilian Defense: Old Sicilian', moves: 'e4 c5 Nf3 Nc6' },
  { eco: 'B01', name: 'Scandinavian Defense', moves: 'e4 d5' },
  { eco: 'C00', name: 'French Defense', moves: 'e4 e6' },
  { eco: 'C10', name: 'French Defense: Paulsen Variation', moves: 'e4 e6 d4 d5 Nc3' },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: 'e4 c6' },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: 'e4 c6 d4 d5 e5' },
  { eco: 'D00', name: "Queen's Pawn Game", moves: 'd4 d5' },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: 'd4 d5 c4 e6' },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4' },
  { eco: 'D02', name: 'London System', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { eco: 'E60', name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'B07', name: 'Pirc Defense', moves: 'e4 d6 d4 Nf6 Nc3 g6' },
  { eco: 'A80', name: 'Dutch Defense', moves: 'd4 f5' },
  { eco: 'C20', name: "King's Pawn Game", moves: 'e4 e5' },
  { eco: 'C42', name: 'Petrov Defense', moves: 'e4 e5 Nf3 Nf6' },
  { eco: 'C45', name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4' },
  { eco: 'C30', name: "King's Gambit", moves: 'e4 e5 f4' },
  { eco: 'A45', name: 'Trompowsky Attack', moves: 'd4 Nf6 Bg5' },
  { eco: 'A00', name: 'Van Geet Opening', moves: 'Nc3' }
];

export function detectOpening(historySan: string[]): OpeningInfo | null {
  if (!historySan || historySan.length === 0) return null;
  const currentMovesStr = historySan.join(' ');
  
  let bestMatch: OpeningInfo | null = null;
  let maxMatchLength = 0;

  for (const op of OPENINGS_DATABASE) {
    if (currentMovesStr.startsWith(op.moves) || op.moves.startsWith(currentMovesStr)) {
      const matchLen = op.moves.split(' ').length;
      if (matchLen > maxMatchLength && currentMovesStr.startsWith(op.moves)) {
        maxMatchLength = matchLen;
        bestMatch = op;
      } else if (!bestMatch && op.moves.startsWith(currentMovesStr)) {
        bestMatch = op;
      }
    }
  }

  return bestMatch;
}
