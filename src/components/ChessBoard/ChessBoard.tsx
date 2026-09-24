import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { PieceColor, PieceType, MoveClassification } from '../../types/chess';
import { PieceIcon } from './PieceIcon';
import { MOVE_QUALITY_SIGNS } from '../../utils/moveClassification';

interface ChessBoardProps {
  chess: Chess;
  isFlipped?: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  moveQualityClassification?: MoveClassification;
  bestMoveHint?: { from: string; to: string } | null;
  boardTheme?: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble';
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  autoQueen?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

export const ChessBoard: React.FC<ChessBoardProps> = React.memo(({
  chess,
  isFlipped = false,
  onMove,
  disabled = false,
  lastMove = null,
  moveQualityClassification,
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
  const [isDragMove, setIsDragMove] = useState<boolean>(false);
  const [slidingMoveKey, setSlidingMoveKey] = useState<string | null>(null);

  const isInitialMount = useRef<boolean>(true);
  const currentFen = chess.fen();
  const prevFenRef = useRef<string>(currentFen);
  const prevFlippedRef = useRef<boolean>(isFlipped);

  // Clear selections when board state FEN changes
  useEffect(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [currentFen]);

  // Instantly cancel any active slide animations when board is flipped
  useEffect(() => {
    if (prevFlippedRef.current !== isFlipped) {
      prevFlippedRef.current = isFlipped;
      setSlidingMoveKey(null);
    }
  }, [isFlipped]);

  // Trigger smooth sliding animation strictly for verified legal, completed moves
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFenRef.current = currentFen;
      return;
    }

    const fenChanged = prevFenRef.current !== currentFen;
    prevFenRef.current = currentFen;

    if (lastMove && lastMove.from && lastMove.to && lastMove.from !== lastMove.to && fenChanged) {
      const pieceOnDest = chess.get(lastMove.to as Square);
      if (!pieceOnDest) {
        setSlidingMoveKey(null);
        return;
      }

      if (isDragMove) {
        setIsDragMove(false);
        setSlidingMoveKey(null);
        return;
      }

      const moveId = `${lastMove.from}-${lastMove.to}-${currentFen.split(' ')[5] || Date.now()}`;
      setSlidingMoveKey(moveId);
      const timer = setTimeout(() => {
        setSlidingMoveKey((curr) => (curr === moveId ? null : curr));
      }, 205);
      return () => clearTimeout(timer);
    } else {
      setSlidingMoveKey(null);
    }
  }, [lastMove?.from, lastMove?.to, currentFen]);

  const displayFiles = useMemo(() => isFlipped ? [...FILES].reverse() : [...FILES], [isFlipped]);
  const displayRanks = useMemo(() => isFlipped ? [...RANKS].reverse() : [...RANKS], [isFlipped]);

  // O(1) Fast Square Piece Matrix representation
  const boardMatrix = useMemo(() => chess.board(), [currentFen]);

  // Fast O(1) Legal Targets Lookup Map
  const legalTargetsMap = useMemo(() => {
    const map = new Map<string, { square: Square; isCapture: boolean }>();
    for (let i = 0; i < legalTargets.length; i++) {
      map.set(legalTargets[i].square, legalTargets[i]);
    }
    return map;
  }, [legalTargets]);

  const isCheck = useMemo(() => chess.inCheck(), [currentFen]);
  const turn = chess.turn();

