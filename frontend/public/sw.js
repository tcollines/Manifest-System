self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: '/icon-192x192.png',
                badge: '/badge.png', // Optional, small icon for Android status bar
                data: {
                    url: data.url,
                    entity_id: data.entity_id,
                    type: data.type
                }
            };

            event.waitUntil(
                self.registration.showNotification(data.title || 'Manifest System', options)
            );
        } catch (e) {
            console.error('[SW] Error parsing push payload:', e);
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
