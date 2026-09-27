/**
 * Web Push & Native Operating System Notification System
 * Includes AI Online Habit Learning & 10-Minute Pre-Session Streak Saver Alerts.
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationConfig {
  enabled: boolean;
  inAppAlerts: boolean;
  botReminders: boolean; // "Stockfish is waiting for you"
  friendChallenges: boolean; // "Play with your friends"
  streakSaver: boolean; // "Win the next match to keep up the streak"
  dailyPuzzle: boolean; // "Today's tactical puzzle is ready"
  autoLearnRoutine: boolean; // Automatically learn daily online time
  customRoutineTime?: string; // "HH:MM" e.g. "20:00"
  streakWarningMinutes: number; // Defaults to 10 minutes before
}

export interface InAppPushPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  timestamp: number;
}

const STORAGE_KEY = 'gm_push_notification_config_v2';
const SESSIONS_HISTORY_KEY = 'gm_online_sessions_history_v1';
const LAST_MOTIVATIONAL_PUSH_KEY = 'gm_last_motivational_push_time';
const LAST_STREAK_PUSH_DATE_KEY = 'gm_last_streak_push_date';

export const DEFAULT_NOTIFICATION_CONFIG: PushNotificationConfig = {
  enabled: true,
  inAppAlerts: true,
  botReminders: true,
  friendChallenges: true,
  streakSaver: true,
  dailyPuzzle: true,
  autoLearnRoutine: true,
  customRoutineTime: '20:00', // 8:00 PM default
  streakWarningMinutes: 10, // 10 minutes before
};

export const MOTIVATIONAL_NOTIFICATIONS = [
  {
    title: '🤖 Stockfish is waiting for you!',
    body: 'The engine is ready on the board. Test your opening repertoire and tactical sharpness today!',
    type: 'botReminders' as const,
  },
  {
    title: '👥 Play with your friends!',
    body: 'Your fellow grandmasters and club members are online. Send a 3+0 Blitz challenge now!',
    type: 'friendChallenges' as const,
  },
  {
    title: '🔥 Win the next match to keep up the streak!',
    body: 'Play today to safeguard your rating momentum and climb the global leaderboard!',
    type: 'streakSaver' as const,
  },
  {
    title: '🧩 Today’s Daily Tactical Challenge is live!',
    body: 'A fresh master-level tactic from Lichess is ready for you to solve in 3 moves or less.',
    type: 'dailyPuzzle' as const,
  },
];

type InAppPushListener = (payload: InAppPushPayload) => void;
const inAppPushListeners: Set<InAppPushListener> = new Set();

export function subscribeToInAppPush(listener: InAppPushListener): () => void {
  inAppPushListeners.add(listener);
  return () => {
    inAppPushListeners.delete(listener);
  };
}

function emitInAppPush(title: string, body: string, icon?: string, url?: string) {
  const payload: InAppPushPayload = {
    id: `push_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    body,
    icon: icon || '/white_knight.png',
    url: url || '/',
    timestamp: Date.now(),
  };
  inAppPushListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {}
  });
}

export function loadNotificationConfig(): PushNotificationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_NOTIFICATION_CONFIG;
}

export function saveNotificationConfig(config: PushNotificationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

let swRegistration: ServiceWorkerRegistration | null = null;

export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  if (swRegistration) return swRegistration;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('SW registration notice:', err);
    return null;
  }
}

/**
 * Records an online session timestamp to learn the user's daily habitual play schedule
 */
