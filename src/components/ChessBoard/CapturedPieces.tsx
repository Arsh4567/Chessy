import React from 'react';
import { PieceType, PieceColor } from '../../types/chess';
import { PieceIcon } from './PieceIcon';

interface CapturedPiecesProps {
  color: PieceColor;
  capturedPieces: PieceType[];
  materialAdvantage: number;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ color, capturedPieces, materialAdvantage }) => {
  // Sort pieces by standard value Q > R > B = N > P
  const order: Record<PieceType, number> = { q: 5, r: 4, b: 3, n: 2, p: 1, k: 0 };
  const sorted = [...capturedPieces].sort((a, b) => order[b] - order[a]);

  return (
    <div className="flex items-center gap-1 min-h-[22px] overflow-hidden">
      <div className="flex items-center -space-x-1 sm:-space-x-1.5 overflow-x-auto">
        {sorted.map((type, index) => (
          <div key={index} className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform hover:scale-125 hover:z-10">
            <PieceIcon type={type} color={color} />
          </div>
        ))}
      </div>
      {materialAdvantage > 0 && (
        <span className="text-[11px] font-mono font-bold text-amber-400/90 ml-1">
          +{materialAdvantage}
        </span>
      )}
    </div>
  );
};
