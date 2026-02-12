import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

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

        // In Phase 3B, 'id' is the native UUID column. 
        // We ensure a UUID is assigned if missing or if it was a temp 'evt-' ID.
        if (!payload.id || String(payload.id).startsWith('evt-')) {
            payload.id = uuidv4();
        }

        // Keep legacy_id for tracing
        if (oldId) {
            payload.legacy_id = oldId;
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
        const payload = { ...req.body };
        const idUuid = toUUID(id);

        if (idUuid) {
            payload.id = idUuid;
            payload.legacy_id = id;
        }

        const { error } = await supabase.from('ministry_events')
            .update(payload)
            .or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Event updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 0. Resolve Event UUID (Robust deletion for both Legacy & UUID)
        const eventUuid = toUUID(id);
        const { data: event } = await supabase
            .from('ministry_events')
            .select('id, legacy_id')
            .or(`id.eq.${eventUuid || '00000000-0000-0000-0000-000000000000'},legacy_id.eq.${id}`)
            .single();

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const targetId = event.id; // Correct UUID

        // 1. Delete Logistics Linked to Event
        // We use OR logic to be safe if stations are still linked via legacy ID in some cases
        const { data: stations } = await supabase.from('pickup_stations').select('id').or(`event_id.eq.${targetId},event_id.eq.${id}`);

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
        await supabase.from('users').delete().eq('event_id', targetId).eq('role', 'Coordinator');

        // 2. Remove Attendance from Members (Handle UUID and Legacy ID just in case)
        const { data: members } = await supabase.from('members').select('id, attended_service_ids').or(`attended_service_ids.cs.{${targetId}},attended_service_ids.cs.{${id}}`);
        if (members && members.length > 0) {
            for (const m of members) {
                const newIds = (m.attended_service_ids || []).filter((i: string) => i !== targetId && i !== id);
                await supabase.from('members').update({ attended_service_ids: newIds }).eq('id', m.id);
            }
        }

        // 3. Remove Attendance from Children
        const { data: children } = await supabase.from('children').select('id, attended_service_ids').or(`attended_service_ids.cs.{${targetId}},attended_service_ids.cs.{${id}}`);
        if (children && children.length > 0) {
            for (const c of children) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== targetId && i !== id);
                await supabase.from('children').update({ attended_service_ids: newIds }).eq('id', c.id);
            }
        }

        // 4. Remove Attendance from Personal Vehicles
        const { data: pCars } = await supabase.from('personal_vehicles').select('id, attended_service_ids').or(`attended_service_ids.cs.{${targetId}},attended_service_ids.cs.{${id}}`);
        if (pCars && pCars.length > 0) {
            for (const c of pCars) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== targetId && i !== id);
                await supabase.from('personal_vehicles').update({ attended_service_ids: newIds }).eq('id', c.id);
            }
        }

        // 5. Delete Related Incidents (FK Constraint fix)
        await supabase.from('incidents').delete().eq('service_id', targetId);

        // 6. Delete Related Souls (Cleanup)
        // FIX: Delete by event_id (UUID) OR source_id (Legacy) to satisfy FK constraint
        await supabase.from('souls').delete().or(`event_id.eq.${targetId},source_id.eq.${targetId},source_id.eq.${id}`);

        // 7. Delete Volunteer Attendance (FK Constraint fix)
        await supabase.from('volunteer_attendance').delete().eq('service_id', targetId);

        // 8. Unlink Personal Vehicles (FK Constraint fix)
        await supabase.from('personal_vehicles').update({ current_service_id: null }).or(`current_service_id.eq.${targetId},current_service_id.eq.${id}`);

        // 9. Delete Related Finance Transactions (FK Constraint fix)
        await supabase.from('transactions').delete().eq('event_id', targetId);

        // 10. Delete Next Gen Souls (FK Constraint fix - revealed by error)
        await supabase.from('next_gen_souls').delete().eq('service_id', targetId);

        // 11. Delete the Event itself
        const { error } = await supabase.from('ministry_events').delete().eq('id', targetId);
        if (error) throw error;

        res.json({ message: 'Event and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getEventHighlights = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        let eventUuid = toUUID(id);

        if (!eventUuid) {
            const { data: event } = await supabase
                .from('ministry_events')
                .select('id')
                .eq('legacy_id', id)
                .single();

            eventUuid = event?.id;
            logLegacyFallback('ministry_events', id, 'getEventHighlights');
        }

        if (!eventUuid) {
            return res.status(400).json({ error: "Event not found or missing UUID mapping" });
        }

        // 1. Fetch Event Header & Metadata (Base Stats Source)
        const eventQuery = supabase.from('ministry_events').select('*').eq('id', eventUuid).single();

        // 2. Fetch Service Attendance
        const attendanceQuery = supabase.from('service_attendance').select('member_id').eq('service_id', eventUuid);

        // 3. Fetch Souls (Main Table)
        const soulsQuery = supabase.from('souls').select('id').or(`event_id.eq.${eventUuid},source_id.eq.${eventUuid}`);

        // 4. Fetch Next Gen Souls
        const nextGenSoulsQuery = supabase.from('next_gen_souls').select('id').eq('service_id', eventUuid);

        // 5. Fetch Finance Expenditure
        const financeQuery = supabase.from('transactions').select('amount').eq('event_id', eventUuid).eq('type', 'Expense');

        // Execute core queries in parallel
        const [
            { data: eventData },
            { data: attendanceData },
            { data: soulsData },
            { data: nextGenData },
            { data: financeData }
        ] = await Promise.all([
            eventQuery,
            attendanceQuery,
            soulsQuery,
            nextGenSoulsQuery,
            financeQuery
        ]);

        // 6. Logistics Stats (Heavier chain)
        let fleetCount = 0;
        let logisticsChildren = 0;
        let pCount = 0;
        let pFirstTimers = 0;
        let pStudents = 0;
        let pInstitutions = 0;
        let pSouls = 0;
        let fleetExpenditure = 0;

        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', eventUuid);
        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);
            const { data: vehicles } = await supabase.from('vehicles').select('id, children, finance_details').in('station_id', stationIds);

            if (vehicles && vehicles.length > 0) {
                fleetCount = vehicles.length;
                logisticsChildren = vehicles.reduce((acc, v) => acc + (v.children || 0), 0);

                // Extract fleet expenditure
                fleetExpenditure = vehicles.reduce((acc, v) => {
                    const dispatch = v.finance_details?.ongoingDispatch;
                    return acc + (dispatch ? parseFloat(dispatch) || 0 : 0);
                }, 0);

                const vehicleIds = vehicles.map(v => v.id);
                const { data: passengers } = await supabase.from('passengers')
                    .select('id, is_first_time, category, soul_won')
                    .in('vehicle_id', vehicleIds);

                if (passengers) {
                    pCount = passengers.length;
                    pFirstTimers = passengers.filter(p => p.is_first_time === 'Yes').length;
                    pStudents = passengers.filter(p => p.category === 'Student').length;
                    pInstitutions = passengers.filter(p => p.category === 'Institution').length;
                    pSouls = passengers.filter(p => p.soul_won === true).length;
                }
            }
        }

        // 7. Personal Cars
        const { count: pcCount } = await supabase.from('personal_vehicles')
            .select('*', { count: 'exact', head: true })
            .or(`current_service_id.eq.${eventUuid},attended_service_ids.cs.{"${eventUuid}"}`);

        // 8. Aggregate final values
        const serviceAttendanceCount = attendanceData?.length || 0;
        const soulsTotal = (soulsData?.length || 0) + (nextGenData?.length || 0) || pSouls;
        const financeExpenditure = financeData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0;

        // Final Logic consistent with RPC: MAX(Logistics, Service)
        const finalAttendees = Math.max(pCount + logisticsChildren, serviceAttendanceCount);

        // If we found NO data via live check-in tables, fallback to the snapshot in ministry_events.stats
        // This handles "historical" records from before the real-time system was active.
        const snapshot = eventData?.stats || {};

        const response = {
            vehicles: fleetCount || snapshot.vehicles || 0,
            personalCars: pcCount || snapshot.personalCars || 0,
            students: pStudents || snapshot.students || 0,
            institutions: pInstitutions || snapshot.institutions || 0,
            attendees: finalAttendees || snapshot.attendees || 0,
            firstTimers: pFirstTimers || snapshot.firstTimers || 0,
            soulsWon: soulsTotal || snapshot.soulsWon || 0,
            children: logisticsChildren || snapshot.children || 0,
            expenditure: (fleetExpenditure + financeExpenditure) || (snapshot.expenditure ? parseFloat(snapshot.expenditure.replace(/,/g, '')) : 0) || 0
        };

        res.json(response);
    } catch (error: any) {
        console.error("[getEventHighlights] Error:", error);
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
