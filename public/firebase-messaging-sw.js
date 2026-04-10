/* Firebase Messaging service worker — must be at root */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAWx28076A7YTeS6egBJr0HJPA4lvdfiE0',
  authDomain:        'dotball-ce1f8.firebaseapp.com',
  projectId:         'dotball-ce1f8',
  storageBucket:     'dotball-ce1f8.firebasestorage.app',
  messagingSenderId: '965083043591',
  appId:             '1:965083043591:web:64eebe5586ff77e256d7a2',
});

const messaging = firebase.messaging();

/* Background message handler — app is closed or in background */
messaging.onBackgroundMessage(payload => {
  const { title, body, url } = payload.data || {};
  self.registration.showNotification(title || 'dotball', {
    body: body || 'You have a new update',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: url || '/' },
  });
});

/* Notification click — open app */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes(self.location.origin));
      if (existing) return existing.focus().then(w => w.navigate(target));
      return clients.openWindow(target);
    })
  );
});
