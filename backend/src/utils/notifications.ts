import { supabase } from '../supabase';

const isDuplicate = async (userId: string, type: string, message: string, entityId?: string) => {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    let query = supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('message', message) // Serves as the action_state
        .gte('created_at', oneMinuteAgo);
        
    if (entityId) query = query.eq('entity_id', entityId);
    else query = query.is('entity_id', null);

    const { data } = await query.limit(1);
    return data && data.length > 0;
};

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
    url?: string,
    excludeUserId?: string
) => {
    try {
        if (excludeUserId && userId === excludeUserId) return;

        if (await isDuplicate(userId, type, message, entityId)) {
            console.log(`[NOTIFICATIONS] Blocked duplicate notification for user ${userId} (${type})`);
            return;
        }

        const { data: newNotification, error } = await supabase.from('notifications').insert([{
            manifest_id: manifestId,
            user_id: userId,
            type,
            message,
            entity_id: entityId || null,
            url: url || null,
            read: false,
            push_status: 'PENDING'
        }]).select('*').single();

        if (error) {
            console.error('[NOTIFICATIONS] Failed to create notification:', error);
        } else if (newNotification) {
            // Trigger push delivery internally (bypass flaky Supabase webhooks)
            import('../controllers/pushController').then(({ processPushDelivery }) => {
                processPushDelivery(newNotification).catch(err => 
                    console.error('[NOTIFICATIONS] Background push delivery failed:', err)
                );
            });
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
    url?: string,
    excludeUserId?: string
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

        const validUsers = [];
        for (const u of users) {
            if (excludeUserId && u.id === excludeUserId) continue;

            if (!(await isDuplicate(u.id, type, message, entityId))) {
                validUsers.push(u);
            } else {
                console.log(`[NOTIFICATIONS] Blocked duplicate role notification for user ${u.id} (${type})`);
            }
        }

        if (validUsers.length === 0) return;

        const notifications = validUsers.map(u => ({
            manifest_id: manifestId,
            user_id: u.id,
            type,
            message,
            entity_id: entityId || null,
            url: url || null,
            read: false,
            push_status: 'PENDING'
        }));

        const { data: newNotifications, error } = await supabase.from('notifications').insert(notifications).select('*');
        if (error) {
            console.error('[NOTIFICATIONS] Failed to create role notifications:', error);
        } else if (newNotifications && newNotifications.length > 0) {
            import('../controllers/pushController').then(({ processPushDelivery }) => {
                newNotifications.forEach(n => {
                    processPushDelivery(n).catch(err => 
                        console.error('[NOTIFICATIONS] Background role push delivery failed:', err)
                    );
                });
            });
        }
    } catch (err) {
        console.error('[NOTIFICATIONS] Exception creating role notifications:', err);
    }
};
