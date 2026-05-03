import webpush from 'web-push';
import { supabase } from '../supabase';

// Configure Web Push with VAPID keys
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@manifest.com';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
} else {
    console.warn('[PushWorker] VAPID keys are not configured. Push notifications will not be sent.');
}

let isRunning = false;
const BASE_POLL_INTERVAL = 15000; // 15 seconds
const IDLE_POLL_INTERVAL = 45000; // 45 seconds if no pending notifications
let currentInterval = BASE_POLL_INTERVAL;

export const startPushWorker = () => {
    console.log('[PushWorker] Started');
    runWorkerLoop();
};

const runWorkerLoop = () => {
    setTimeout(async () => {
        try {
            await processPendingNotifications();
        } catch (err) {
            console.error('[PushWorker] Unhandled error during processing:', err);
        } finally {
            // Schedule the next run based on adaptive interval
            runWorkerLoop();
        }
    }, currentInterval);
};

const processPendingNotifications = async () => {
    if (isRunning || !publicVapidKey) return;
    isRunning = true;

    try {
        // 1. Fetch pending notifications
        // We use a simple select, but order by oldest first. Limit to 50 per batch.
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('push_status', 'PENDING')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            console.error('[PushWorker] Failed to fetch notifications:', error);
            isRunning = false;
            return;
        }

        if (!notifications || notifications.length === 0) {
            // Adaptive polling: sleep longer if idle
            currentInterval = IDLE_POLL_INTERVAL;
            isRunning = false;
            return;
        }

        // We have work to do, poll faster next time
        currentInterval = BASE_POLL_INTERVAL;

        // Process each notification
        for (const notification of notifications) {
            await deliverNotification(notification);
        }

    } finally {
        isRunning = false;
    }
};

const deliverNotification = async (notification: any) => {
    const { id, user_id, message, type, entity_id, url } = notification;

    try {
        // 1. Check user preferences
        const { data: prefs, error: prefsErr } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user_id)
            .maybeSingle();

        if (prefsErr) throw prefsErr;

        // If opted out based on type, mark NOT_APPLICABLE
        let isOptedOut = false;
        if (prefs) {
            if (type.includes('WORKPLAN') && prefs.workplan_updates === false) isOptedOut = true;
            if (type.includes('REQUISITION') && prefs.requisition_updates === false) isOptedOut = true;
            if (type.includes('PAYMENT') && prefs.payments === false) isOptedOut = true;
        }

        if (isOptedOut) {
            await updateNotificationStatus(id, 'NOT_APPLICABLE');
            return;
        }

        // 2. Fetch active subscriptions for this user
        const { data: subscriptions, error: subsErr } = await supabase
            .from('user_push_subscriptions')
            .select('id, subscription_data')
            .eq('user_id', user_id)
            .eq('is_active', true);

        if (subsErr) throw subsErr;

        if (!subscriptions || subscriptions.length === 0) {
            // User doesn't have any push subscriptions
            await updateNotificationStatus(id, 'NOT_APPLICABLE');
            return;
        }

        // 3. Build payload
        const payload = JSON.stringify({
            title: getTitleForType(type),
            body: message,
            type: type,
            entity_id: entity_id,
            url: url || '/'
        });

        // 4. Send to all endpoints
        let successCount = 0;
        let failCount = 0;

        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(sub.subscription_data, payload);
                successCount++;
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired or no longer valid
                    console.log(`[PushWorker] Subscription ${sub.id} is invalid (410/404). Marking inactive.`);
                    await supabase
                        .from('user_push_subscriptions')
                        .update({ is_active: false })
                        .eq('id', sub.id);
                } else {
                    console.error(`[PushWorker] Failed to send push to sub ${sub.id}:`, err);
                }
                failCount++;
            }
        }

        // 5. Update notification status
        if (successCount > 0) {
            await updateNotificationStatus(id, 'SENT');
        } else {
            // All failed or no active subscriptions left
            await updateNotificationStatus(id, 'FAILED');
        }

    } catch (err) {
        console.error(`[PushWorker] Error delivering notification ${id}:`, err);
        await updateNotificationStatus(id, 'FAILED');
    }
};

const updateNotificationStatus = async (id: string, status: string) => {
    await supabase.from('notifications').update({ push_status: status }).eq('id', id);
};

const getTitleForType = (type: string) => {
    switch (type) {
        case 'WORKPLAN_REVIEW': return 'Workplan Update';
        case 'REQUISITION_ACTION': return 'Requisition Update';
        case 'FINANCE_ACTION': return 'Finance Action Required';
        case 'PAYMENT': return 'Payment Recorded';
        default: return 'System Notification';
    }
};
