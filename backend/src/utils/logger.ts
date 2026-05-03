import { supabase } from '../supabase';

interface ActionLogPayload {
    userId: string;
    action: string;
    itemId: string;
    timestamp?: Date;
    details?: any;
    manifestId: string;
}

export const logAction = async (payload: ActionLogPayload) => {
    try {
        const { error } = await supabase.from('activity_logs').insert([{
            user: payload.userId,
            action: payload.action,
            item_id: payload.itemId,
            type: 'admin',
            timestamp: (payload.timestamp || new Date()).toISOString(),
            details: payload.details,
            manifest_id: payload.manifestId
        }]);
        if (error) {
            console.error('[ActionLogger] Failed to log action:', error);
        }
    } catch (e) {
        console.error('[ActionLogger] Internal Error:', e);
    }
};
