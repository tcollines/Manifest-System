import { supabase } from '../supabase';

/**
 * Creates a notification for a user.
 * 
 * @param manifestId - The manifest ID
 * @param userId - The user ID to notify
 * @param type - The type of notification (e.g., 'WORKPLAN_REVIEW', 'REQUISITION_APPROVAL')
 * @param message - The notification message
 */
export const createNotification = async (
    manifestId: string,
    userId: string,
    type: string,
    message: string,
    entityId?: string,
    url?: string
) => {
    try {
        const { error } = await supabase.from('notifications').insert([{
            manifest_id: manifestId,
            user_id: userId,
            type,
            message,
            entity_id: entityId || null,
            url: url || null,
            read: false,
            push_status: 'PENDING'
        }]);

        if (error) {
            console.error('[NOTIFICATIONS] Failed to create notification:', error);
        }
    } catch (err) {
        console.error('[NOTIFICATIONS] Exception creating notification:', err);
    }
};

/**
 * Creates a notification for all users with a specific role in a manifest.
 */
export const notifyRole = async (
    manifestId: string,
    role: string,
    type: string,
    message: string,
    entityId?: string,
    url?: string
) => {
    try {
        // Fetch users with the specified role
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('manifest_id', manifestId)
            .eq('role', role)
            .ilike('status', 'active');

        if (fetchError || !users || users.length === 0) return;

        const notifications = users.map(u => ({
            manifest_id: manifestId,
            user_id: u.id,
            type,
            message,
            entity_id: entityId || null,
            url: url || null,
            read: false,
            push_status: 'PENDING'
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) {
            console.error('[NOTIFICATIONS] Failed to create role notifications:', error);
        }
    } catch (err) {
        console.error('[NOTIFICATIONS] Exception creating role notifications:', err);
    }
};
