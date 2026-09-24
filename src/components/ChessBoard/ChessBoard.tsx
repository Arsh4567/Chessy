import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { PieceType, PieceColor } from '../../types/chess';
import { PieceIcon } from './PieceIcon';
import { sound } from '../../utils/sound';

interface ChessBoardProps {
  chess: Chess;
  isFlipped?: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  bestMoveHint?: { from: string; to: string } | null;
  boardTheme?: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble';
  showCoordinates?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  isFlipped = false,
  onMove,
  disabled = false,
  lastMove = null,
  bestMoveHint = null,
  boardTheme = 'emerald',
  showCoordinates = true,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<{ square: Square; isCapture: boolean }[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<{ square: Square; piece: { type: PieceSymbol; color: Color } } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Clear selection if turn changes or board resets
  useEffect(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
    setPendingPromotion(null);
  }, [chess.fen(), disabled]);

  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;

  const isCheck = chess.inCheck();
  const turn = chess.turn();

  // Find king square for check highlight
  let checkKingSquare: Square | null = null;
  if (isCheck) {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          checkKingSquare = `${FILES[c]}${8 - r}` as Square;
        }
      }
    }
  }

  const handleSquareClick = (square: Square) => {
    if (disabled) return;

    const piece = chess.get(square);

    // If already clicked a piece and clicking a valid legal target
    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      const isTarget = legalTargets.some(t => t.square === square);
      if (isTarget) {
        // Check for promotion
        const movingPiece = chess.get(selectedSquare);
        const isPawnPromotion =
          movingPiece?.type === 'p' &&
          ((movingPiece.color === 'w' && square.endsWith('8')) ||
           (movingPiece.color === 'b' && square.endsWith('1')));

        if (isPawnPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        // Execute Move
        const success = onMove({ from: selectedSquare, to: square });
        if (success) {
          setSelectedSquare(null);
          setLegalTargets([]);
        }
        return;
      }
    }

    // Select piece if it belongs to current player turn
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalTargets(
        moves.map(m => ({
          square: m.to as Square,
          isCapture: !!m.captured,
        }))
      );
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  };

  const handlePromotionSelect = (promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    onMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promoPiece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, square: Square, piece: { type: PieceSymbol; color: Color }) => {
    if (disabled || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }
    setDraggedPiece({ square, piece });
    setSelectedSquare(square);
    const moves = chess.moves({ square, verbose: true });
    setLegalTargets(
      moves.map(m => ({
        square: m.to as Square,
        isCapture: !!m.captured,
      }))
    );
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    if (!draggedPiece || disabled) return;

    const fromSquare = draggedPiece.square;
    if (fromSquare === targetSquare) {
      setDraggedPiece(null);
      return;
    }

    const isTarget = legalTargets.some(t => t.square === targetSquare);
    if (isTarget) {
      const movingPiece = chess.get(fromSquare);
      const isPawnPromotion =
        movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && targetSquare.endsWith('8')) ||
         (movingPiece.color === 'b' && targetSquare.endsWith('1')));

      if (isPawnPromotion) {
        setPendingPromotion({ from: fromSquare, to: targetSquare });
        setDraggedPiece(null);
        return;
      }

      onMove({ from: fromSquare, to: targetSquare });
    }

    setDraggedPiece(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  };

  return (
    <div className={`relative w-full max-w-[560px] aspect-square select-none board-theme-${boardTheme} rounded-xl shadow-2xl p-1.5 sm:p-2 bg-slate-900 border border-slate-700/80`}>
      <div 
        ref={boardRef}
        className="relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-black/30 shadow-inner"
      >
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const isLightSquare = (rIdx + fIdx) % 2 === 0;
            const piece = chess.get(square);

            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isCheckSquare = checkKingSquare === square;

            const targetInfo = legalTargets.find(t => t.square === square);
            const isLegalTarget = !!targetInfo;
            const isCaptureTarget = targetInfo?.isCapture;

            const isBestMoveSource = bestMoveHint?.from === square;
            const isBestMoveTarget = bestMoveHint?.to === square;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 ${
                  isLightSquare ? 'bg-[var(--sq-light)]' : 'bg-[var(--sq-dark)]'
                }`}
                style={{
                  backgroundColor: isCheckSquare
                    ? 'rgba(239, 68, 68, 0.85)'
                    : isSelected
                    ? 'var(--sq-highlight)'
                    : isLastMoveFrom || isLastMoveTo
                    ? 'var(--sq-move)'
                    : undefined,
                }}
              >
                {/* Coordinates overlay */}
                {showCoordinates && fIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] sm:text-[11px] font-mono font-bold pointer-events-none select-none ${
                      isLightSquare ? 'text-[var(--sq-dark)]' : 'text-[var(--sq-light)]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {showCoordinates && rIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] sm:text-[11px] font-mono font-bold pointer-events-none select-none ${
                      isLightSquare ? 'text-[var(--sq-dark)]' : 'text-[var(--sq-light)]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Best Move Engine Hint Glow */}
                {isBestMoveSource && (
                  <div className="absolute inset-0 ring-4 ring-amber-400/80 rounded-sm pointer-events-none animate-pulse" />
                )}
                {isBestMoveTarget && (
                  <div className="absolute inset-1 border-2 border-dashed border-amber-400 rounded-sm pointer-events-none" />
                )}

                {/* Legal Move Indicators */}
                {isLegalTarget && !piece && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-black/25 hover:bg-black/40 rounded-full pointer-events-none transition-transform duration-100 scale-100 hover:scale-125" />
                )}
                {isLegalTarget && piece && (
                  <div className="absolute inset-0.5 sm:inset-1 rounded-full border-4 border-black/25 pointer-events-none" />
                )}

                {/* Chess Piece */}
                {piece && (
                  <div
                    draggable={!disabled && piece.color === chess.turn()}
                    onDragStart={(e) => handleDragStart(e, square, piece)}
                    className={`w-[85%] h-[85%] flex items-center justify-center transition-transform duration-150 active:scale-110 ${
                      isSelected ? 'scale-105 filter drop-shadow-md' : ''
                    } ${draggedPiece?.square === square ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <PieceIcon type={piece.type as PieceType} color={piece.color as PieceColor} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Dialog Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 rounded-xl">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Choose Promotion</span>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="w-14 h-14 p-2 bg-slate-800 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-400 rounded-lg transition-all flex items-center justify-center hover:scale-105"
                >
                  <PieceIcon type={pType} color={chess.turn() as PieceColor} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
