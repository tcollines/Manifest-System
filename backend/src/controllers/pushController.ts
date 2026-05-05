import { Request, Response } from 'express';
import { supabase } from '../supabase';

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
