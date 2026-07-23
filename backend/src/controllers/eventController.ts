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
        res.status(500).json({ error: 'An internal server error occurred.' });
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

        res.status(201).json(data);
    } catch (error: any) {
        console.error('[createEvent ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
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
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const eventUuid = toUUID(id);

        // --- NEW: Pre-fetch & Delete Auth Identities before Cascade ---
        // 1. Get all stations for this event
        const { data: stations } = await supabase.from('pickup_stations').select('id')
            .eq('manifest_id', manifestId).eq('event_id', eventUuid);
        const stationIds = stations?.map(s => s.id) || [];

        // 2. Get all users tied either directly to the event OR to its stations
        let userQueryStr = `event_id.eq.${eventUuid}`;
        if (stationIds.length > 0) {
            userQueryStr += `,station_id.in.(${stationIds.join(',')})`;
        }

        const { data: usersToDelete } = await supabase.from('users').select('id')
            .eq('manifest_id', manifestId)
            .or(userQueryStr);

        if (usersToDelete && usersToDelete.length > 0) {
            console.log(`[deleteEvent] Found ${usersToDelete.length} Auth identities to sweep before cascade.`);
            for (const user of usersToDelete) {
                await supabase.auth.admin.deleteUser(user.id).catch(e => {
                    console.warn(`[deleteEvent] Failed to delete Auth Identity for ${user.id}:`, e.message);
                });
            }
        }
        // --- END ---

        // Execute the fast, fully-transactional cascading delete RPC on the database directly
        const { error } = await supabase.rpc('delete_event_cascade', {
            p_manifest_id: manifestId,
            p_event_id: eventUuid
        });

        if (error) {
            console.error("[deleteEvent] RPC Error:", error);
            if (error.message.includes('Event not found')) {
                return res.status(404).json({ error: "Event not found or unauthorized" });
            }
            throw error;
        }

        res.json({ message: 'Event and related data deleted instantaneously via database cascading RPC' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
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
            .select('id, is_first_time, category, soul_won, school, student_class, residence')
            .eq('manifest_id', manifestId)
            .eq('event_id', eventUuid);

        if (passengers && passengers.length > 0) {
            pCount = passengers.length;
            pFirstTimers = passengers.filter(p => p.is_first_time === 'Yes').length;
            pInstitutions = passengers.filter(p => p.category === 'Institution').length;
            pSouls = passengers.filter(p => p.soul_won === true).length;
            
            pStudents = passengers.filter(p => {
                if (p.category === 'Institution') return false;
                if (p.category === 'Student') return true;
                if (p.school || p.student_class) return true;
                return false;
            }).length;
        }

        const { count: pcCount } = await supabase.from('personal_vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .contains('attended_service_ids', [eventUuid]);

        let residentialCount = 0;
        if (passengers && passengers.length > 0) {
            residentialCount = passengers.filter(p => p.category === 'Member').length;
        }

        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('manifest_id', manifestId).eq('event_id', eventUuid);
        let earliestSetOff: Date | null = null;
        let pendingCount = 0;
        let arrivedCount = 0;

        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);
            const { data: vehicles } = await supabase.from('vehicles').select('id, children, finance_details, ongoing_start_time, status, current_stage, time_arrival').eq('manifest_id', manifestId).in('station_id', stationIds);

            if (vehicles && vehicles.length > 0) {
                fleetCount = vehicles.length;
                logisticsChildren = vehicles.reduce((acc, v) => acc + (v.children || 0), 0);
                fleetExpenditure = vehicles.reduce((acc, v) => {
                    const dispatch = v.finance_details?.ongoingDispatch;
                    return acc + (dispatch ? parseFloat(dispatch) || 0 : 0);
                }, 0);

                for (const v of vehicles) {
                    if (v.status === 'Pending' || v.current_stage === 'Transit') pendingCount++;
                    if (v.status === 'Arrived' || v.current_stage === 'Arrived' || v.current_stage === 'Completed') arrivedCount++;
                    
                    if (v.ongoing_start_time) {
                        const d = new Date(v.ongoing_start_time);
                        if (!isNaN(d.getTime())) {
                            if (!earliestSetOff || d < earliestSetOff) {
                                earliestSetOff = d;
                            }
                        }
                    }
                }
            }
        }

        const serviceAttendanceCount = attendanceData?.length || 0;
        const soulsTotal = (soulsData?.length || 0) + (nextGenData?.length || 0) || pSouls;
        const financeExpenditure = financeData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0;
        const finalAttendees = Math.max(pCount + logisticsChildren, serviceAttendanceCount);
        const snapshot = eventData?.stats || {};

        let estArrivalStr = "Evaluating...";
        if (arrivedCount > 0 && pendingCount === 0) estArrivalStr = "All vehicles arrived";
        else if (pendingCount > 0) estArrivalStr = `Estimating for ${pendingCount} pending vehicles`;

        const response = {
            vehicles: fleetCount || snapshot.vehicles || 0,
            personalCars: pcCount || snapshot.personalCars || 0,
            students: pStudents || snapshot.students || 0,
            institutions: pInstitutions || snapshot.institutions || 0,
            attendees: finalAttendees || snapshot.attendees || 0,
            firstTimers: (pFirstTimers + (childrenFirstTimersCount || 0)) || snapshot.firstTimers || 0,
            soulsWon: soulsTotal || snapshot.soulsWon || 0,
            children: logisticsChildren || snapshot.children || 0,
            expenditure: (fleetExpenditure + financeExpenditure) || (snapshot.expenditure ? parseFloat(snapshot.expenditure.replace(/,/g, '')) : 0) || 0,
            setOffTime: earliestSetOff ? earliestSetOff.toISOString() : null,
            estimatedArrival: estArrivalStr,
            residentials: residentialCount || 0,
            vips: 0
        };

        res.json(response);
    } catch (error: any) {
        console.error("[getEventHighlights] Error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

/**
 * GET /events/:id/passengers?category=Institution|Student|FirstTimer|All
 *
 * Returns passengers for an event filtered by category.
 * This MUST go through the backend because pickup_stations and vehicles
 * have RLS that blocks direct frontend (anon key) queries. The backend
 * uses the service role key which bypasses RLS.
 */
export const getEventPassengers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const eventId = req.params.id;
        const category = req.query.category as string || 'All';

        // 1. Get Stations for this event (bypasses RLS via service role key)
        const { data: stations, error: stErr } = await supabase
            .from('pickup_stations')
            .select('id, name')
            .eq('manifest_id', manifestId)
            .eq('event_id', eventId);

        if (stErr) throw stErr;
        if (!stations || stations.length === 0) {
            return res.json([]);
        }

        const stationIds = stations.map(s => s.id);
        const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

        // 2. Get Vehicles linked to those stations
        const { data: vehicles, error: vehErr } = await supabase
            .from('vehicles')
            .select('id, number_plate, driver_name, driver_contact, coordinator, station_id')
            .eq('manifest_id', manifestId)
            .in('station_id', stationIds);

        if (vehErr) throw vehErr;
        if (!vehicles || vehicles.length === 0) {
            return res.json([]);
        }

        const vehicleIds = vehicles.map(v => v.id);
        const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

        // 3. Get Passengers scoped to this event and vehicle list
        let passQuery = supabase
            .from('passengers')
            .select('*')
            .eq('manifest_id', manifestId)
            .eq('event_id', eventId)
            .in('vehicle_id', vehicleIds);

        if (category === 'Institution') {
            passQuery = passQuery.eq('category', 'Institution');
        } else if (category === 'Student') {
            // We fetch all to let the JS filter handle school/student_class checks reliably
        }
        // If category === 'All', no additional filter

        const { data: passengers, error: passErr } = await passQuery;
        if (passErr) throw passErr;

        // 4. Get coordinators for contact mapping
        const { data: usersData } = await supabase
            .from('users')
            .select('name, contact')
            .eq('manifest_id', manifestId)
            .in('role', ['Coordinator', 'Vehicle Coordinator', 'Stage Coordinator']);
        const coordinatorMap = Object.fromEntries(
            (usersData || []).map(u => [u.name?.trim().toLowerCase(), u.contact])
        );

        // 5. Map and enrich passenger data
        const mapped = (passengers || []).map(p => {
            const vehicle = vehicleMap[p.vehicle_id];
            const stationName = vehicle?.station_id ? stationMap[vehicle.station_id] : 'Unknown Station';
            const coordName = vehicle?.coordinator || '';
            const coordContact = coordinatorMap[coordName.trim().toLowerCase()] || 'N/A';

            return {
                ...p,
                isFirstTime: p.is_first_time === 'Yes' || p.is_first_time === true,
                soulWon: p.soul_won === true,
                studentClass: p.student_class,
                vehicleNumberPlate: vehicle?.number_plate,
                vehicleDriver: vehicle?.driver_name,
                vehicleContact: vehicle?.driver_contact,
                vehicleCoordinator: coordName,
                vehicleCoordinatorContact: coordContact,
                vehicleStationName: stationName
            };
        });

        // Filter for Student category on frontend-side logic
        const filtered = category === 'Student'
            ? mapped.filter(p => {
                if (p.category === 'Institution') return false;
                if (p.category === 'Student') return true;
                if (p.school || p.student_class) return true;
                return false;
            })
            : mapped;

        // Sort newest first
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        res.json(filtered);
    } catch (error: any) {
        console.error('[getEventPassengers] Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
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

export const getServiceSnapshot = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId || (req as any).user?.manifest_id;
    const serviceId = req.params.id || req.params.serviceId || (req.query.serviceId as string);

    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });
    if (!serviceId) return res.status(400).json({ error: 'Service ID is required' });

    try {
        // 1. Fetch Service Details
        const { data: serviceData, error: serviceError } = await supabase
            .from('services')
            .select('id, date, manual_children_count')
            .eq('id', serviceId)
            .eq('manifest_id', manifestId)
            .single();

        if (serviceError || !serviceData) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }

        // 2. Fetch Attendees (service_attendance)
        const { data: attendanceData, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', serviceId)
            .eq('manifest_id', manifestId);

        if (attError) throw attError;
        const memberIds = attendanceData ? attendanceData.map(a => String(a.member_id)) : [];

        // 3. Calculate First Timers (joined on service date)
        const serviceDate = serviceData.date;
        let firstTimersCount = 0;
        if (serviceDate) {
            const { count, error: ftError } = await supabase
                .from('members')
                .select('id', { count: 'exact', head: true })
                .eq('manifest_id', manifestId)
                .eq('joined_date', serviceDate);
            if (!ftError && count !== null) {
                firstTimersCount = count;
            }
        }

        // 4. Fetch Main Souls
        const { data: mainSouls, error: msError } = await supabase
            .from('souls')
            .select('id')
            .eq('manifest_id', manifestId)
            .or(`source_id.eq.${serviceId},event_id.eq.${serviceId}`);

        if (msError) throw msError;
        const mainSoulIds = mainSouls ? mainSouls.map(s => String(s.id)) : [];

        // 5. Fetch NextGen Souls
        let nextGenSoulIds: string[] = [];
        try {
            const { data: ngSouls } = await supabase
                .from('next_gen_souls')
                .select('id')
                .eq('manifest_id', manifestId)
                .eq('service_id', serviceId);
            if (ngSouls) nextGenSoulIds = ngSouls.map(s => String(s.id));
        } catch (e) {
            // NextGen souls table is optional
        }

        const allSoulIds = Array.from(new Set([...mainSoulIds, ...nextGenSoulIds]));

        return res.json({
            serviceId,
            memberIds,
            total: memberIds.length,
            manualChildrenCount: serviceData.manual_children_count || 0,
            firstTimers: firstTimersCount,
            soulIds: allSoulIds,
            soulsWon: allSoulIds.length,
            generatedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[getServiceSnapshot] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch service snapshot' });
    }
};
