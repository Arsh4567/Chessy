import React, { useState } from 'react';
import { Chess } from 'chess.js';

interface CustomFenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFen: (fen: string) => void;
}

export const CustomFenModal: React.FC<CustomFenModalProps> = ({
  isOpen,
  onClose,
  onLoadFen,
}) => {
  const [customFenInput, setCustomFenInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoad = () => {
    setErrorMsg(null);
    const clean = customFenInput.trim();
    if (!clean) {
      setErrorMsg('Please enter a FEN position string.');
      return;
    }

    try {
      const testChess = new Chess(clean);
      onLoadFen(testChess.fen());
      onClose();
      setCustomFenInput('');
    } catch {
      setErrorMsg('Invalid FEN format. Please verify standard Forsyth–Edwards Notation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <h3 className="text-sm font-bold text-slate-100">Load Custom FEN Position</h3>
        <textarea
          value={customFenInput}
          onChange={(e) => {
            setCustomFenInput(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="e.g. r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5"
          className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
        />
        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
            {errorMsg}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setErrorMsg(null);
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
          >
            Load Position
          </button>
        </div>
      </div>
    </div>
  );
};
