import React from 'react';
import { Swords, Bot, Search, Zap, BarChart2, FileText, Settings } from 'lucide-react';

export type NavTab = 'play' | 'bots' | 'review' | 'puzzles' | 'stats' | 'report';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  puzzleRating?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => onSelectTab('play')}
          className="flex items-center gap-2 text-slate-100 hover:text-amber-400 transition-colors cursor-pointer group"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">♚</span>
          <span className="text-sm font-black font-display tracking-wider uppercase">Chess</span>
        </button>

        {/* Short Clean Nav */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('play')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'play'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Play</span>
          </button>

          <button
            onClick={() => onSelectTab('bots')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'bots'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Stockfish</span>
          </button>

          <button
            onClick={() => onSelectTab('puzzles')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'puzzles'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Puzzles</span>
          </button>

          <button
            onClick={() => onSelectTab('review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'review'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Analysis</span>
          </button>

          <button
            onClick={() => onSelectTab('stats')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'stats'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Games</span>
          </button>

          <button
            onClick={() => onSelectTab('report')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'report'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </nav>

        {/* Right Action: Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
