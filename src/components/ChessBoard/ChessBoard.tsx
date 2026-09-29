import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { PieceColor, PieceType, MoveClassification } from '../../types/chess';
import { PieceIcon } from './PieceIcon';
import { MoveMark } from './MoveMark';
import { PromotionModal } from './PromotionModal';
import { sound } from '../../utils/sound';

interface ChessBoardProps {
  chess: Chess;
  isFlipped?: boolean;
  playerColor?: PieceColor;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  disabled?: boolean;
  allowPremove?: boolean;
  lastMove?: { from: string; to: string } | null;
  moveQualityClassification?: MoveClassification;
  bestMoveHint?: { from: string; to: string } | null;
  showBestMoveArrow?: boolean;
  customArrows?: Array<{ from: string; to: string; color?: string }>;
  boardTheme?: 'emerald' | 'wood' | 'midnight' | 'cyber' | 'marble' | 'cobalt';
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  autoQueen?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

interface ChessSquareProps {
  square: Square;
  rankLabel?: string;
  fileLabel?: string;
  isLightSquare: boolean;
  piece: { type: PieceType; color: PieceColor } | null;
  isSelected: boolean;
  isPremoveSelected: boolean;
  isPremoveFrom: boolean;
  isPremoveTo: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isCheckSquare: boolean;
  isLegalTarget: boolean;
  isCaptureTarget: boolean;
  isBestMoveSource: boolean;
  isBestMoveTarget: boolean;
  isDraggable: boolean;
  slideOffset: { dx: number; dy: number; key: string } | null;
  moveQualityClassification?: MoveClassification;
  onClick: (square: Square) => void;
  onDragStart: (e: React.DragEvent, square: Square) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, square: Square) => void;
}

/**
 * Highly-Optimized Memoized Chess Square Component
 * Prevents re-rendering untouched squares during selection, move calculation, and dragging.
 */
const ChessSquare: React.FC<ChessSquareProps> = React.memo(({
  square,
  rankLabel,
  fileLabel,
  isLightSquare,
  piece,
  isSelected,
  isPremoveSelected,
  isPremoveFrom,
  isPremoveTo,
  isLastMoveFrom,
  isLastMoveTo,
  isCheckSquare,
  isLegalTarget,
  isCaptureTarget,
  isBestMoveSource,
  isBestMoveTarget,
  isDraggable,
  slideOffset,
  moveQualityClassification,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      onClick={() => onClick(square)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, square)}
      className={`relative flex items-center justify-center cursor-pointer select-none transition-colors duration-75 ${
        isLightSquare ? 'bg-[var(--sq-light)]' : 'bg-[var(--sq-dark)]'
      }`}
      style={{
        backgroundColor: isCheckSquare
          ? 'rgba(239, 68, 68, 0.9)'
          : isPremoveFrom || isPremoveTo
          ? 'rgba(245, 158, 11, 0.35)'
          : isPremoveSelected
          ? 'rgba(245, 158, 11, 0.45)'
          : isSelected
          ? 'var(--sq-highlight)'
          : isLastMoveFrom || isLastMoveTo
          ? 'var(--sq-move)'
          : undefined,
      }}
    >
      {/* File & Rank Coordinates */}
      {rankLabel && (
        <span
          className={`absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-mono font-bold select-none pointer-events-none ${
            isLightSquare ? 'text-[var(--sq-dark)] opacity-70' : 'text-[var(--sq-light)] opacity-70'
          }`}
        >
          {rankLabel}
        </span>
      )}
      {fileLabel && (
        <span
          className={`absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-mono font-bold select-none pointer-events-none ${
            isLightSquare ? 'text-[var(--sq-dark)] opacity-70' : 'text-[var(--sq-light)] opacity-70'
          }`}
        >
          {fileLabel}
        </span>
      )}

      {/* Best Move Engine Hint Overlays */}
      {isBestMoveSource && (
        <div className="absolute inset-1 rounded-full border-2 border-cyan-400 pointer-events-none z-10" />
      )}
      {isBestMoveTarget && (
        <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-cyan-400 pointer-events-none z-10" />
      )}

      {/* Premove Visual Cue */}
      {isPremoveFrom && (
        <div className="absolute inset-0 ring-2 ring-inset ring-amber-400/90 pointer-events-none z-20" />
      )}
      {isPremoveTo && (
        <div className="absolute inset-0 ring-2 ring-inset ring-amber-400/90 flex items-center justify-center pointer-events-none z-20">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm" />
        </div>
      )}
      {isPremoveSelected && (
        <div className="absolute inset-0 ring-2 ring-inset ring-amber-400 bg-amber-500/30 pointer-events-none z-20" />
      )}

      {/* Legal Move Destination Dots */}
      {isLegalTarget && !piece && (
        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black/30 rounded-full pointer-events-none z-10" />
      )}

      {/* Legal Move Capture Ring */}
      {isLegalTarget && piece && isCaptureTarget && (
        <div className="absolute inset-1 rounded-full border-4 border-black/30 pointer-events-none z-10" />
      )}

      {/* Chess Piece */}
      {piece && (
        <div
          draggable={isDraggable}
          onDragStart={(e) => onDragStart(e, square)}
          style={
            slideOffset
              ? ({
                  '--slide-x': `${slideOffset.dx}%`,
                  '--slide-y': `${slideOffset.dy}%`,
                } as React.CSSProperties)
              : undefined
          }
          className={`w-[88%] h-[88%] flex items-center justify-center select-none ${
            slideOffset
              ? 'animate-piece-slide z-40'
              : 'z-20'
          } ${
            isDraggable
              ? 'cursor-grab active:cursor-grabbing hover:scale-105'
              : 'cursor-default'
          }`}
        >
          <PieceIcon
            type={piece.type}
            color={piece.color}
            className="w-full h-full pointer-events-none"
          />
        </div>
      )}

      {/* Move Quality Badge on Destination Square */}
      {isLastMoveTo && moveQualityClassification && (
        <div className="absolute -top-1.5 -right-1.5 z-40 select-none pointer-events-none">
          <MoveMark classification={moveQualityClassification} size={28} showGlow />
        </div>
      )}
    </div>
  );
});

