// ─── Service Worker Lifecycle ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => caches.delete(key)));
        }).then(() => clients.claim())
    );
});

// ─── Push Event ──────────────────────────────────────────────────────────────
self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Manifest System', body: event.data.text() };
    }

    const options = {
        body: data.body,
        icon: '/favicon.png',
        tag: data.type || 'manifest-notification',
        renotify: true,
        requireInteraction: false,
        data: {
            url: data.url || '/',
            entity_id: data.entity_id,
            type: data.type
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Manifest System', options)
    );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';
    const absoluteUrl = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (windowClients) {
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if ('focus' in client) {
                        client.navigate(absoluteUrl);
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(absoluteUrl);
                }
            })
    );
});

// ─── Fetch Event (Network-First / Direct Pass-Through) ─────────────────────────
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});