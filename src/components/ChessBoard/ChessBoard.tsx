import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { PieceColor, PieceType } from '../../types/chess';
import { PieceIcon } from './PieceIcon';

interface ChessBoardProps {
  chess: Chess;
  isFlipped?: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  bestMoveHint?: { from: string; to: string } | null;
  boardTheme?: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble';
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  autoQueen?: boolean;
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
  showLegalMoves = true,
  autoQueen = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<{ square: Square; isCapture: boolean }[]>([]);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Clear selections if board changes externally
  useEffect(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [chess.fen()]);

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

    // If a piece was already selected
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
          if (autoQueen) {
            onMove({ from: selectedSquare, to: square, promotion: 'q' });
            setSelectedSquare(null);
            setLegalTargets([]);
          } else {
            setPendingPromotion({ from: selectedSquare, to: square });
          }
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
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const piece = chess.get(square);
    if (!piece || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }

    setDraggedSquare(square);
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
    if (!draggedSquare || disabled) {
      setDraggedSquare(null);
      return;
    }

    const fromSquare = draggedSquare;
    if (fromSquare === targetSquare) {
      setDraggedSquare(null);
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
        if (autoQueen) {
          onMove({ from: fromSquare, to: targetSquare, promotion: 'q' });
        } else {
          setPendingPromotion({ from: fromSquare, to: targetSquare });
        }
      } else {
        onMove({ from: fromSquare, to: targetSquare });
      }
    }

    setDraggedSquare(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  };

  return (
    <div className={`relative w-full max-w-[540px] aspect-square select-none board-theme-${boardTheme} rounded-2xl shadow-2xl p-2 bg-slate-900 border border-slate-800 transition-all duration-300`}>
      <div className="relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border border-black/40 shadow-inner">
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
            const isLegalTarget = showLegalMoves && !!targetInfo;
            const isCaptureTarget = targetInfo?.isCapture;

            const isBestMoveSource = bestMoveHint?.from === square;
            const isBestMoveTarget = bestMoveHint?.to === square;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                  isLightSquare ? 'bg-[var(--sq-light)]' : 'bg-[var(--sq-dark)]'
                }`}
                style={{
                  backgroundColor: isCheckSquare
                    ? 'rgba(239, 68, 68, 0.9)'
                    : isSelected
                    ? 'var(--sq-highlight)'
                    : isLastMoveFrom || isLastMoveTo
                    ? 'var(--sq-move)'
                    : undefined,
                }}
              >
                {/* Coordinates */}
                {showCoordinates && fIdx === 0 && (
                  <span
                    className={`absolute top-1 left-1 text-[10px] font-mono font-bold select-none pointer-events-none ${
                      isLightSquare ? 'text-[var(--sq-dark)] opacity-70' : 'text-[var(--sq-light)] opacity-70'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {showCoordinates && rIdx === 7 && (
                  <span
                    className={`absolute bottom-1 right-1 text-[10px] font-mono font-bold select-none pointer-events-none ${
                      isLightSquare ? 'text-[var(--sq-dark)] opacity-70' : 'text-[var(--sq-light)] opacity-70'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Best Move Engine Hint */}
                {isBestMoveSource && (
                  <div className="absolute inset-1 rounded-full border-2 border-cyan-400 animate-pulse pointer-events-none z-10" />
                )}
                {isBestMoveTarget && (
                  <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-cyan-400 animate-spin pointer-events-none z-10" />
                )}

                {/* Legal Move Indicators */}
                {isLegalTarget && !piece && (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black/30 hover:bg-black/45 rounded-full pointer-events-none z-10 transition-transform scale-100 hover:scale-125" />
                )}

                {isLegalTarget && piece && isCaptureTarget && (
                  <div className="absolute inset-1 rounded-full border-4 border-black/30 hover:border-black/50 pointer-events-none z-10" />
                )}

                {/* Piece with smooth hover and drag */}
                {piece && (
                  <div
                    draggable={!disabled && piece.color === chess.turn()}
                    onDragStart={(e) => handleDragStart(e, square)}
                    className={`w-[86%] h-[86%] flex items-center justify-center transition-transform duration-100 active:scale-110 z-20 ${
                      piece.color === chess.turn() && !disabled ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'cursor-default'
                    }`}
                  >
                    <PieceIcon
                      type={piece.type as PieceType}
                      color={piece.color as PieceColor}
                      className="w-full h-full drop-shadow-md pointer-events-none"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Promote Pawn</span>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500 rounded-xl flex items-center justify-center transition-all cursor-pointer p-2"
                >
                  <PieceIcon
                    type={pType}
                    color={chess.turn() === 'w' ? 'w' : 'b'}
                    className="w-full h-full drop-shadow-lg"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