export const ChessBoard: React.FC<ChessBoardProps> = React.memo(({
  chess,
  isFlipped = false,
  playerColor,
  onMove,
  disabled = false,
  allowPremove = true,
  lastMove = null,
  moveQualityClassification,
  bestMoveHint = null,
  showBestMoveArrow = true,
  customArrows = [],
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

  // Premove State
  const [premove, setPremove] = useState<{ from: Square; to: Square; promotion?: string } | null>(null);
  const [premoveSelectedSquare, setPremoveSelectedSquare] = useState<Square | null>(null);

  const isInitialMount = useRef<boolean>(true);
  const currentFen = chess.fen();
  const prevFenRef = useRef<string>(currentFen);
  const prevFlippedRef = useRef<boolean>(isFlipped);

  const effectivePlayerColor = playerColor || (isFlipped ? 'b' : 'w');
  const isMyTurn = !disabled && (chess.turn() === effectivePlayerColor);

  // Clear regular move selections when FEN changes
  useEffect(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [currentFen]);

  // Execute queued premove when it becomes our turn
  useEffect(() => {
    if (premove && isMyTurn && !disabled) {
      const legalMoves = chess.moves({ verbose: true });
      const matchedMove = legalMoves.find(
        (m) => m.from === premove.from && m.to === premove.to
      );

      if (matchedMove) {
        const promo = premove.promotion || (matchedMove.promotion ? 'q' : undefined);
        onMove({
          from: premove.from,
          to: premove.to,
          promotion: promo,
        });
      } else {
        sound.playIllegal();
      }
      setPremove(null);
      setPremoveSelectedSquare(null);
    }
  }, [currentFen, isMyTurn, disabled, premove, chess, onMove]);

  // Instantly cancel active slide animations when board is flipped
  useEffect(() => {
    if (prevFlippedRef.current !== isFlipped) {
      prevFlippedRef.current = isFlipped;
      setSlidingMoveKey(null);
    }
  }, [isFlipped]);

  // Trigger smooth sliding animation strictly for verified legal completed moves
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
      }, 190);
      return () => clearTimeout(timer);
    } else {
      setSlidingMoveKey(null);
    }
  }, [lastMove?.from, lastMove?.to, currentFen]);

  const displayFiles = useMemo(() => isFlipped ? [...FILES].reverse() : [...FILES], [isFlipped]);
  const displayRanks = useMemo(() => isFlipped ? [...RANKS].reverse() : [...RANKS], [isFlipped]);

  // Fast Square Piece Matrix representation
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

  // Calculate relative grid offset for the sliding piece
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

  // Right click cancels premoves and selections
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPremove(null);
    setPremoveSelectedSquare(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  }, []);

  // Map algebraic square to SVG 800x800 coordinate space
  const getSquareCoordinates = useCallback((square: string) => {
    if (!square || square.length < 2) return { x: 400, y: 400, col: 3, row: 3 };
    const fileChar = square[0].toLowerCase();
    const rankNum = parseInt(square[1], 10);
    const fileIdx = fileChar.charCodeAt(0) - 97;
    const rankIdx = rankNum - 1;

    const col = isFlipped ? 7 - fileIdx : fileIdx;
    const row = isFlipped ? rankIdx : 7 - rankIdx;

    return {
      x: col * 100 + 50,
      y: row * 100 + 50,
      col,
      row,
    };
  }, [isFlipped]);

  // Generate SVG path for straight or Knight L-shaped moves
  const getArrowPath = useCallback((fromSq: string, toSq: string) => {
    const from = getSquareCoordinates(fromSq);
    const to = getSquareCoordinates(toSq);

    const colDiff = to.col - from.col;
    const rowDiff = to.row - from.row;

    const isKnightMove =
      (Math.abs(colDiff) === 1 && Math.abs(rowDiff) === 2) ||
      (Math.abs(colDiff) === 2 && Math.abs(rowDiff) === 1);

    if (isKnightMove) {
      let cornerX = from.x;
      let cornerY = to.y;
      if (Math.abs(colDiff) === 2 && Math.abs(rowDiff) === 1) {
        cornerX = to.x;
        cornerY = from.y;
      }
      return `M ${from.x} ${from.y} L ${cornerX} ${cornerY} L ${to.x} ${to.y}`;
    }

    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }, [getSquareCoordinates]);

  const handleSquareClick = useCallback((square: Square) => {
    // 1. If it's NOT our turn and premove is allowed:
    if (!isMyTurn && allowPremove) {
      const piece = chess.get(square);

      if (premoveSelectedSquare) {
        if (premoveSelectedSquare === square) {
          setPremoveSelectedSquare(null);
          return;
        }

        const movingPiece = chess.get(premoveSelectedSquare);
        const isPromotion =
          movingPiece?.type === 'p' &&
          ((movingPiece.color === 'w' && square.endsWith('8')) ||
            (movingPiece.color === 'b' && square.endsWith('1')));

        setPremove({
          from: premoveSelectedSquare,
          to: square,
          promotion: isPromotion ? 'q' : undefined,
        });
        setPremoveSelectedSquare(null);
        return;
      }

      if (piece && piece.color === effectivePlayerColor) {
        setPremoveSelectedSquare(square);
        setPremove(null);
      } else {
        setPremove(null);
        setPremoveSelectedSquare(null);
      }
      return;
    }

    // 2. Normal move flow:
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
        moves.map((m) => ({
          square: m.to as Square,
          isCapture: !!m.captured,
        }))
      );
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  }, [
    isMyTurn,
    allowPremove,
    premoveSelectedSquare,
    effectivePlayerColor,
    disabled,
    chess,
    selectedSquare,
    legalTargetsMap,
    autoQueen,
    onMove,
  ]);

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

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, square: Square) => {
    const piece = chess.get(square);
    if (!piece) {
      e.preventDefault();
      return;
    }

    if (!isMyTurn && allowPremove) {
      if (piece.color === effectivePlayerColor) {
        setDraggedSquare(square);
        setPremoveSelectedSquare(square);
        e.dataTransfer.setData('text/plain', square);
        e.dataTransfer.effectAllowed = 'move';
        return;
      }
      e.preventDefault();
      return;
    }

    if (disabled || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }

    setDraggedSquare(square);
    setSelectedSquare(square);
    const moves = chess.moves({ square, verbose: true });
    setLegalTargets(
      moves.map((m) => ({
        square: m.to as Square,
        isCapture: !!m.captured,
      }))
    );
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  }, [isMyTurn, allowPremove, effectivePlayerColor, disabled, chess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    if (!draggedSquare) {
      setDraggedSquare(null);
      return;
    }

    const fromSquare = draggedSquare;
    if (fromSquare === targetSquare) {
      setDraggedSquare(null);
      return;
    }

    // Drop as premove if not our turn
    if (!isMyTurn && allowPremove) {
      const movingPiece = chess.get(fromSquare);
      const isPromotion =
        movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && targetSquare.endsWith('8')) ||
          (movingPiece.color === 'b' && targetSquare.endsWith('1')));

      setPremove({
        from: fromSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      });
      setPremoveSelectedSquare(null);
      setDraggedSquare(null);
      return;
    }

    if (disabled) {
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
  }, [draggedSquare, isMyTurn, allowPremove, disabled, legalTargetsMap, chess, autoQueen, onMove]);

  return (
    <div 
      onContextMenu={handleContextMenu}
      className={`relative w-full max-w-[min(94vw,520px,64vh)] aspect-square select-none board-theme-${boardTheme} rounded-2xl shadow-2xl p-1.5 sm:p-2 bg-[#0c1424] border border-slate-800 transition-all duration-200 touch-manipulation`}
      role="region"
      aria-label="Interactive Chess Board"
    >
      <div className="relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border border-black/40 shadow-inner">
        {displayRanks.map((rank, rIdx) => {
          const rankNum = parseInt(rank, 10);
          const origRow = 8 - rankNum;

          return displayFiles.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const isLightSquare = (rIdx + fIdx) % 2 === 0;
            const origCol = file.charCodeAt(0) - 97;
            const piece = (boardMatrix[origRow]?.[origCol] as { type: PieceType; color: PieceColor } | null) || null;

            const isSelected = selectedSquare === square;
            const isPremoveSelected = premoveSelectedSquare === square;
            const isPremoveFrom = premove?.from === square;
            const isPremoveTo = premove?.to === square;

            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isCheckSquare = checkKingSquare === square;

            const targetInfo = legalTargetsMap.get(square);
            const isLegalTarget = showLegalMoves && isMyTurn && !!targetInfo;
            const isCaptureTarget = Boolean(targetInfo?.isCapture);

            const isBestMoveSource = bestMoveHint?.from === square;
            const isBestMoveTarget = bestMoveHint?.to === square;

            const slideOffset = getSlideOffset(square);
            const isDraggable = (isMyTurn && piece?.color === turn) || (!isMyTurn && allowPremove && piece?.color === effectivePlayerColor);

            return (
              <ChessSquare
                key={square}
                square={square}
                rankLabel={showCoordinates && fIdx === 0 ? rank : undefined}
                fileLabel={showCoordinates && rIdx === 7 ? file : undefined}
                isLightSquare={isLightSquare}
                piece={piece}
                isSelected={isSelected}
                isPremoveSelected={isPremoveSelected}
                isPremoveFrom={isPremoveFrom}
                isPremoveTo={isPremoveTo}
                isLastMoveFrom={isLastMoveFrom}
                isLastMoveTo={isLastMoveTo}
                isCheckSquare={isCheckSquare}
                isLegalTarget={isLegalTarget}
                isCaptureTarget={isCaptureTarget}
                isBestMoveSource={isBestMoveSource}
                isBestMoveTarget={isBestMoveTarget}
                isDraggable={isDraggable}
                slideOffset={slideOffset}
                moveQualityClassification={isLastMoveTo ? moveQualityClassification : undefined}
                onClick={handleSquareClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            );
          });
        })}

        {/* Dynamic Best Move & Tactical Arrows SVG Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
          viewBox="0 0 800 800"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrowhead-best"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>
            <marker
              id="arrowhead-cyan"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
            </marker>
            <marker
              id="arrowhead-amber"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Engine Best Move Arrow */}
          {showBestMoveArrow && bestMoveHint && bestMoveHint.from && bestMoveHint.to && bestMoveHint.from !== bestMoveHint.to && (
            <g>
              <path
                d={getArrowPath(bestMoveHint.from, bestMoveHint.to)}
                stroke="rgba(0, 0, 0, 0.45)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d={getArrowPath(bestMoveHint.from, bestMoveHint.to)}
                stroke="#10b981"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                markerEnd="url(#arrowhead-best)"
                opacity="0.9"
              />
              {(() => {
                const origin = getSquareCoordinates(bestMoveHint.from);
                return (
                  <circle
                    cx={origin.x}
                    cy={origin.y}
                    r="14"
                    fill="#10b981"
                    opacity="0.85"
                  />
                );
              })()}
            </g>
          )}

          {/* Custom Drawn / Alternate Tactical Arrows */}
          {customArrows.map((arr, idx) => (
            <g key={`custom-arr-${idx}`}>
              <path
                d={getArrowPath(arr.from, arr.to)}
                stroke="rgba(0, 0, 0, 0.35)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d={getArrowPath(arr.from, arr.to)}
                stroke={arr.color || '#06b6d4'}
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                markerEnd={arr.color === '#f59e0b' ? 'url(#arrowhead-amber)' : 'url(#arrowhead-cyan)'}
                opacity="0.88"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Floating Premove Notification Badge */}
      {premove && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-amber-500 text-slate-950 text-[11px] font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>⚡ Premove: {premove.from}→{premove.to}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPremove(null);
            }}
            className="w-3.5 h-3.5 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-[9px] font-black cursor-pointer"
            title="Cancel Premove"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pawn Promotion Modal */}
      <PromotionModal
        isOpen={Boolean(pendingPromotion)}
        turn={turn}
        onSelectPromotion={handlePromotionSelect}
      />
    </div>
  );
});
