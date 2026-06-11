import { Request, Response } from 'express';
import { supabase } from '../supabase';
import webpush from 'web-push';

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@manifest.com';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
}

const getTitleForType = (type: string) => {
    switch (type) {
        case 'WORKPLAN_REVIEW': return 'Workplan Update';
        case 'REQUISITION_ACTION': return 'Requisition Update';
        case 'REQUISITION_APPROVAL': return 'Approval Required';
        case 'FINANCE_ACTION': return 'Finance Action Required';
        case 'PAYMENT': return 'Payment Recorded';
        case 'FLEET_ALERT': return 'Fleet Alert';
        default: return 'Manifest System';
    }
};

// ─── Subscriptions ──────────────────────────────────────────────────

export const saveSubscription = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const endpoint = subscription.endpoint;

    try {
        // First: remove this exact endpoint from any OTHER users to prevent notification leakage
        // when multiple users log into the same device
        await supabase
            .from('user_push_subscriptions')
            .delete()
            .neq('user_id', userId)
            .filter('subscription_data->>endpoint', 'eq', endpoint);

        // Next: mark any existing row for this exact endpoint and current user as active (update)
        const { data: existing, error: findError } = await supabase
            .from('user_push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .filter('subscription_data->>endpoint', 'eq', endpoint)
            .maybeSingle();

        if (findError) throw findError;

        if (existing) {
            // Already registered — just refresh timestamps and keys (subscription_data may have rotated keys)
            await supabase
                .from('user_push_subscriptions')
                .update({
                    subscription_data: subscription,
                    last_seen_at: new Date().toISOString(),
                    is_active: true
                })
                .eq('id', existing.id);

            return res.status(200).json({ message: 'Subscription refreshed' });
        }

        // Insert new subscription
        const { error: insertError } = await supabase
            .from('user_push_subscriptions')
            .insert([{
                user_id: userId,
                subscription_data: subscription,
                user_agent: userAgent,
                last_seen_at: new Date().toISOString(),
                is_active: true
            }]);

        if (insertError) throw insertError;

        // Cleanup: keep only the 5 most recent active subscriptions per user to prevent stale buildup
        const { data: allSubs } = await supabase
            .from('user_push_subscriptions')
            .select('id, created_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (allSubs && allSubs.length > 5) {
            const toDeactivate = allSubs.slice(5).map((s: any) => s.id);
            await supabase
                .from('user_push_subscriptions')
                .update({ is_active: false })
                .in('id', toDeactivate);
        }

        res.status(201).json({ message: 'Subscription saved' });
    } catch (err) {
        console.error('[pushController] saveSubscription Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const deleteSubscription = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

    try {
        const { error } = await supabase
            .from('user_push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .contains('subscription_data', { endpoint });

        if (error) throw error;
        
        res.json({ message: 'Subscription removed' });
    } catch (err) {
        console.error('[pushController] deleteSubscription Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Preferences ────────────────────────────────────────────────────

export const getPreferences = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        let { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        // If no preferences exist, return defaults
        if (!data) {
            data = {
                user_id: userId,
                workplan_updates: true,
                requisition_updates: true,
                payments: true
            };
        }

        res.json(data);
    } catch (err) {
        console.error('[pushController] getPreferences Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updatePreferences = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workplan_updates, requisition_updates, payments } = req.body;

    try {
        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                workplan_updates: workplan_updates !== undefined ? workplan_updates : true,
                requisition_updates: requisition_updates !== undefined ? requisition_updates : true,
                payments: payments !== undefined ? payments : true,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        res.json({ message: 'Preferences updated' });
    } catch (err) {
        console.error('[pushController] updatePreferences Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deliverWebhook = async (req: Request, res: Response) => {
    console.log('[Webhook] Received push delivery request');
    
    // 1. Webhook Security
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
        console.error('[Webhook] Unauthorized: Invalid webhook secret');
        return res.status(403).json({ error: 'Forbidden: Invalid webhook secret' });
    }

    // Webhook payload from Supabase has 'record' inside a JSON body.
    const payload = req.body;
    if (!payload || !payload.record) {
        return res.status(400).json({ error: 'Invalid payload: missing record' });
    }

    const notification = payload.record;
    
    const result = await processPushDelivery(notification);
    if (result.status === 403) return res.status(403).json(result.body);
    if (result.status === 400) return res.status(400).json(result.body);
    if (result.status === 500) return res.status(500).json(result.body);
    return res.status(200).json(result.body);
};

export const processPushDelivery = async (notification: any) => {
    const { id, user_id, message, type, entity_id, url, push_status, attempt_count } = notification;

    console.log(`[Push Delivery] Processing notification ${id} for user ${user_id}`);

    // Prevent duplicate push delivery
    if (push_status === 'SENT') {
        console.log(`[Push Delivery] Notification ${id} already sent`);
        return { status: 200, body: { message: 'Already sent' } };
    }

    try {
        const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user_id)
            .maybeSingle();

        let isOptedOut = false;
        if (prefs) {
            if (type.includes('WORKPLAN') && prefs.workplan_updates === false) isOptedOut = true;
            if (type.includes('REQUISITION') && prefs.requisition_updates === false) isOptedOut = true;
            if (type.includes('PAYMENT') && prefs.payments === false) isOptedOut = true;
        }

        if (isOptedOut) {
            console.log(`[Push Delivery] User ${user_id} is opted out of ${type} notifications`);
            await supabase.from('notifications').update({ push_status: 'NOT_APPLICABLE' }).eq('id', id);
            return { status: 200, body: { message: 'Opted out' } };
        }

        const { data: subscriptions } = await supabase
            .from('user_push_subscriptions')
            .select('id, subscription_data')
            .eq('user_id', user_id)
            .eq('is_active', true);

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`[Push Delivery] User ${user_id} has no active push subscriptions`);
            await supabase.from('notifications').update({ push_status: 'NOT_APPLICABLE' }).eq('id', id);
            return { status: 200, body: { message: 'No subscriptions' } };
        }

        // Payload hardening
        const pushPayload = JSON.stringify({
            title: getTitleForType(type),
            body: message,
            type: type,
            entity_id: entity_id,
            url: url || '/',
            tag: entity_id || id, // use entity_id for tag to prevent stacking spam
            timestamp: Date.now()
        });

        let successCount = 0;
        let failCount = 0;
        let shouldRetry = false;

        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(sub.subscription_data, pushPayload);
                successCount++;
            } catch (err: any) {
                const statusCode = err.statusCode;
                if (statusCode === 410 || statusCode === 404) {
                    console.log(`[Push Delivery] Subscription ${sub.id} expired. Marking inactive.`);
                    await supabase.from('user_push_subscriptions').update({ is_active: false }).eq('id', sub.id);
                } else {
                    const isTransient = !statusCode || statusCode === 429 || statusCode >= 500;
                    if (isTransient) {
                        shouldRetry = true;
                        console.error(`[Push Delivery] FCM push failed temporarily for sub ${sub.id}. Status: ${statusCode || 'Network Error'}, Message: ${err.message}`);
                    } else {
                        console.error(`[Push Delivery] FCM push failed permanently for sub ${sub.id}. Status: ${statusCode}, Message: ${err.message}`);
                    }
                }
                failCount++;
            }
        }

        if (successCount > 0) {
            console.log(`[Push Delivery] Successfully sent ${successCount} pushes for notification ${id}`);
            await supabase.from('notifications').update({ push_status: 'SENT' }).eq('id', id);
        } else if (shouldRetry) {
            console.log(`[Push Delivery] Failed but retrying notification ${id}`);
            const newAttemptCount = (attempt_count || 0) + 1;
            if (newAttemptCount >= 5) {
                await supabase.from('notifications').update({ push_status: 'FAILED', attempt_count: newAttemptCount }).eq('id', id);
            } else {
                let delayMinutes = 0.5; // 30s
                if (newAttemptCount === 2) delayMinutes = 2; // +2m
                if (newAttemptCount >= 3) delayMinutes = 10; // +10m

                const nextRetry = new Date(Date.now() + delayMinutes * 60000).toISOString();
                await supabase.from('notifications').update({ 
                    push_status: 'PENDING', 
                    attempt_count: newAttemptCount,
                    next_retry_at: nextRetry
                }).eq('id', id);
            }
        } else {
            console.log(`[Push Delivery] Failed permanently for notification ${id}`);
            await supabase.from('notifications').update({ push_status: 'FAILED' }).eq('id', id);
        }

        return { status: 200, body: { message: 'Processed', successCount, failCount } };
    } catch (err: any) {
        console.error(`[Push Delivery] Error delivering notification ${id}:`, err);
        const newAttemptCount = (attempt_count || 0) + 1;
        const nextRetry = new Date(Date.now() + 60000).toISOString();
        if (newAttemptCount >= 5) {
            await supabase.from('notifications').update({ push_status: 'FAILED', attempt_count: newAttemptCount }).eq('id', id);
        } else {
            await supabase.from('notifications').update({ push_status: 'PENDING', attempt_count: newAttemptCount, next_retry_at: nextRetry }).eq('id', id);
        }
        return { status: 500, body: { error: 'Processing failed, scheduled retry' } };
    }
};
