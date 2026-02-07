import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export const getAllEvents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50; // Default limit
        const search = req.query.search as string;

        const offset = (page - 1) * limit;

        let query = supabase
            .from('ministry_events')
            .select('*', { count: 'exact' });

        // Search filter (Case insensitive)
        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        // Apply Pagination
        query = query.range(offset, offset + limit - 1);

        // Sort by created_at DESC (Newest First)
        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;

        // Return strictly typed pagination response
        res.json({
            data: data || [],
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        // Remove temporary ID to let DB generate UUID or we generate it
        const { id: inputId, ...eventData } = req.body;
        const payload = (inputId && String(inputId).startsWith('evt-')) ? eventData : req.body;

        // Track the old ID for data migration
        const oldId = (inputId && String(inputId).startsWith('evt-')) ? String(inputId) : null;

        // Ensure ID is present (Manual Gen if DB doesn't default)
        if (!payload.id || String(payload.id).startsWith('evt-')) {
            payload.id = uuidv4();
        }

        // Force service_number if missing (Fix for NOT NULL constraint)
        if (payload.service_number === undefined || payload.service_number === null) {
            payload.service_number = 1;
        }

        const { data, error } = await supabase
            .from('ministry_events')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        // CRITICAL: If we replaced an 'evt-' ID, we MUST migrate any existing data 
        // linked to that old ID (optimistic data) to the new UUID.
        if (oldId) {
            console.log(`[EventCreate] Migrating data from ${oldId} to ${data.id}`);
            const { error: rpcError } = await supabase.rpc('resolve_event_id', {
                old_id: oldId,
                new_id: data.id
            });

            if (rpcError) {
                console.warn(`[EventCreate] Migration warning:`, rpcError);
                // We don't fail the request, as the event was created successfully.
            }
        }

        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message, details: error.details });
    }
};

export const updateEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('ministry_events').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Event updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Delete Logistics Linked to Event
        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', id);

        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);

            // 1.1 Delete Data Entrants (Users linked to these stations)
            // This frees up usernames for reuse in future events
            await supabase.from('users').delete().in('station_id', stationIds);

            for (const station of stations) {
                // 1.2 Get Vehicles
                const { data: vehicles } = await supabase.from('vehicles').select('id').eq('station_id', station.id);
                if (vehicles && vehicles.length > 0) {
                    const vIds = vehicles.map(v => v.id);
                    // 1.3 Delete Passengers
                    await supabase.from('passengers').delete().in('vehicle_id', vIds);
                    // 1.4 Delete Vehicles
                    await supabase.from('vehicles').delete().in('id', vIds);
                }
                // 1.5 Delete Station
                await supabase.from('pickup_stations').delete().eq('id', station.id);
            }
        }

        // 1.6 Delete Event Coordinators (Vehicle Coordinators linked directly to Event)
        // This ensures vehicle coordinators created for this event are also cleaned up
        await supabase.from('users').delete().eq('event_id', id).eq('role', 'Coordinator');

        // 2. Remove Attendance from Members
        const { data: members } = await supabase.from('members').select('id, attended_service_ids').contains('attended_service_ids', [id]);
        if (members && members.length > 0) {
            for (const m of members) {
                const newIds = (m.attended_service_ids || []).filter((i: string) => i !== id);
                await supabase.from('members').update({ attended_service_ids: newIds }).eq('id', m.id);
            }
        }

        // 3. Remove Attendance from Children
        const { data: children } = await supabase.from('children').select('id, attended_service_ids').contains('attended_service_ids', [id]);
        if (children && children.length > 0) {
            for (const c of children) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== id);
                await supabase.from('children').update({ attended_service_ids: newIds }).eq('id', c.id);
            }
        }

        // 4. Remove Attendance from Personal Vehicles
        const { data: pCars } = await supabase.from('personal_vehicles').select('id, attended_service_ids').contains('attended_service_ids', [id]);
        if (pCars && pCars.length > 0) {
            for (const c of pCars) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== id);
                await supabase.from('personal_vehicles').update({ attended_service_ids: newIds }).eq('id', c.id);
            }
        }

        // 5. Delete Related Incidents (FK Constraint fix)
        await supabase.from('incidents').delete().eq('service_id', id);

        // 6. Delete Related Souls (Cleanup)
        await supabase.from('souls').delete().eq('source_id', id).eq('source_type', 'Service');

        // 7. Delete Volunteer Attendance (FK Constraint fix)
        await supabase.from('volunteer_attendance').delete().eq('service_id', id);

        // 8. Unlink Personal Vehicles (FK Constraint fix)
        await supabase.from('personal_vehicles').update({ current_service_id: null }).eq('current_service_id', id);

        // 9. Delete Related Finance Transactions (FK Constraint fix)
        await supabase.from('transactions').delete().eq('event_id', id);

        // 10. Delete Next Gen Souls (FK Constraint fix - revealed by error)
        await supabase.from('next_gen_souls').delete().eq('service_id', id);

        // 11. Delete the Event itself
        const { error } = await supabase.from('ministry_events').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: 'Event and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getEventHighlights = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.rpc('get_event_highlights', { event_uuid: id });

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};



// Internal function for automated cleanup (called by server.ts)
export const cleanupPastEvents = async () => {
    try {
        const now = new Date();
        const pastThreshold = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago

        // 1. Find all events where date < threshold (simple check)
        const { data: events } = await supabase
            .from('ministry_events')
            .select('id, title, date')
            .lt('date', pastThreshold.toISOString().split('T')[0]); // Comparing date only strings YYYY-MM-DD

        if (!events || events.length === 0) return;

        console.log(`Found ${events.length} past events to check for user cleanup.`);

        for (const event of events) {
            // Re-use logic: Delete linked users

            // 1. Get Stations linkage
            const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', event.id);

            if (stations && stations.length > 0) {
                const stationIds = stations.map(s => s.id);
                // Soft Cleanup: Remove credentials, keep details
                const { count } = await supabase.from('users')
                    .update({ username: null, password: null, status: 'Inactive' })
                    .in('station_id', stationIds);
                if (count && count > 0) console.log(`Cleaned up credentials for ${count} entrants for ${event.title}`);
            }

            // 2. Cleanup Event Coordinators
            const { count: coordCount } = await supabase.from('users')
                .update({ username: null, password: null, status: 'Inactive' })
                .eq('event_id', event.id)
                .eq('role', 'Coordinator');
            if (coordCount && coordCount > 0) console.log(`Cleaned up credentials for ${coordCount} coordinators for ${event.title}`);
        }

    } catch (e) {
        console.error("Error in cleanupPastEvents:", e);
    }
};
