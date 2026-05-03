import { Request, Response } from 'express';
import { supabase } from '../supabase';

const guard = (req: Request, res: Response): string | null => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    return manifestId;
};

export const getNotifications = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('manifest_id', manifestId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        console.error('[NOTIFICATIONS] getNotifications error:', e);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .eq('manifest_id', manifestId)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        console.error('[NOTIFICATIONS] markAsRead error:', e);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('manifest_id', manifestId)
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        console.error('[NOTIFICATIONS] markAllAsRead error:', e);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
};
