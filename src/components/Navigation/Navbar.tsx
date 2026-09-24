import React from 'react';
import { Bell, Swords } from 'lucide-react';
import { PlayerProfile, AppNotification } from '../../types/chess';

interface NavbarProps {
  currentTab: 'play' | 'bots' | 'tournaments' | 'puzzles' | 'dashboard' | 'social';
  onSelectTab: (tab: 'play' | 'bots' | 'tournaments' | 'puzzles' | 'dashboard' | 'social') => void;
  profile: PlayerProfile;
  notifications: AppNotification[];
  onToggleNotifications: () => void;
  onQuickPlay: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  profile,
  notifications,
  onToggleNotifications,
  onQuickPlay,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="relative z-40 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element Brand Wordmark */}
        <button
          onClick={() => onSelectTab('play')}
          className="text-lg sm:text-xl font-extrabold font-display tracking-tight text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
        >
          Grandmaster Studio
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('play')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'play' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Play
          </button>
          <button
            onClick={() => onSelectTab('bots')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'bots' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Bots
          </button>
          <button
            onClick={() => onSelectTab('tournaments')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'tournaments' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Tournaments
          </button>
          <button
            onClick={() => onSelectTab('puzzles')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'puzzles' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Puzzles
          </button>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'dashboard' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('social')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'social' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Feed
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={onToggleNotifications}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[10px] flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Play CTA */}
          <button
            onClick={onQuickPlay}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Play Online</span>
            <span className="sm:hidden">Play</span>
          </button>

          {/* User Profile Pill */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer"
            title="View Profile & Rating Dashboard"
          >
            <span className="text-base">{profile.avatar}</span>
            <span className="text-xs font-mono font-bold text-amber-400 hidden sm:inline">
              {profile.ratingBlitz}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-950 border-t border-slate-800/80 py-2 px-1 text-[11px] font-semibold text-slate-400">
        <button
          onClick={() => onSelectTab('play')}
          className={`px-2 py-1 ${currentTab === 'play' ? 'text-amber-400 font-bold' : ''}`}
        >
          Play
        </button>
        <button
          onClick={() => onSelectTab('bots')}
          className={`px-2 py-1 ${currentTab === 'bots' ? 'text-amber-400 font-bold' : ''}`}
        >
          Bots
        </button>
        <button
          onClick={() => onSelectTab('tournaments')}
          className={`px-2 py-1 ${currentTab === 'tournaments' ? 'text-amber-400 font-bold' : ''}`}
        >
          Arena
        </button>
        <button
          onClick={() => onSelectTab('puzzles')}
          className={`px-2 py-1 ${currentTab === 'puzzles' ? 'text-amber-400 font-bold' : ''}`}
        >
          Puzzles
        </button>
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-2 py-1 ${currentTab === 'dashboard' ? 'text-amber-400 font-bold' : ''}`}
        >
          Stats
        </button>
        <button
          onClick={() => onSelectTab('social')}
          className={`px-2 py-1 ${currentTab === 'social' ? 'text-amber-400 font-bold' : ''}`}
        >
          Feed
        </button>
      </div>
    </header>
  );
};
