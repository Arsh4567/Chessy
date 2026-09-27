/**
 * GrandmasterHub Service Worker for OS-Level Native Background Notifications
 * Dispatches OS notifications to Windows Action Center, macOS Notification Center,
 * Android Notification Tray, and Firefox / Chrome notification drawers even when the tab is closed.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background messages from the client to schedule or display native OS notifications
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SHOW_NOTIFICATION') {
    const options = {
      body: data.body || 'Stockfish is waiting for you! Make your move.',
      icon: data.icon || '/white_knight.png',
      badge: data.badge || '/white_knight.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'gm_os_notification',
      renotify: true,
      requireInteraction: false,
      data: { url: data.url || '/' },
      actions: [
        { action: 'play', title: '⚔️ Play Now' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'GrandmasterHub Chess', options)
    );
  } else if (data.type === 'SCHEDULE_NOTIFICATION') {
    const delay = data.delayMs || 5000;
    setTimeout(() => {
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/white_knight.png',
        badge: data.badge || '/white_knight.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'gm_streak_reminder',
        renotify: true,
        data: { url: data.url || '/' },
        actions: [
          { action: 'play', title: '🔥 Keep Streak Going' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    }, delay);
  }
});

// Handle incoming Web Push network events
self.addEventListener('push', (event) => {
  let data = {
    title: 'GrandmasterHub Chess',
    body: 'Stockfish is waiting for you! Make your move.',
    icon: '/white_knight.png',
    badge: '/white_knight.png',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/white_knight.png',
    badge: data.badge || '/white_knight.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'play', title: '⚔️ Play Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle user clicking on the OS notification in their system tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
