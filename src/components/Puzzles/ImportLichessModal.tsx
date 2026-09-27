import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Search, 
  User, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  ExternalLink,
  Layers,
  Globe
} from 'lucide-react';
import { 
  ExtendedPuzzle, 
  fetchLichessPuzzleById, 
  fetchLichessUserTactics, 
  parseCustomOrCsvPuzzles 
} from '../../utils/lichessPuzzles';

interface ImportLichessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPuzzles: (puzzles: ExtendedPuzzle[], message?: string) => void;
}

type ImportTab = 'id' | 'user' | 'bulk';

export const ImportLichessModal: React.FC<ImportLichessModalProps> = ({
  isOpen,
  onClose,
  onImportPuzzles,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('id');
  const [puzzleIdInput, setPuzzleIdInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [bulkTextInput, setBulkTextInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewPuzzle, setPreviewPuzzle] = useState<ExtendedPuzzle | null>(null);
  const [userPuzzlesPreview, setUserPuzzlesPreview] = useState<ExtendedPuzzle[]>([]);

  if (!isOpen) return null;

  // Handle direct Lichess Puzzle ID or URL search
  const handleFetchById = async (idToFetch?: string) => {
    const target = (idToFetch || puzzleIdInput).trim();
    if (!target) {
      setErrorMsg('Please enter a valid Lichess puzzle ID or URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setPreviewPuzzle(null);

    try {
      const puz = await fetchLichessPuzzleById(target);
      setIsLoading(false);
      if (puz) {
        setPreviewPuzzle(puz);
      } else {
        setErrorMsg(`Puzzle "${target}" could not be found on Lichess. Verify ID or URL.`);
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Network error fetching puzzle from Lichess.');
    }
  };

  // Handle Lichess username tactics fetch
  const handleFetchByUser = async (userToFetch?: string) => {
    const target = (userToFetch || usernameInput).trim();
    if (!target) {
      setErrorMsg('Please enter a Lichess username.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setUserPuzzlesPreview([]);

    try {
      const puzzles = await fetchLichessUserTactics(target, 6);
      setIsLoading(false);
      if (puzzles.length > 0) {
        setUserPuzzlesPreview(puzzles);
      } else {
        setErrorMsg(`No recent games or tactics found for Lichess player "${target}".`);
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Failed to retrieve player games from Lichess.');
    }
  };

  // Handle bulk raw text parsing
  const handleParseBulk = () => {
    const raw = bulkTextInput.trim();
    if (!raw) {
      setErrorMsg('Please paste Lichess CSV, FENs, or PGN data.');
      return;
    }

    const parsed = parseCustomOrCsvPuzzles(raw);
    if (parsed.length > 0) {
      onImportPuzzles(parsed, `Successfully imported ${parsed.length} custom puzzles!`);
      onClose();
    } else {
      setErrorMsg('Could not parse valid puzzles from the provided text.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-label="Import Lichess Puzzles"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-white">
                Import Puzzles from Lichess
              </h2>
              <p className="text-xs text-slate-400">
                Fetch official Lichess puzzles by ID, URL, player games, or bulk CSV/FEN.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-4 border-b border-slate-800/80 bg-slate-950/30">
          {[
            { id: 'id' as ImportTab, label: 'By ID / URL', icon: Search },
            { id: 'user' as ImportTab, label: 'By Lichess Player', icon: User },
            { id: 'bulk' as ImportTab, label: 'Bulk CSV / FEN', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer -mb-px ${
                  isActive
                    ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: ID or URL */}
          {activeTab === 'id' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enter Lichess Puzzle ID or Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={puzzleIdInput}
                    onChange={(e) => setPuzzleIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchById()}
                    placeholder="e.g. 00008, 61w78, or https://lichess.org/training/00008"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    onClick={() => handleFetchById()}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Fetch</span>
                  </button>
                </div>
              </div>

              {/* Quick Sample Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Popular Samples:</span>
                {[
                  { label: 'Daily Puzzle', id: 'daily' },
                  { label: 'Puzzle #00008 (1836 ELO)', id: '00008' },
                  { label: 'Pin Tactic #0009B', id: '0009B' },
                  { label: 'Queen Trade #000L9', id: '000L9' },
                ].map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      setPuzzleIdInput(sample.id);
                      handleFetchById(sample.id);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* Preview Card */}
              {previewPuzzle && (
                <div className="p-4 bg-slate-950/80 border border-emerald-500/40 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-white">
                        {previewPuzzle.theme || 'Lichess Puzzle'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {previewPuzzle.rating} ELO
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {previewPuzzle.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <div className="text-slate-400">
                      Solution length: <span className="font-mono text-slate-200 font-bold">{previewPuzzle.moves.length} moves</span>
                    </div>
                    <button
                      onClick={() => {
                        onImportPuzzles([previewPuzzle], `Loaded Lichess Puzzle #${previewPuzzle.id}`);
                        onClose();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load & Train Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Lichess Player Games */}
          {activeTab === 'user' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enter Lichess Username to extract tactical game moments:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchByUser()}
                    placeholder="e.g. MagnusCarlsen, DanielNaroditsky, DrNykterstein"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleFetchByUser()}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Extract Tactics</span>
                  </button>
                </div>
              </div>

              {/* Sample Usernames */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Popular Grandmasters:</span>
                {['MagnusCarlsen', 'DanielNaroditsky', 'EricRosen', 'nihalsarin2004'].map((user) => (
                  <button
                    key={user}
                    onClick={() => {
                      setUsernameInput(user);
                      handleFetchByUser(user);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                  >
                    {user}
                  </button>
                ))}
              </div>

              {/* Extracted User Puzzles List */}
              {userPuzzlesPreview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span>Extracted {userPuzzlesPreview.length} Tactics from {usernameInput}:</span>
                    <button
                      onClick={() => {
                        onImportPuzzles(userPuzzlesPreview, `Imported ${userPuzzlesPreview.length} tactics from ${usernameInput}`);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Import All ({userPuzzlesPreview.length})</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {userPuzzlesPreview.map((puz, idx) => (
                      <div
                        key={puz.id}
                        className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-200">
                            {puz.whitePlayer?.name} vs {puz.blackPlayer?.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {puz.playerColor === 'w' ? 'White to Move' : 'Black to Move'} • {puz.moves.length} moves line
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onImportPuzzles([puz], `Loaded tactic from ${usernameInput}`);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Play Tactic
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Bulk CSV / FEN */}
          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Paste Lichess CSV Rows or FEN Positions:
                </label>
                <textarea
                  rows={6}
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  placeholder={`Format 1 (Lichess CSV):
00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/P1P2bPP/7K b - - 0 24,f2g3 e6e7,1642,75,95,1234,crushing middlegame,https://lichess.org/78SwGI92#48

Format 2 (FEN):
6k1/5ppp/8/8/8/8/1r3PPP/4R1K1 w - - 0 1`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleParseBulk}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Parse & Import Puzzles</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
