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
        icon: '/icon-192x192.png',
        badge: '/badge.png',
        tag: data.type || 'manifest-notification', // Collapses duplicate type notifications
        renotify: true,                             // Always vibrate/sound even if same tag
        requireInteraction: false,
        data: {
            url: data.url || '/',
            entity_id: data.entity_id,
            type: data.type
        }
    };

    // Always show the native OS notification, even if the app is in the foreground.
    // Chrome suppresses notifications when the PWA is focused; we force it via the SW.
    event.waitUntil(
        self.registration.showNotification(data.title || 'Manifest System', options)
    );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';
    // Build an absolute URL so we can match against open windows
    const absoluteUrl = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (windowClients) {
                // Focus an already-open window if possible
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if ('focus' in client) {
                        // Navigate the existing tab to the target URL and focus it
                        client.navigate(absoluteUrl);
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(absoluteUrl);
                }
            })
    );
});
