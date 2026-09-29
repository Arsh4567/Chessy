import React, { useState, useEffect } from 'react';
import { UserPreferences } from '../../utils/storage';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  loadNotificationConfig, 
  saveNotificationConfig, 
  triggerMotivationalPush, 
  trigger10MinStreakAlert,
  scheduleDelayedOSPush,
  getLearnedRoutineTime,
  get10MinWarningTime,
  isRunningInIframe,
  PushNotificationConfig, 
  NotificationPermissionState 
} from '../../utils/pushNotifications';
import { sound } from '../../utils/sound';
import { ChessyModal } from '../common/ChessyModal';
import { ChessyButton } from '../common/ChessyButton';
import { ChessyBadge } from '../common/ChessyBadge';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  Sliders, 
  Palette, 
  Zap, 
  Bell, 
  BellRing, 
  Flame, 
  Users, 
  Bot,
  ExternalLink,
  Timer,
  CheckCircle2,
  Gamepad2,
  Cpu
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
}

type SettingsSection = 'gameplay' | 'board' | 'engine' | 'notifications';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('gameplay');
  const [notificationConfig, setNotificationConfig] = useState<PushNotificationConfig>(loadNotificationConfig);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(getNotificationPermission);
  const [testPushSent, setTestPushSent] = useState<boolean>(false);
  const [streakTestSent, setStreakTestSent] = useState<boolean>(false);
  const [delayedCountdown, setDelayedCountdown] = useState<number | null>(null);

  const learnedRoutine = getLearnedRoutineTime();
  const warningTime = get10MinWarningTime();

  useEffect(() => {
    if (isOpen) {
      setPermissionState(getNotificationPermission());
      setNotificationConfig(loadNotificationConfig());
    }
  }, [isOpen]);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    onUpdatePreferences({ ...preferences, [key]: value });
  };

  const updateNotif = <K extends keyof PushNotificationConfig>(key: K, value: PushNotificationConfig[K]) => {
    const updated = { ...notificationConfig, [key]: value };
    setNotificationConfig(updated);
    saveNotificationConfig(updated);
  };

  const handleTogglePushPermission = async () => {
    sound.playMove();
    const newPerm = await requestNotificationPermission();
    setPermissionState(newPerm);
    setNotificationConfig(loadNotificationConfig());
  };

  const handleSendTestPush = () => {
    sound.playMatchStart();
    const success = triggerMotivationalPush(true);
    if (success) {
      setTestPushSent(true);
      setTimeout(() => setTestPushSent(false), 3000);
    }
  };

  const handleTestStreakSaver = () => {
    sound.playMatchStart();
    const success = trigger10MinStreakAlert(true);
    if (success) {
      setStreakTestSent(true);
      setTimeout(() => setStreakTestSent(false), 3000);
    }
  };

  const handleDelayedOSPush = () => {
    sound.playMatchStart();
    setDelayedCountdown(5);
    scheduleDelayedOSPush(
      '🔥 10-Minute Warning: Keep your streak going!',
      'Your daily chess session starts in 10 minutes! Play a match now to defend your winning streak and climb the leaderboard.',
      5
    );

    const interval = setInterval(() => {
      setDelayedCountdown((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const themes: { id: UserPreferences['boardTheme']; name: string; light: string; dark: string; tag: string }[] = [
    { id: 'emerald', name: 'Emerald', light: '#ECEED2', dark: '#769656', tag: 'Tournament Classic' },
    { id: 'wood', name: 'Walnut Wood', light: '#F0D9B5', dark: '#B58863', tag: 'Natural Timber' },
    { id: 'cobalt', name: 'Cobalt', light: '#D8E2DC', dark: '#223843', tag: 'Oceanic Focus' },
    { id: 'midnight', name: 'Midnight', light: '#E2E8F0', dark: '#334155', tag: 'Deep Contrast' },
    { id: 'cyber', name: 'Cyber', light: '#334155', dark: '#0F172A', tag: 'Matrix Emerald' },
    { id: 'marble', name: 'Marble', light: '#F8FAFC', dark: '#64748B', tag: 'Polished Stone' },
  ];

  const sections = [
    { id: 'gameplay' as SettingsSection, label: 'Gameplay', icon: Gamepad2 },
    { id: 'board' as SettingsSection, label: 'Board', icon: Palette },
    { id: 'engine' as SettingsSection, label: 'Engine', icon: Cpu },
    { id: 'notifications' as SettingsSection, label: 'Alerts', icon: Bell },
  ];

  return (
    <ChessyModal
      isOpen={isOpen}
      onClose={onClose}
      title="Platform Settings"
      subtitle="Customize gameplay, visuals, Stockfish engine, and reminders"
      icon={<Sliders className="w-5 h-5 text-sky-400" />}
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 font-mono">
            Auto-saved to device
          </span>
          <ChessyButton variant="primary" size="sm" onClick={onClose}>
            Done
          </ChessyButton>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Navigation Section Tabs */}
        <div className="grid grid-cols-4 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. GAMEPLAY SETTINGS */}
        {activeSection === 'gameplay' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Assistance & Controls
              </span>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:bg-slate-850/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                    {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Sound Effects</div>
                    <div className="text-[11px] text-slate-400">Audio feedback on moves, captures, checks, and game results</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => update('soundEnabled', e.target.checked)}
                  className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:bg-slate-850/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Board Coordinates</div>
                    <div className="text-[11px] text-slate-400">Display files (a-h) and ranks (1-8) along board edges</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.showCoordinates}
                  onChange={(e) => update('showCoordinates', e.target.checked)}
                  className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:bg-slate-850/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Legal Move Highlights</div>
                    <div className="text-[11px] text-slate-400">Show subtle dots and capture rings for selected pieces</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.showLegalMoves}
                  onChange={(e) => update('showLegalMoves', e.target.checked)}
                  className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:bg-slate-850/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 text-sm shrink-0">
                    ♛
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Auto Queen Promotion</div>
                    <div className="text-[11px] text-slate-400">Automatically promote pawns to queens without popup dialog</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoQueen}
                  onChange={(e) => update('autoQueen', e.target.checked)}
                  className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* 2. BOARD THEME SETTINGS */}
        {activeSection === 'board' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Visual Style
              </span>
              <span className="text-xs font-mono text-sky-400">
                Active: {themes.find(t => t.id === preferences.boardTheme)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themes.map((t) => {
                const isSelected = preferences.boardTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => update('boardTheme', t.id)}
                    className={`flex flex-col items-start gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/10 shadow-md ring-1 ring-sky-500/40'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                    }`}
                  >
                    <div className="w-full aspect-[2/1] rounded-xl overflow-hidden grid grid-cols-4 grid-rows-2 shadow-inner border border-black/40">
                      <div style={{ backgroundColor: t.light }} />
                      <div style={{ backgroundColor: t.dark }} />
                      <div style={{ backgroundColor: t.light }} />
                      <div style={{ backgroundColor: t.dark }} />
                      <div style={{ backgroundColor: t.dark }} />
                      <div style={{ backgroundColor: t.light }} />
                      <div style={{ backgroundColor: t.dark }} />
                      <div style={{ backgroundColor: t.light }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center justify-between w-full">
                        <span>{t.name}</span>
                        {isSelected && <span className="text-sky-400 text-xs">✓</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">{t.tag}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. ENGINE SETTINGS */}
        {activeSection === 'engine' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Stockfish 19 AI Difficulty
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjusts computational search depth, positional evaluation, and calculation speed
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black font-mono text-sky-400 block tabular-nums">
                    {Math.round(400 + ((preferences.stockfishLevel ?? 10) / 20) * 2400)} Elo
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Skill Level {preferences.stockfishLevel ?? 10}/20</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={preferences.stockfishLevel ?? 10}
                onChange={(e) => update('stockfishLevel', parseInt(e.target.value, 10))}
                className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />

              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                <span>Novice (400)</span>
                <span>Club (1400)</span>
                <span>Master (2200)</span>
                <span>Grandmaster (2800)</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. NOTIFICATIONS SETTINGS */}
        {activeSection === 'notifications' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Status Card */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">System Push Notifications</span>
                </div>
                <ChessyBadge 
                  variant={permissionState === 'granted' ? 'success' : permissionState === 'denied' ? 'danger' : 'warning'}
                  size="sm"
                >
                  {permissionState === 'granted' ? '● Active' : permissionState === 'denied' ? '● Blocked' : '● Setup Needed'}
                </ChessyBadge>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Native push notifications keep your tactical streak alive and alert you to incoming friend challenges even when the browser tab is closed.
              </p>

              {isRunningInIframe() && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💡 Browser Security Note:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Web push notification permissions require opening the standalone app in a top-level tab.
                  </p>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-bold underline hover:text-white"
                  >
                    <span>Open in top-level tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <ChessyButton
                variant={permissionState === 'granted' ? 'secondary' : 'primary'}
                size="sm"
                className="w-full"
                onClick={handleTogglePushPermission}
                leftIcon={<Bell className="w-3.5 h-3.5" />}
              >
                {permissionState === 'granted' ? 'Re-Verify OS Notifications' : 'Enable Native Web Push'}
              </ChessyButton>
            </div>

            {/* Smart 10-Min Streak Saver */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-white">Smart 10-Minute Streak Saver</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500 text-slate-950 font-bold">
                  PRE-ALERT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Your Routine Time</span>
                  <span className="text-white font-mono font-bold">
                    {notificationConfig.autoLearnRoutine ? `🤖 ${learnedRoutine.formatted}` : `⏰ ${notificationConfig.customRoutineTime || '8:00 PM'}`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30">
                  <span className="text-amber-400 block text-[10px] font-bold">10-Min Warning</span>
                  <span className="text-amber-300 font-mono font-bold">
                    🔔 {warningTime.formatted}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-slate-300">Streak defense warning (10 mins before routine)</span>
                  <input
                    type="checkbox"
                    checked={notificationConfig.streakSaver}
                    onChange={(e) => updateNotif('streakSaver', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-slate-300">Stockfish sparring partner reminders</span>
                  <input
                    type="checkbox"
                    checked={notificationConfig.botReminders}
                    onChange={(e) => updateNotif('botReminders', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-slate-300">Friend match invitations</span>
                  <input
                    type="checkbox"
                    checked={notificationConfig.friendChallenges}
                    onChange={(e) => updateNotif('friendChallenges', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Push Testing Tools */}
              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/60">
                <ChessyButton
                  variant="secondary"
                  size="sm"
                  onClick={handleTestStreakSaver}
                  leftIcon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
                >
                  {streakTestSent ? '✅ Alert Sent!' : 'Test Streak Alert'}
                </ChessyButton>

                <ChessyButton
                  variant="secondary"
                  size="sm"
                  onClick={handleDelayedOSPush}
                  disabled={delayedCountdown !== null}
                  leftIcon={<Timer className="w-3.5 h-3.5" />}
                >
                  {delayedCountdown !== null ? `Firing in ${delayedCountdown}s` : 'Delayed Test (5s)'}
                </ChessyButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChessyModal>
  );
};
