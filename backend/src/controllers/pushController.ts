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

    try {
        // We will do an upsert or check if this exact endpoint exists for the user.
        // It's possible the user has multiple devices. We just insert a new one if endpoint doesn't exist.
        
        // Let's see if this exact endpoint exists
        const { data: existing, error: findError } = await supabase
            .from('user_push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            // JSONB query to match endpoint inside subscription_data
            .contains('subscription_data', { endpoint: subscription.endpoint })
            .maybeSingle();
            
        if (findError) throw findError;

        if (existing) {
            // Update last_seen_at and ensure it's active
            await supabase
                .from('user_push_subscriptions')
                .update({ last_seen_at: new Date().toISOString(), is_active: true })
                .eq('id', existing.id);
                
            return res.status(200).json({ message: 'Subscription updated' });
        }

        // Insert new subscription
        const { error: insertError } = await supabase
            .from('user_push_subscriptions')
            .insert([{
                user_id: userId,
                subscription_data: subscription,
                user_agent: userAgent,
                is_active: true
            }]);

        if (insertError) throw insertError;

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
