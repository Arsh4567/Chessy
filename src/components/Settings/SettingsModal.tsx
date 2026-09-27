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
import { 
  X, 
  Volume2, 
  VolumeX, 
  Eye, 
  Check, 
  Sliders, 
  Palette, 
  Zap, 
  Clock, 
  Bell, 
  BellRing, 
  BellOff, 
  Send, 
  Sparkles, 
  Flame, 
  Users, 
  Bot,
  ExternalLink,
  Timer,
  Calendar
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}) => {
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

  if (!isOpen) return null;

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

  const themes: { id: UserPreferences['boardTheme']; name: string; light: string; dark: string }[] = [
    { id: 'cobalt', name: 'Cobalt', light: '#C8D7E6', dark: '#1E3650' },
    { id: 'emerald', name: 'Emerald', light: '#ECEED2', dark: '#769656' },
    { id: 'wood', name: 'Walnut', light: '#F0D9B5', dark: '#B58863' },
    { id: 'midnight', name: 'Midnight', light: '#334155', dark: '#0F172A' },
    { id: 'cyber', name: 'Cyber', light: '#67E8F9', dark: '#0E7490' },
    { id: 'marble', name: 'Marble', light: '#F1F5F9', dark: '#64748B' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">Settings & Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* OS-Level Web Push Notifications Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  OS & System Push Notifications
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                permissionState === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : permissionState === 'denied'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {permissionState === 'granted' ? '● Active' : permissionState === 'denied' ? '● Blocked in Browser' : '● Setup Needed'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Delivers native notifications directly to your <strong>Windows Action Center</strong>, <strong>macOS Notification Center</strong>, <strong>Android notification tray</strong>, or <strong>Firefox / Chrome message list</strong> even when you are not using the app!
            </p>

            {/* Smart 10-Minute Prior Streak Saver HUD */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-white">Smart 10-Minute Streak Reminder</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-orange-500 text-[10px] font-mono text-slate-950 font-black">
                  10m BEFORE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Your Routine Online Time</span>
                  <span className="text-white font-mono font-bold text-xs">
                    {notificationConfig.autoLearnRoutine ? `🤖 ${learnedRoutine.formatted} (Learned)` : `⏰ ${notificationConfig.customRoutineTime || '8:00 PM'}`}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/30">
                  <span className="text-amber-400 block text-[10px] font-bold">10-Min Warning Alert</span>
                  <span className="text-amber-300 font-mono font-bold text-xs">
                    🔔 {warningTime.formatted}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                  <input
                    type="checkbox"
                    checked={notificationConfig.autoLearnRoutine}
                    onChange={(e) => updateNotif('autoLearnRoutine', e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Auto-detect my online habits</span>
                </label>

                {!notificationConfig.autoLearnRoutine && (
                  <input
                    type="time"
                    value={notificationConfig.customRoutineTime || '20:00'}
                    onChange={(e) => updateNotif('customRoutineTime', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                  />
                )}
              </div>
            </div>

            {isRunningInIframe() && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>💡 Note for Embedded Preview:</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Browsers require opening the direct app URL in a top-level tab to grant OS-level desktop notification permissions.
                </p>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <span>Open Standalone Tab to Grant OS Permission</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="space-y-2.5 pt-1 text-xs">
              <button
                onClick={handleTogglePushPermission}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{permissionState === 'granted' ? 'Re-Verify OS Notifications' : 'Enable Native OS Web Push'}</span>
              </button>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>"10-min warning before routine to keep streak"</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationConfig.streakSaver}
                    onChange={(e) => updateNotif('streakSaver', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Bot className="w-3.5 h-3.5 text-sky-400" />
                    <span>"Stockfish is waiting for you" reminders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationConfig.botReminders}
                    onChange={(e) => updateNotif('botReminders', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>"Play with your friends" invites</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationConfig.friendChallenges}
                    onChange={(e) => updateNotif('friendChallenges', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60">
                  <button
                    onClick={handleTestStreakSaver}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/40"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>{streakTestSent ? '✅ 10m Alert Sent!' : 'Test 10-Min Streak Alert'}</span>
                  </button>

                  <button
                    onClick={handleDelayedOSPush}
                    disabled={delayedCountdown !== null}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>
                      {delayedCountdown !== null ? `Firing in ${delayedCountdown}s (Minimize tab now!)` : 'Delayed OS Test (5s)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Board Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              <span>Board Theme</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update('boardTheme', t.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                    preferences.boardTheme === t.id
                      ? 'border-sky-400 bg-sky-400/15 shadow-sm shadow-sky-950'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 shadow">
                    <div style={{ backgroundColor: t.light }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.light }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stockfish Engine Elo Selection */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Zap className="w-4 h-4 text-sky-400" />
                <span>Stockfish Default Level</span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">
                {Math.round(400 + (preferences.stockfishLevel / 20) * 2400)} Elo
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={preferences.stockfishLevel}
              onChange={(e) => update('stockfishLevel', parseInt(e.target.value, 10))}
              className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>400</span>
              <span>1000</span>
              <span>1600</span>
              <span>2200</span>
              <span>2800</span>
            </div>
          </div>

          {/* Gameplay Toggles */}
          <div className="space-y-3 divide-y divide-slate-800">
            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                {preferences.soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span className="text-xs font-medium text-slate-200">Sound Effects</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => update('soundEnabled', e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
              />
            </label>

            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-medium text-slate-200">Board Coordinates</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.showCoordinates}
                onChange={(e) => update('showCoordinates', e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
              />
            </label>

            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🟢</span>
                <span className="text-xs font-medium text-slate-200">Legal Move Highlights</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.showLegalMoves}
                onChange={(e) => update('showLegalMoves', e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
              />
            </label>

            <label className="pt-3 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <span className="text-base">♛</span>
                <span className="text-xs font-medium text-slate-200">Auto Queen Promotion</span>
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

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-950/50 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
