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
        let usersToNotify: any[] = [];

        // Fetch users with the specified role
        const { data: roleUsers, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('manifest_id', manifestId)
            .eq('role', role)
            .ilike('status', 'active');

        if (roleUsers) {
            usersToNotify = [...roleUsers];
        }

        // Fetch users in a department matching the role name (e.g. "Finance")
        const { data: dept } = await supabase
            .from('departments')
            .select('id')
            .eq('manifest_id', manifestId)
            .ilike('name', role)
            .single();

        if (dept) {
            const { data: deptUsers } = await supabase
                .from('users')
                .select('id')
                .eq('manifest_id', manifestId)
                .eq('department_id', dept.id)
                .ilike('status', 'active');
                
            if (deptUsers) {
                usersToNotify = [...usersToNotify, ...deptUsers];
            }
        }

        // Deduplicate
        const uniqueUserIds = Array.from(new Set(usersToNotify.map(u => u.id)));
        const users = uniqueUserIds.map(id => ({ id }));

        if (users.length === 0) return;

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

/**
 * Notifies the active HODs and Admins of the Transportation department.
 */
export const notifyTransportationHODAndAdmin = async (
    manifestId: string,
    message: string,
    entityId?: string,
    url?: string
) => {
    try {
        // Find Transportation department scoped to the manifest
        const { data: dept } = await supabase
            .from('departments')
            .select('id')
            .eq('manifest_id', manifestId)
            .or('slug.eq.transportation,name.ilike.Transportation')
            .maybeSingle();

        if (!dept) {
            console.error('[NOTIFICATIONS] Transportation department not found for manifest:', manifestId);
            return;
        }

        // Query active users with department_id or department_uid matching the dept id
        // and matching role HOD, Head of Dept, or Dept Admin
        const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('id')
            .eq('manifest_id', manifestId)
            .ilike('status', 'active')
            .or(`department_id.eq.${dept.id},department_uid.eq.${dept.id}`)
            .in('role', ['HOD', 'Head of Dept', 'Dept Admin']);

        if (usersErr) {
            console.error('[NOTIFICATIONS] Error fetching transportation users:', usersErr);
            return;
        }

        if (!users || users.length === 0) {
            console.log('[NOTIFICATIONS] No active Transportation HODs/Admins to notify.');
            return;
        }

        // De-duplicate user IDs
        const uniqueUserIds = Array.from(new Set(users.map(u => u.id)));

        // Create notifications
        const notifications = [];
        for (const userId of uniqueUserIds) {
            if (!(await isDuplicate(userId, 'FLEET_ALERT', message, entityId))) {
                notifications.push({
                    manifest_id: manifestId,
                    user_id: userId,
                    type: 'FLEET_ALERT',
                    message,
                    entity_id: entityId || null,
                    url: url || null,
                    read: false,
                    push_status: 'PENDING'
                });
            } else {
                console.log(`[NOTIFICATIONS] Blocked duplicate fleet alert notification for user ${userId}`);
            }
        }

        if (notifications.length === 0) return;

        const { data: newNotifications, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select('*');

        if (error) {
            console.error('[NOTIFICATIONS] Failed to save fleet alert notifications:', error);
        } else if (newNotifications && newNotifications.length > 0) {
            import('../controllers/pushController').then(({ processPushDelivery }) => {
                newNotifications.forEach(n => {
                    processPushDelivery(n).catch(err =>
                        console.error('[NOTIFICATIONS] Background fleet alert push delivery failed:', err)
                    );
                });
            });
        }
    } catch (err) {
        console.error('[NOTIFICATIONS] Exception notifying transportation HOD/Admins:', err);
    }
};

/**
 * Detects vehicle status transitions and notifies the transportation HOD and Admins.
 */
export const checkAndNotifyVehicleStatus = async (
    manifestId: string,
    oldRecord: any,
    newRecord: any
) => {
    try {
        if (!oldRecord || !newRecord) return;

        const oldStage = oldRecord.current_stage || oldRecord.currentStage;
        const newStage = newRecord.current_stage || newRecord.currentStage;
        const oldDirection = oldRecord.journey_direction || oldRecord.journeyDirection;
        const newDirection = newRecord.journey_direction || newRecord.journeyDirection;
        const oldStatus = oldRecord.status;
        const newStatus = newRecord.status;

        // Ensure we have some transition to check
        if (oldStage === newStage && oldDirection === newDirection && oldStatus === newStatus) {
            return;
        }

        let message = '';

        // Resolve Pickup Station Name
        let stationName = 'Pickup Station';
        const stationId = newRecord.station_id || newRecord.stationId;
        if (stationId) {
            const { data: station } = await supabase
                .from('pickup_stations')
                .select('name')
                .eq('id', stationId)
                .maybeSingle();
            if (station && station.name) {
                stationName = station.name;
            }
        }

        const plate = newRecord.number_plate || newRecord.numberPlate || 'Vehicle';

        // 1. Leaves pickup station (Ongoing, Shifts to RegApproval)
        if (newDirection === 'Ongoing' && newStage === 'RegApproval' && oldStage !== 'RegApproval') {
            message = `vehicle ${plate} from ${stationName} has set off`;
        }
        // 2. Finance dispatches (Ongoing, Shifts to Transit)
        else if (newDirection === 'Ongoing' && newStage === 'Transit' && oldStage !== 'Transit') {
            message = `vehicle ${plate} from ${stationName} has been approved by finance`;
        }
        // 3. Arrives at venue (Ongoing, Shifts to Arrived)
        else if (newDirection === 'Ongoing' && newStage === 'Arrived' && oldStage !== 'Arrived') {
            message = `vehicle ${plate} from ${stationName} has reached the venue of the event`;
        }
        // 4. Finance dispatches return (Return, Shifts to Transit)
        else if (newDirection === 'Return' && newStage === 'Transit' && oldStage !== 'Transit') {
            message = `vehicle ${plate} from ${stationName} has started return journey`;
        }
        // 5. Confirms arrival back (Return, Shifts to Arrived OR status becomes Completed)
        else if (newDirection === 'Return' && 
                 (newStage === 'Arrived' || newStatus === 'Completed') && 
                 (oldStage !== 'Arrived' && oldStatus !== 'Completed')) {
            message = `vehicle ${plate} from ${stationName} has arrived`;
        }

        if (message) {
            console.log(`[VEHICLE_NOTIFICATIONS] Triggering alert: "${message}"`);
            const entityId = newRecord.event_id || newRecord.eventId || newRecord.id;
            const url = `/transportation?eventId=${newRecord.event_id || newRecord.eventId || ''}`;
            await notifyTransportationHODAndAdmin(manifestId, message, entityId, url);
        }
    } catch (err) {
        console.error('[VEHICLE_NOTIFICATIONS] Exception checking vehicle status:', err);
    }
};
