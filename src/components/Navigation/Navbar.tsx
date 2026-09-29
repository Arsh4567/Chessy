import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  LayoutDashboard,
  MoreHorizontal,
  Bug,
  Terminal
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
  onOpenReportBug?: () => void;
  onOpenAdminTriage?: () => void;
  puzzleRating?: number;
  multiplayerRating?: number;
  multiplayerGamesPlayed?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  onOpenReportBug,
  onOpenAdminTriage,
  puzzleRating = 1500,
  multiplayerRating = 800,
  multiplayerGamesPlayed = 0,
}) => {
  const { user, isAnonymous, openAuthModal, loading } = useAuth();
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    if (moreDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [moreDropdownOpen]);

  const primaryNav = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'play' as NavTab, label: 'Play', icon: Swords },
    { id: 'friends' as NavTab, label: 'Multiplayer', icon: Users },
    { id: 'puzzles' as NavTab, label: 'Puzzles', icon: Zap },
    { id: 'learn' as NavTab, label: 'Openings', icon: BookOpen },
    { id: 'analyze' as NavTab, label: 'Analysis', icon: Search },
  ];

  const secondaryNav = [
    { id: 'leaderboard' as NavTab, label: 'Leaderboard', icon: Trophy, desc: 'Rankings & Tiers' },
    { id: 'games' as NavTab, label: 'Chess.com Archive', icon: Globe, desc: 'Sync & Review Matches' },
    { id: 'profile' as NavTab, label: 'User Dashboard', icon: LayoutDashboard, desc: 'Stats & History' },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMoreDropdownOpen(false);
  };

  const isSecondaryActive = currentTab === 'leaderboard' || currentTab === 'games' || currentTab === 'profile';

  return (
    <>
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#070c14]/95 border-b border-slate-800/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <button
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-2.5 text-white hover:text-sky-300 transition-colors cursor-pointer group shrink-0 text-left focus-visible:outline-sky-400"
            aria-label="Chessy Home"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 group-hover:border-sky-500/50 flex items-center justify-center text-sky-400 text-base font-black shadow-sm transition-all duration-200">
              ♚
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base font-bold font-display tracking-tight text-white group-hover:text-sky-300 transition-colors">
                  Chessy
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/25 text-[10px] font-bold text-sky-400 uppercase tracking-wider hidden sm:inline-block">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5 leading-none">
                Grandmaster Studio
              </span>
            </div>
          </button>

          {/* Desktop Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-sky-400 ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700/80 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* More Dropdown (Secondary Navigation) */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1 cursor-pointer select-none focus-visible:outline-sky-400 ${
                  isSecondaryActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700/80 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${moreDropdownOpen ? 'rotate-180 text-sky-400' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0c1424] border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 mb-1">
                    Features & Stats
                  </div>
                  {secondaryNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                          isActive 
                            ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30' 
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal truncate">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}

                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-t border-slate-800/80 mt-1 mb-0.5">
                    Engineering & Support
                  </div>

                  {onOpenReportBug && (
                    <button
                      onClick={() => {
                        setMoreDropdownOpen(false);
                        onOpenReportBug();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                        <Bug className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">Report a Problem</div>
                        <div className="text-[10px] text-amber-400/80 font-normal truncate">Submit bug with auto-diagnostics</div>
                      </div>
                    </button>
                  )}

                  {onOpenAdminTriage && (
                    <button
                      onClick={() => {
                        setMoreDropdownOpen(false);
                        onOpenAdminTriage();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 text-sky-300 hover:bg-sky-500/10 hover:text-sky-200 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 shrink-0">
                        <Terminal className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex items-center justify-between gap-1">
                        <div className="truncate font-semibold">Jules Agent Triage</div>
                        <span className="px-1 py-0.2 rounded bg-sky-400/20 text-[9px] font-mono text-sky-300">ADMIN</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right Header Controls (Rating Chip, Auth, Settings with Subtle Divider) */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block h-4 w-px bg-slate-800/80 mx-1" aria-hidden="true" />

            {/* User Profile & Rating Indicator */}
            <button
              onClick={() => handleTabClick('profile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all duration-150 cursor-pointer flex items-center gap-2 focus-visible:outline-sky-400 ${
                currentTab === 'profile'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
              title={isAnonymous ? 'Playing as Guest' : `Multiplayer: ${multiplayerRating} Elo • Tactics: ${puzzleRating}`}
              aria-label="User Profile"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="font-bold text-amber-400 tabular-nums">{multiplayerRating}</span>
              <span className="text-slate-400 font-normal text-[11px] hidden sm:inline">Elo</span>
              {isAnonymous ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono leading-none">
                  Guest
                </span>
              ) : user ? (
                <Cloud className="w-3 h-3 text-emerald-400/80" />
              ) : null}
            </button>

            {/* Sign In / Save Account Button */}
            {(!user || isAnonymous) && !loading && (
              <button
                onClick={() => openAuthModal(isAnonymous ? 'signup' : 'login')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-semibold transition-all cursor-pointer hidden sm:flex items-center gap-1.5 focus-visible:outline-amber-400"
                title={isAnonymous ? 'Save ratings and match records' : 'Sign in to your account'}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isAnonymous ? 'Save Progress' : 'Sign In'}</span>
              </button>
            )}

            {/* Bug Report Button */}
            {onOpenReportBug && (
              <button
                onClick={onOpenReportBug}
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-amber-400/80 hover:text-amber-300 hover:border-amber-500/40 hover:bg-slate-800/60 transition-all cursor-pointer focus-visible:outline-amber-400"
                title="Report a Problem"
                aria-label="Report a Problem"
              >
                <Bug className="w-4 h-4" />
              </button>
            )}

            {/* Platform Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer focus-visible:outline-sky-400"
              title="Platform Settings"
              aria-label="Platform Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Ergonomic Touch Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070c14]/95 border-t border-slate-800/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around" aria-label="Mobile Navigation">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer select-none ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Mobile More Button for Secondary Tabs */}
        <button
          onClick={() => setMoreDropdownOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer select-none ${
            isSecondaryActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="More navigation options"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[11px] font-medium leading-tight">More</span>
        </button>
      </nav>

      {/* Mobile More Sheet Modal */}
      {moreDropdownOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end p-4 animate-in fade-in duration-150">
          <div className="bg-[#0c1424] border border-slate-800 rounded-3xl p-4 space-y-2 shadow-2xl mb-14">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">More Views</span>
              <button 
                onClick={() => setMoreDropdownOpen(false)}
                className="text-xs text-slate-400 hover:text-white font-semibold py-1 px-2"
              >
                Close
              </button>
            </div>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors text-left ${
                    isActive 
                      ? 'bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30' 
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