export function recordUserOnlineSession(): void {
  try {
    const now = new Date();
    const sessionEntry = {
      timestamp: now.getTime(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };

    const raw = localStorage.getItem(SESSIONS_HISTORY_KEY);
    let history: { timestamp: number; hour: number; minute: number }[] = raw ? JSON.parse(raw) : [];
    
    // Only add if at least 30 minutes passed since last recorded session
    const last = history[history.length - 1];
    if (!last || sessionEntry.timestamp - last.timestamp > 30 * 60 * 1000) {
      history.push(sessionEntry);
      // Keep last 30 sessions
      if (history.length > 30) history = history.slice(-30);
      localStorage.setItem(SESSIONS_HISTORY_KEY, JSON.stringify(history));
    }
  } catch {}
}

/**
 * Computes the learned habitual daily time when the user comes online
 */
export function getLearnedRoutineTime(): { hour: number; minute: number; formatted: string } {
  try {
    const raw = localStorage.getItem(SESSIONS_HISTORY_KEY);
    if (raw) {
      const history: { hour: number; minute: number }[] = JSON.parse(raw);
      if (history.length > 0) {
        // Average the hours and minutes
        const totalMinutes = history.reduce((acc, curr) => acc + (curr.hour * 60 + curr.minute), 0);
        const avgMinutes = Math.round(totalMinutes / history.length);
        const hour = Math.floor(avgMinutes / 60) % 24;
        const minute = avgMinutes % 60;
        
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const displayMin = minute < 10 ? `0${minute}` : minute;

        return {
          hour,
          minute,
          formatted: `${displayHour}:${displayMin} ${period}`,
        };
      }
    }
  } catch {}

  return { hour: 20, minute: 0, formatted: '8:00 PM' }; // Default 8:00 PM
}

/**
 * Computes the exact target alert time (10 minutes before the user's habitual online time)
 */
export function get10MinWarningTime(): { hour: number; minute: number; formatted: string } {
  const config = loadNotificationConfig();
  let routineHour = 20;
  let routineMinute = 0;

  if (config.autoLearnRoutine) {
    const learned = getLearnedRoutineTime();
    routineHour = learned.hour;
    routineMinute = learned.minute;
  } else if (config.customRoutineTime) {
    const parts = config.customRoutineTime.split(':').map((n) => parseInt(n, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      routineHour = parts[0];
      routineMinute = parts[1];
    }
  }

  // Subtract 10 minutes
  let warningTotalMinutes = routineHour * 60 + routineMinute - (config.streakWarningMinutes || 10);
  if (warningTotalMinutes < 0) warningTotalMinutes += 24 * 60;

  const warnHour = Math.floor(warningTotalMinutes / 60) % 24;
  const warnMinute = warningTotalMinutes % 60;

  const period = warnHour >= 12 ? 'PM' : 'AM';
  const displayHour = warnHour % 12 === 0 ? 12 : warnHour % 12;
  const displayMin = warnMinute < 10 ? `0${warnMinute}` : warnMinute;

  return {
    hour: warnHour,
    minute: warnMinute,
    formatted: `${displayHour}:${displayMin} ${period}`,
  };
}

/**
 * Requests Native OS Push Notification Permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  getOrRegisterServiceWorker();

  try {
    let result: NotificationPermission = 'default';

    const reqPromise = Notification.requestPermission();
    if (reqPromise && typeof reqPromise.then === 'function') {
      result = await reqPromise;
    } else {
      result = await new Promise((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    const isGranted = result === 'granted';
    const currentConfig = loadNotificationConfig();
    saveNotificationConfig({ ...currentConfig, enabled: true, inAppAlerts: true });

    if (isGranted) {
      sendPushNotification(
        '⚔️ GrandmasterHub Notifications Active',
        'You will now receive native OS alerts 10 minutes before your daily routine to keep your streak alive!'
      );
    }

    return result as NotificationPermissionState;
  } catch (err) {
    console.warn('Native permission request note:', err);
    return 'default';
  }
}

/**
 * Dispatches a Real OS System Notification (Windows Action Center, macOS, Android Tray)
 */
export async function sendPushNotification(
  title: string,
  body: string,
  options: {
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  } = {}
): Promise<boolean> {
  const icon = options.icon || `${window.location.origin}/white_knight.png`;
  const badge = options.badge || `${window.location.origin}/white_knight.png`;
  const tag = options.tag || 'gm_os_notification';

  emitInAppPush(title, body, icon, options.url);

  if (getNotificationPermission() === 'granted') {
    try {
      const reg = await getOrRegisterServiceWorker();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url: options.url || '/' },
        } as any);
        return true;
      }

      const n = new Notification(title, {
        body,
        icon,
        badge,
        tag,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch (err) {
      console.warn('Native notification delivery note:', err);
    }
  }

  return true;
}

/**
 * Schedules a delayed OS background notification
 */
export async function scheduleDelayedOSPush(
  title: string,
  body: string,
  delaySeconds: number = 5
): Promise<void> {
  try {
    const reg = await getOrRegisterServiceWorker();
    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title,
        body,
        delayMs: delaySeconds * 1000,
        icon: '/white_knight.png',
      });
    }
  } catch {}

  setTimeout(() => {
    sendPushNotification(title, body);
  }, delaySeconds * 1000);
}

