import React from 'react';

interface PgnImportModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onImport: () => void;
  onClose: () => void;
}

export const PgnImportModal: React.FC<PgnImportModalProps> = ({
  isOpen,
  value,
  onChange,
  onImport,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="p-4 bg-slate-900 border border-sky-500/40 rounded-2xl space-y-3 shadow-2xl animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200">Import PGN Notation</span>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 ..."
        className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
      />
      <div className="flex justify-end">
        <button
          onClick={onImport}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Start Analysis
        </button>
      </div>
    </div>
  );
};
