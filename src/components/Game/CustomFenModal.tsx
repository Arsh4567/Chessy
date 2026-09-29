import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { ChessyModal } from '../common/ChessyModal';
import { ChessyButton } from '../common/ChessyButton';
import { FileCode } from 'lucide-react';

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
    <ChessyModal
      isOpen={isOpen}
      onClose={() => {
        setErrorMsg(null);
        onClose();
      }}
      title="Load Custom FEN Position"
      subtitle="Paste standard Forsyth–Edwards Notation to set up a board position"
      maxWidth="md"
      icon={<FileCode className="w-5 h-5 text-sky-400" />}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <ChessyButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setErrorMsg(null);
              onClose();
            }}
          >
            Cancel
          </ChessyButton>
          <ChessyButton
            variant="primary"
            size="sm"
            onClick={handleLoad}
          >
            Load Position
          </ChessyButton>
        </div>
      }
    >
      <div className="space-y-3">
        <textarea
          value={customFenInput}
          onChange={(e) => {
            setCustomFenInput(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="e.g. r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5"
          className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400 resize-none"
        />
        {errorMsg && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
            {errorMsg}
          </p>
        )}
      </div>
    </ChessyModal>
  );
};