/**
 * Triggers the 10-Minute Streak Saver Alert immediately or on test
 */
export function trigger10MinStreakAlert(force: boolean = false): boolean {
  const config = loadNotificationConfig();
  if (!config.enabled && !force) return false;

  const title = '🔥 10-Minute Warning: Keep your streak going!';
  const body = 'Your daily chess session starts in 10 minutes! Play a match now to defend your winning streak and climb the leaderboard.';

  sendPushNotification(title, body);

  const todayStr = new Date().toISOString().split('T')[0];
  try {
    localStorage.setItem(LAST_STREAK_PUSH_DATE_KEY, todayStr);
  } catch {}

  return true;
}

/**
 * Triggers random motivational push
 */
export function triggerMotivationalPush(force: boolean = false): boolean {
  const config = loadNotificationConfig();
  if (!config.enabled && !force) return false;

  const validItems = MOTIVATIONAL_NOTIFICATIONS.filter((item) => {
    if (force) return true;
    return config[item.type];
  });

  if (validItems.length === 0) return false;

  const randomItem = validItems[Math.floor(Math.random() * validItems.length)];
  sendPushNotification(randomItem.title, randomItem.body);

  try {
    localStorage.setItem(LAST_MOTIVATIONAL_PUSH_KEY, Date.now().toString());
  } catch {}

  return true;
}

/**
 * Checks and triggers the 10-minute streak reminder if the current time matches the calculated alert window
 */
export function checkStreakWarningSchedule(): void {
  const config = loadNotificationConfig();
  if (!config.enabled || !config.streakSaver) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastAlertDate = localStorage.getItem(LAST_STREAK_PUSH_DATE_KEY);

  // Already sent alert today
  if (lastAlertDate === todayStr) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const warningTime = get10MinWarningTime();

  // Check if we are within the warning minute window
  if (currentHour === warningTime.hour && Math.abs(currentMinute - warningTime.minute) <= 1) {
    trigger10MinStreakAlert(false);
  }
}

/**
 * Schedules the background Service Worker notification for the next 10-minute streak alert
 */
export async function scheduleNextStreakAlertInServiceWorker(): Promise<void> {
  const warningTime = get10MinWarningTime();
  const now = new Date();

  const targetDate = new Date();
  targetDate.setHours(warningTime.hour, warningTime.minute, 0, 0);

  // If time has already passed today, schedule for tomorrow
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const delayMs = targetDate.getTime() - now.getTime();

  try {
    const reg = await getOrRegisterServiceWorker();
    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: '🔥 10-Minute Warning: Keep your streak going!',
        body: 'Your daily chess session starts in 10 minutes! Play a match now to defend your winning streak and climb the leaderboard.',
        delayMs,
        icon: '/white_knight.png',
      });
    }
  } catch (err) {
    console.warn('SW streak schedule notice:', err);
  }
}

/**
 * Initializes periodic background engagement checker and records session online times
 */
export function initPushNotificationScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  getOrRegisterServiceWorker();
  recordUserOnlineSession();
  scheduleNextStreakAlertInServiceWorker();

  // Check streak reminder schedule every 30 seconds
  const interval = setInterval(() => {
    checkStreakWarningSchedule();
  }, 30 * 1000);

  return () => {
    clearInterval(interval);
  };
}
