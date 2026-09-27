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
  LogIn,
  Cloud,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  multiplayerRating?: number;
  multiplayerGamesPlayed?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  puzzleRating = 1500,
  multiplayerRating = 800,
  multiplayerGamesPlayed = 0,
}) => {
  const { user, signInWithGoogle, loading } = useAuth();
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const primaryNav = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'play' as NavTab, label: 'Play', icon: Swords },
    { id: 'friends' as NavTab, label: 'Multiplayer', icon: Users },
    { id: 'puzzles' as NavTab, label: 'Puzzles', icon: Zap },
    { id: 'learn' as NavTab, label: 'Openings', icon: BookOpen },
    { id: 'analyze' as NavTab, label: 'Analysis', icon: Search },
  ];

  const secondaryNav = [
    { id: 'leaderboard' as NavTab, label: 'Leaderboard', icon: Trophy },
    { id: 'games' as NavTab, label: 'Chess.com Archive', icon: Globe },
    { id: 'profile' as NavTab, label: 'My Career Profile', icon: User },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMoreDropdownOpen(false);
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070b14]/95 border-b border-slate-800/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <button
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-2.5 text-white hover:text-sky-300 transition-colors cursor-pointer group shrink-0 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white text-base font-black shadow-sm group-hover:scale-105 transition-transform">
              ♚
            </div>
            <div>
              <span className="text-sm font-bold font-display tracking-wider uppercase block leading-none text-white">
                Grandmaster
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Chess Platform
              </span>
            </div>
          </button>

          {/* Desktop Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* More dropdown for secondary tabs */}
            <div className="relative">
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  currentTab === 'leaderboard' || currentTab === 'games' || currentTab === 'profile'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850/60'
                }`}
              >
                <span>More</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {secondaryNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                          isActive ? 'bg-sky-500/15 text-sky-300 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Header Controls (Auth, Profile, Settings) */}
          <div className="flex items-center gap-2">
            {/* User Profile & Rating */}
            <button
              onClick={() => handleTabClick('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === 'profile'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-slate-900/80 border border-slate-800/90 text-slate-200 hover:border-slate-700'
              }`}
              title={`Multiplayer: ${multiplayerRating} Elo • Tactics: ${puzzleRating}`}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-4 h-4 rounded-full" />
              ) : (
                <User className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="font-bold text-amber-400">{multiplayerRating}</span>
              <span className="text-slate-400 font-normal">Elo</span>
              <Cloud className="w-3 h-3 text-emerald-400/80" />
            </button>

            {/* Google Sign In Button if not logged in */}
            {!user && !loading && (
              <button
                onClick={() => signInWithGoogle()}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer hidden sm:flex items-center gap-1.5"
                title="Sign in with Google to sync Elo ratings and match history across devices in Firebase Firestore"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/90 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              title="Platform Settings"
              aria-label="Platform Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar for instantaneous touch ergonomics */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/98 border-t border-slate-800/90 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
