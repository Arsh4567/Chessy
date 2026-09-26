import React from 'react';
import { PieceIcon } from './PieceIcon';

interface PromotionModalProps {
  isOpen: boolean;
  turn: 'w' | 'b';
  onSelectPromotion: (piece: 'q' | 'r' | 'b' | 'n') => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  turn,
  onSelectPromotion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Promote Pawn</span>
        <div className="flex gap-2">
          {(['q', 'r', 'b', 'n'] as const).map((pType) => (
            <button
              key={pType}
              onClick={() => onSelectPromotion(pType)}
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
  );
};
