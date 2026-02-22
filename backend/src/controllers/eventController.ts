import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

export const getAllEvents = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const search = req.query.search as string;

        const offset = (page - 1) * limit;

        let query = supabase
            .from('ministry_events')
            .select('*', { count: 'exact' })
            .eq('manifest_id', manifestId); // Tenant Isolation

        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        query = query.range(offset, offset + limit - 1);
        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;

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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body };

        if (!payload.id) {
            payload.id = uuidv4();
        }

        if (payload.service_number === undefined || payload.service_number === null) {
            payload.service_number = 1;
        }

        payload.manifest_id = manifestId; // INJECT TENANT ID

        const { data, error } = await supabase
            .from('ministry_events')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        if (error) throw error;

        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message, details: error.details });
    }
};

export const updateEvent = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const payload = { ...req.body };
        const idUuid = toUUID(id);
        const { error } = await supabase.from('ministry_events')
            .update(payload)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid);
        if (error) throw error;
        res.json({ message: 'Event updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const eventUuid = toUUID(id);
        const { data: event } = await supabase
            .from('ministry_events')
            .select('id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', eventUuid)
            .single();

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const targetId = event.id;

        const { data: stations } = await supabase.from('pickup_stations').select('id')
            .eq('manifest_id', manifestId).eq('event_id', targetId);

        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);

            await supabase.from('users').delete().eq('manifest_id', manifestId).in('station_id', stationIds);

            for (const station of stations) {
                const { data: vehicles } = await supabase.from('vehicles').select('id').eq('manifest_id', manifestId).eq('station_id', station.id);
                if (vehicles && vehicles.length > 0) {
                    const vIds = vehicles.map(v => v.id);
                    await supabase.from('passengers').delete().eq('manifest_id', manifestId).in('vehicle_id', vIds);
                    await supabase.from('vehicles').delete().eq('manifest_id', manifestId).in('id', vIds);
                }
                await supabase.from('pickup_stations').delete().eq('manifest_id', manifestId).eq('id', station.id);
            }
        }

        await supabase.from('users').delete().eq('manifest_id', manifestId).eq('event_id', targetId).eq('role', 'Coordinator');

        const { data: members } = await supabase.from('members').select('id, attended_service_ids')
            .eq('manifest_id', manifestId)
            .contains('attended_service_ids', [targetId]);
        if (members && members.length > 0) {
            for (const m of members) {
                const newIds = (m.attended_service_ids || []).filter((i: string) => i !== targetId);
                await supabase.from('members').update({ attended_service_ids: newIds }).eq('manifest_id', manifestId).eq('id', m.id);
            }
        }

        const { data: children } = await supabase.from('children').select('id, attended_service_ids')
            .eq('manifest_id', manifestId)
            .contains('attended_service_ids', [targetId]);
        if (children && children.length > 0) {
            for (const c of children) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== targetId);
                await supabase.from('children').update({ attended_service_ids: newIds }).eq('manifest_id', manifestId).eq('id', c.id);
            }
        }

        const { data: pCars } = await supabase.from('personal_vehicles').select('id, attended_service_ids')
            .eq('manifest_id', manifestId)
            .contains('attended_service_ids', [targetId]);
        if (pCars && pCars.length > 0) {
            for (const c of pCars) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== targetId);
                await supabase.from('personal_vehicles').update({ attended_service_ids: newIds }).eq('manifest_id', manifestId).eq('id', c.id);
            }
        }

        await supabase.from('incidents').delete().eq('manifest_id', manifestId).eq('service_id', targetId);
        await supabase.from('souls').delete().eq('manifest_id', manifestId).eq('event_id', targetId);
        await supabase.from('volunteer_attendance').delete().eq('manifest_id', manifestId).eq('service_id', targetId);
        await supabase.from('personal_vehicles').update({ current_service_id: null }).eq('manifest_id', manifestId).eq('current_service_id', targetId);
        await supabase.from('transactions').delete().eq('manifest_id', manifestId).eq('event_id', targetId);
        await supabase.from('next_gen_souls').delete().eq('manifest_id', manifestId).eq('service_id', targetId);

        const { error } = await supabase.from('ministry_events').delete().eq('manifest_id', manifestId).eq('id', targetId);
        if (error) throw error;

        res.json({ message: 'Event and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getEventHighlights = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const eventUuid = toUUID(id);

        if (!eventUuid) {
            return res.status(400).json({ error: "Event not found or missing UUID mapping" });
        }

        const eventQuery = supabase.from('ministry_events').select('*').eq('manifest_id', manifestId).eq('id', eventUuid).single();
        const attendanceQuery = supabase.from('service_attendance').select('member_id').eq('manifest_id', manifestId).eq('service_id', eventUuid);
        const soulsQuery = supabase.from('souls').select('id').eq('manifest_id', manifestId).eq('event_id', eventUuid);
        const nextGenSoulsQuery = supabase.from('next_gen_souls').select('id').eq('manifest_id', manifestId).eq('service_id', eventUuid);
        const financeQuery = supabase.from('transactions').select('amount').eq('manifest_id', manifestId).eq('event_id', eventUuid).eq('type', 'Expense');

        const [
            { data: eventData },
            { data: attendanceData },
            { data: soulsData },
            { data: nextGenData },
            { data: financeData },
            { count: childrenFirstTimersCount }
        ] = await Promise.all([
            eventQuery,
            attendanceQuery,
            soulsQuery,
            nextGenSoulsQuery,
            financeQuery,
            supabase.from('children')
                .select('*', { count: 'exact', head: true })
                .eq('manifest_id', manifestId)
                .eq('category', 'First Timer')
                .contains('attended_service_ids', [eventUuid])
        ]);

        let fleetCount = 0;
        let logisticsChildren = 0;
        let pCount = 0;
        let pFirstTimers = 0;
        let pStudents = 0;
        let pInstitutions = 0;
        let pSouls = 0;
        let fleetExpenditure = 0;

        // 🚨 CRITICAL FIX: Fetch all passengers directly by event to avoid dropping them 
        // if the event has manual passengers but 0 logistics stations!
        const { data: passengers } = await supabase.from('passengers')
            .select('id, is_first_time, category, soul_won')
            .eq('manifest_id', manifestId)
            .eq('event_id', eventUuid);

        if (passengers && passengers.length > 0) {
            pCount = passengers.length;
            pFirstTimers = passengers.filter(p => p.is_first_time === 'Yes').length;
            pStudents = passengers.filter(p => p.category === 'Student').length;
            pInstitutions = passengers.filter(p => p.category === 'Institution').length;
            pSouls = passengers.filter(p => p.soul_won === true).length;
        }

        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('manifest_id', manifestId).eq('event_id', eventUuid);
        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);
            const { data: vehicles } = await supabase.from('vehicles').select('id, children, finance_details').eq('manifest_id', manifestId).in('station_id', stationIds);

            if (vehicles && vehicles.length > 0) {
                fleetCount = vehicles.length;
                logisticsChildren = vehicles.reduce((acc, v) => acc + (v.children || 0), 0);
                fleetExpenditure = vehicles.reduce((acc, v) => {
                    const dispatch = v.finance_details?.ongoingDispatch;
                    return acc + (dispatch ? parseFloat(dispatch) || 0 : 0);
                }, 0);
            }
        }

        const { count: pcCount } = await supabase.from('personal_vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .contains('attended_service_ids', [eventUuid]);

        const serviceAttendanceCount = attendanceData?.length || 0;
        const soulsTotal = (soulsData?.length || 0) + (nextGenData?.length || 0) || pSouls;
        const financeExpenditure = financeData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0;
        const finalAttendees = Math.max(pCount + logisticsChildren, serviceAttendanceCount);
        const snapshot = eventData?.stats || {};

        const response = {
            vehicles: fleetCount || snapshot.vehicles || 0,
            personalCars: pcCount || snapshot.personalCars || 0,
            students: pStudents || snapshot.students || 0,
            institutions: pInstitutions || snapshot.institutions || 0,
            attendees: finalAttendees || snapshot.attendees || 0,
            firstTimers: (pFirstTimers + (childrenFirstTimersCount || 0)) || snapshot.firstTimers || 0,
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

export const cleanupPastEvents = async () => {
    try {
        const now = new Date();
        const pastThreshold = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        const { data: events } = await supabase
            .from('ministry_events')
            .select('id, title, date')
            .lt('date', pastThreshold.toISOString().split('T')[0]);

        if (!events || events.length === 0) return;

        console.log(`Found ${events.length} past events to check for user cleanup.`);

        for (const event of events) {
            const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', event.id);

            if (stations && stations.length > 0) {
                const stationIds = stations.map(s => s.id);
                const { count } = await supabase.from('users')
                    .update({ username: null, password: null, status: 'Inactive' })
                    .in('station_id', stationIds);
                if (count && count > 0) console.log(`Cleaned up credentials for ${count} entrants for ${event.title}`);
            }

            const { count: coordCount } = await supabase.from('users')
                .update({ username: null, password: null, status: 'Inactive' })
                .eq('event_id', event.id)
                .in('role', ['Vehicle Coordinator', 'Stage Coordinator']);
            if (coordCount && coordCount > 0) console.log(`Cleaned up credentials for ${coordCount} coordinators for ${event.title}`);
        }

        // Permanently delete the Auth identities for any Inactive/Null users
        const { error: rpcError } = await supabase.rpc('delete_expired_event_auth_users');
        if (rpcError) {
            console.error("Failed to permanently delete auth users:", rpcError);
        } else {
            console.log("Successfully swept expired Auth identities from Supabase.");
        }

    } catch (e) {
        console.error("Error in cleanupPastEvents:", e);
    }
};