  // Find king square for check highlight efficiently
  const checkKingSquare = useMemo<Square | null>(() => {
    if (!isCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = boardMatrix[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          return `${FILES[c]}${8 - r}` as Square;
        }
      }
    }
    return null;
  }, [isCheck, boardMatrix, turn]);

  // Calculate relative grid offset for the sliding piece respecting current board orientation
  const getSlideOffset = useCallback((square: Square) => {
    if (!lastMove || !slidingMoveKey) return null;

    if (lastMove.to === square) {
      const fromCol = displayFiles.indexOf(lastMove.from[0] as any);
      const fromRow = displayRanks.indexOf(lastMove.from[1] as any);
      const toCol = displayFiles.indexOf(lastMove.to[0] as any);
      const toRow = displayRanks.indexOf(lastMove.to[1] as any);

      if (fromCol !== -1 && fromRow !== -1 && toCol !== -1 && toRow !== -1) {
        return {
          dx: (fromCol - toCol) * 100,
          dy: (fromRow - toRow) * 100,
          key: `${slidingMoveKey}-main`,
        };
      }
    }

    // Castling: Rook slides alongside the King
    const pieceOnTo = chess.get(lastMove.to as Square);
    if (pieceOnTo?.type === 'k' && Math.abs(lastMove.from.charCodeAt(0) - lastMove.to.charCodeAt(0)) === 2) {
      const rank = lastMove.to[1];
      const isKingside = lastMove.to[0] === 'g';
      const rookFromSquare = (isKingside ? `h${rank}` : `a${rank}`) as Square;
      const rookToSquare = (isKingside ? `f${rank}` : `d${rank}`) as Square;

      if (square === rookToSquare) {
        const fromCol = displayFiles.indexOf(rookFromSquare[0] as any);
        const fromRow = displayRanks.indexOf(rookFromSquare[1] as any);
        const toCol = displayFiles.indexOf(rookToSquare[0] as any);
        const toRow = displayRanks.indexOf(rookToSquare[1] as any);

        if (fromCol !== -1 && toCol !== -1) {
          return {
            dx: (fromCol - toCol) * 100,
            dy: (fromRow - toRow) * 100,
            key: `${slidingMoveKey}-castle-rook`,
          };
        }
      }
    }

    return null;
  }, [lastMove, slidingMoveKey, displayFiles, displayRanks, chess]);

  const handleSquareClick = useCallback((square: Square) => {
    if (disabled) return;

    const piece = chess.get(square);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      const isTarget = legalTargetsMap.has(square);
      if (isTarget) {
        const movingPiece = chess.get(selectedSquare);
        const isPawnPromotion =
          movingPiece?.type === 'p' &&
          ((movingPiece.color === 'w' && square.endsWith('8')) ||
           (movingPiece.color === 'b' && square.endsWith('1')));

        setIsDragMove(false);
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

        const success = onMove({ from: selectedSquare, to: square });
        if (success) {
          setSelectedSquare(null);
          setLegalTargets([]);
        }
        return;
      }
    }

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
  }, [disabled, chess, selectedSquare, legalTargetsMap, autoQueen, onMove]);

  const handlePromotionSelect = useCallback((promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    onMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promoPiece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [pendingPromotion, onMove]);

  // Drag and Drop handlers with zero lag
  const handleDragStart = useCallback((e: React.DragEvent, square: Square) => {
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
  }, [disabled, chess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSquare: Square) => {
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

    const isTarget = legalTargetsMap.has(targetSquare);
    if (isTarget) {
      setIsDragMove(true);
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
  }, [draggedSquare, disabled, legalTargetsMap, chess, autoQueen, onMove]);

  return (
    <div className={`relative w-full max-w-[540px] aspect-square select-none board-theme-${boardTheme} rounded-2xl shadow-2xl p-2 bg-slate-900 border border-slate-800 transition-all duration-300`}>
      <div className="relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border border-black/40 shadow-inner will-change-transform">
        {displayRanks.map((rank, rIdx) => {
          const rankNum = parseInt(rank, 10);
          const origRow = 8 - rankNum;

          return displayFiles.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const isLightSquare = (rIdx + fIdx) % 2 === 0;
            const origCol = file.charCodeAt(0) - 97;
            const piece = boardMatrix[origRow]?.[origCol] || null;

            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isCheckSquare = checkKingSquare === square;

            const targetInfo = legalTargetsMap.get(square);
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
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 will-change-transform ${
                  isLightSquare ? 'bg-[var(--sq-light)]' : 'bg-[var(--sq-dark)]'
                } ${isLastMoveTo && slidingMoveKey ? 'animate-capture-flash' : ''}`}
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

                {/* Piece with smooth hover, drag, and tactile sliding animation */}
                {piece && (() => {
                  const slideOffset = getSlideOffset(square);
                  return (
                    <div
                      key={slideOffset ? slideOffset.key : `piece-${square}-${piece.color}${piece.type}`}
                      draggable={!disabled && piece.color === turn}
                      onDragStart={(e) => handleDragStart(e, square)}
                      style={
                        slideOffset
                          ? ({
                              '--slide-x': `${slideOffset.dx}%`,
                              '--slide-y': `${slideOffset.dy}%`,
                            } as React.CSSProperties)
                          : undefined
                      }
                      className={`w-[86%] h-[86%] flex items-center justify-center select-none ${
                        slideOffset
                          ? 'animate-piece-slide z-40'
                          : 'transition-transform duration-100 active:scale-110 z-20'
                      } ${
                        piece.color === turn && !disabled
                          ? 'cursor-grab active:cursor-grabbing hover:scale-105'
                          : 'cursor-default'
                      }`}
                    >
                      <PieceIcon
                        type={piece.type as PieceType}
                        color={piece.color as PieceColor}
                        className="w-full h-full drop-shadow-md pointer-events-none"
                      />
                    </div>
                  );
                })()}

                {/* Move Quality Badge on Destination Square */}
                {isLastMoveTo && moveQualityClassification && (() => {
                  const qSign = MOVE_QUALITY_SIGNS[moveQualityClassification];
                  if (!qSign) return null;
                  return (
                    <div
                      className={`absolute top-0.5 right-0.5 z-40 px-1 py-0.2 rounded-md font-mono font-black text-[9px] sm:text-[10px] leading-tight border shadow-md animate-in zoom-in-75 duration-150 select-none pointer-events-none ${qSign.badgeBg} ${qSign.badgeText} ${qSign.badgeBorder} ${qSign.glowColor}`}
                      title={`${qSign.label} (${qSign.symbol})`}
                    >
                      {qSign.symbol}
                    </div>
                  );
                })()}
              </div>
            );
          });
        })}
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
                    color={turn === 'w' ? 'w' : 'b'}
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
});
