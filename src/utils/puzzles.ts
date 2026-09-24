import { ChessPuzzle } from '../types/chess';

export const CHESS_PUZZLES: ChessPuzzle[] = [
  {
    id: 'puz-1',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    moves: ['Bxf7+', 'Kxf7', 'Nxe5+', 'Nxe5', 'Qh5+'],
    rating: 1250,
    theme: 'Greek Gift & Fork',
    description: 'White can disrupt Black’s king safety and regain the piece with a tactical fork.',
    playerColor: 'w'
  },
  {
    id: 'puz-2',
    fen: 'r1b1k2r/ppppqppp/5n2/4p3/1b1nP3/2NP1N2/PPPBBPPP/R2QK2R w KQkq - 6 7',
    moves: ['Nxd4', 'exd4', 'Nd5', 'Nxd5', 'exd5'],
    rating: 1420,
    theme: 'Center Pin & Outpost',
    description: 'Exploit Black’s central pieces to control the d5 outpost.',
    playerColor: 'w'
  },
  {
    id: 'puz-3',
    fen: '6k1/5ppp/8/8/8/8/1r3PPP/4R1K1 w - - 0 1',
    moves: ['Re8#'],
    rating: 800,
    theme: 'Back Rank Mate',
    description: 'Deliver checkmate using the vulnerable 8th rank.',
    playerColor: 'w'
  },
  {
    id: 'puz-4',
    fen: 'r1b2rk1/pp3ppp/2n1p3/2qp4/8/2NB4/PPP2PPP/R2QR1K1 w - - 0 13',
    moves: ['Bxh7+', 'Kxh7', 'Qh5+', 'Kg8', 'Re3'],
    rating: 1680,
    theme: 'Classic Bishop Sacrifice',
    description: 'Execute the devastating Greek Gift sacrifice to shatter the castled shield.',
    playerColor: 'w'
  },
  {
    id: 'puz-5',
    fen: '3r2k1/p4ppp/1p6/8/2Q5/P3q3/1P4PP/5R1K b - - 1 25',
    moves: ['Qe6', 'Qc7', 'Re8'],
    rating: 1550,
    theme: 'Defensive Consolidation & Back Rank Counter',
    description: 'Neutralize White’s mating threat and seize command of the open file.',
    playerColor: 'b'
  },
  {
    id: 'puz-6',
    fen: 'r4rk1/1pp2ppp/p1np4/4p3/B3P1b1/2NP1N2/PPP2qPP/R1BQ3K w - - 2 13',
    moves: ['Qe1', 'Qxe1+', 'Nxe1'],
    rating: 1350,
    theme: 'Defusing King Attack',
    description: 'Trade off Black’s aggressive queen to enter a winning endgame.',
    playerColor: 'w'
  }
];
