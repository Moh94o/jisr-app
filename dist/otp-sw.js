// OTP Push Notification Service Worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'OTP_NOTIFICATION') {
    const { title, body, tag, icon } = event.data;
    self.registration.showNotification(title, {
      body,
      tag: tag || 'otp-' + Date.now(),
      icon: icon || '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'copy', title: 'نسخ الرمز' },
        { action: 'open', title: 'فتح جسر' }
      ],
      data: event.data
    });
  }
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'copy' && event.notification.data?.otp_code) {
    // Can't copy from SW, open the app instead
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'COPY_OTP', code: event.notification.data.otp_code });
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});
