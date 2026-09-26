import React, { useState } from 'react';
import { 
  Home, 
  Swords, 
  Zap, 
  BookOpen, 
  Search, 
  Globe, 
  Trophy, 
  User, 
  Users, 
  Settings, 
  Menu, 
  X,
  Crown
} from 'lucide-react';

export type NavTab = 
  | 'home' 
  | 'play' 
  | 'puzzles' 
  | 'learn' 
  | 'analyze' 
  | 'games' 
  | 'leaderboard' 
  | 'profile' 
  | 'friends';

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
  puzzleRating = 1500,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'play' as NavTab, label: 'Play', icon: Swords },
    { id: 'puzzles' as NavTab, label: 'Puzzles', icon: Zap },
    { id: 'learn' as NavTab, label: 'Learn', icon: BookOpen },
    { id: 'analyze' as NavTab, label: 'Analyze', icon: Search },
    { id: 'games' as NavTab, label: 'Games', icon: Globe },
    { id: 'leaderboard' as NavTab, label: 'Leaderboard', icon: Trophy },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070c14]/95 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => handleTabClick('home')}
          className="flex items-center gap-2.5 text-white hover:text-sky-400 transition-colors cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base font-black shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            ♚
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-sm font-black font-display tracking-wider uppercase block leading-none text-white">
              Grandmaster
            </span>
            <span className="text-[10px] font-mono font-medium text-slate-400 tracking-tight">
              Chess Platform
            </span>
          </div>
        </button>

        {/* Desktop Primary Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Secondary Actions & Profile */}
        <div className="flex items-center gap-2">
          {/* Quick Friends Match Trigger */}
          <button
            onClick={() => handleTabClick('friends')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer hidden md:flex items-center gap-1.5 ${
              currentTab === 'friends'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Local Pass & Play Match"
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Friends</span>
          </button>

          {/* User Profile Pill */}
          <button
            onClick={() => handleTabClick('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'profile'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700'
            }`}
            title="View Player Profile & Match History"
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>{puzzleRating}</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Platform Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white lg:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/80 bg-[#070c14]/98 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-1.5 pb-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => handleTabClick('friends')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                currentTab === 'friends' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Pass & Play</span>
            </button>
            <button
              onClick={() => handleTabClick('profile')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                currentTab === 'profile' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Profile ({puzzleRating})</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

