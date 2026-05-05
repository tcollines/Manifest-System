import { supabase } from '../supabase';

let isRunning = false;
const RETRY_POLL_INTERVAL = 60000; // 60 seconds

export const startRetryWorker = () => {
    console.log('[RetryWorker] Started. Polling every 60s for failed notifications.');
    runWorkerLoop();
};

const runWorkerLoop = () => {
    setTimeout(async () => {
        try {
            await processRetryNotifications();
        } catch (err) {
            console.error('[RetryWorker] Unhandled error during processing:', err);
        } finally {
            runWorkerLoop();
        }
    }, RETRY_POLL_INTERVAL);
};

const processRetryNotifications = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
        const now = new Date().toISOString();
        
        // Fetch pending notifications that have reached their retry time
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('push_status', 'PENDING')
            .lte('next_retry_at', now)
            .order('next_retry_at', { ascending: true })
            .limit(50);

        if (error) {
            console.error('[RetryWorker] Failed to fetch retry notifications:', error);
            isRunning = false;
            return;
        }

        if (!notifications || notifications.length === 0) {
            isRunning = false;
            return;
        }

        console.log(`[RetryWorker] Processing ${notifications.length} retries...`);

        // We can re-use the webhook endpoint logic by making internal fetch calls or directly invoking a service
        // Since deliverWebhook is an express handler, it's easier to just hit the local API or extract the logic.
        // We will make a local HTTP request to the webhook endpoint, but without the secret (or with the secret!)
        
        const WEBHOOK_URL = `http://localhost:${process.env.PORT || 5000}/api/push/deliver`;
        const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

        for (const notification of notifications) {
            try {
                const response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-webhook-secret': WEBHOOK_SECRET
                    },
                    body: JSON.stringify({ record: notification })
                });

                if (!response.ok) {
                    console.error(`[RetryWorker] Failed to process retry for ${notification.id} - Status ${response.status}`);
                }
            } catch (err) {
                console.error(`[RetryWorker] Exception sending retry for ${notification.id}:`, err);
            }
        }
    } finally {
        isRunning = false;
    }
};
