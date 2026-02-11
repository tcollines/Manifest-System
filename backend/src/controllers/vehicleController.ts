import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

// Helper: Generate simple username
const generateUsername = (name: string) => {
    return name.trim().replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
};

// --- Vehicles ---
export const getVehicles = async (req: Request, res: Response) => {
    const coordinator = req.query.coordinator as string;
    const coordinatorUid = req.query.coordinatorUid as string;
    const eventId = req.query.eventId as string;
    const stationId = req.query.stationId as string; // NEW: Support Stage Scoping

    // Treat 'undefined' or 'null' strings from frontend as falsey
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        // STRICT SCOPING RULE: Never return global list
        // If neither coordinator nor eventId nor stationId is provided, block request
        // Exception: If we decide to allow global list for super-admin, we'd need auth middleware check.
        // For now, assume frontend always sends context.
        if (!coordinator && !validEventId && !stationId) {
            // Fallback: If absolutely no filter, return empty or limit 50? 
            return res.json([]);
        }

        let query = supabase.from('vehicles').select('*');

        if (coordinatorUid && coordinator) {
            query = query.or(`coordinator_uid.eq.${coordinatorUid},coordinator.eq.${coordinator}`);
        } else if (coordinatorUid) {
            query = query.eq('coordinator_uid', coordinatorUid);
        } else if (coordinator) {
            // Fallback to name if no UID provided
            query = query.eq('coordinator', coordinator);
        }

        if (validEventId) {
            const idUuid = toUUID(validEventId);
            if (idUuid) {
                query = query.or(`event_id.eq.${idUuid},legacy_event_id.eq.${validEventId}`);
            } else {
                query = query.eq('legacy_event_id', validEventId);
                logLegacyFallback('vehicles', validEventId, 'getVehicles_Event');
            }
        }

        if (stationId) {
            const idUuid = toUUID(stationId);
            if (idUuid) {
                query = query.or(`station_id.eq.${idUuid},legacy_station_id.eq.${stationId}`);
            } else {
                query = query.eq('legacy_station_id', stationId);
                logLegacyFallback('vehicles', stationId, 'getVehicles_Station');
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addVehicle = async (req: Request, res: Response) => {
    try {
        const { coordinator, event_id, station_id, coordinator_contact } = req.body;
        let { coordinator_uid } = req.body;

        // 1. Resolve Coordinator UID if missing
        if (!coordinator_uid && coordinator) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .ilike('name', coordinator)
                .maybeSingle(); // Use maybeSingle to avoid error if multiple/none

            if (existingUser) {
                coordinator_uid = existingUser.id;
            } else {
                // Auto-create User for this coordinator
                const newUserId = uuidv4();
                const { error: createError } = await supabase.from('users').insert([{
                    id: newUserId,
                    name: coordinator,
                    role: 'Vehicle Coordinator',
                    username: generateUsername(coordinator),
                    password: 'ChangeMe123!', // Standard default
                    contact: coordinator_contact || null,
                    event_id: event_id,
                    department_id: 'd5', // Transportation Department
                    status: 'Active'
                }]);

                if (!createError) {
                    coordinator_uid = newUserId;
                } else {
                    console.error("Failed to auto-create user for vehicle:", createError.message);
                    // Fallback: Proceed without UID? Or fail?
                    // Let's proceed, but we won't be able to enforce limit effectively.
                }
            }
        }

        // 2. Enforce Limit: Check for duplicate assignment
        if (coordinator_uid && event_id) {
            const { data: dups, error: dupError } = await supabase
                .from('vehicles')
                .select('id')
                .eq('event_id', event_id)
                .eq('coordinator_uid', coordinator_uid);

            if (dupError) throw dupError;
            if (dups && dups.length > 0) {
                return res.status(400).json({ error: `Coordinator '${coordinator}' is already assigned to another vehicle in this event.` });
            }
        }

        // 3. Insert Vehicle (Phase 3B: id, station_id, event_id are UUIDs)
        const payload = {
            ...req.body,
            coordinator_uid,
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            legacy_id: req.body.id || null,
            station_id: toUUID(station_id),
            legacy_station_id: station_id,
            event_id: toUUID(event_id),
            legacy_event_id: event_id
        };

        const { error } = await supabase.from('vehicles').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Vehicle added' });
    } catch (error: any) {
        console.error("Add Vehicle Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { coordinator, event_id, coordinator_contact } = req.body;
        // Check if coordinator is changing
        // If 'coordinator' name matches current, we might not need to re-resolve, 
        // BUT if they updated the name string, we should re-resolve.

        let { coordinator_uid } = req.body;

        // 1. Resolve UID if we have a name but no UID
        if (!coordinator_uid && coordinator) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .ilike('name', coordinator)
                .maybeSingle();

            if (existingUser) {
                coordinator_uid = existingUser.id;
            } else {
                // Auto-create User
                const newUserId = uuidv4();
                const { error: createError } = await supabase.from('users').insert([{
                    id: newUserId,
                    name: coordinator,
                    role: 'Coordinator',
                    username: generateUsername(coordinator),
                    password: 'ChangeMe123!',
                    contact: coordinator_contact || null,
                    event_id: event_id, // Might be undefined if not in body
                    status: 'Active'
                }]);
                if (!createError) coordinator_uid = newUserId;
            }
        }

        // 2. Enforce Limit (Ignore current vehicle)
        // Need event_id. If not in body, fetch from DB?
        // Usually update contains event_id? Frontend sends what it has.
        // Let's fetch current vehicle to be safe if event_id missing
        let targetEventId = event_id;
        if (!targetEventId) {
            const { data: currentV } = await supabase.from('vehicles').select('event_id').eq('id', id).single();
            targetEventId = currentV?.event_id;
        }

        if (coordinator_uid && targetEventId) {
            const { data: dups } = await supabase
                .from('vehicles')
                .select('id')
                .eq('event_id', targetEventId)
                .eq('coordinator_uid', coordinator_uid)
                .neq('id', id); // Exclude self

            if (dups && dups.length > 0) {
                return res.status(400).json({ error: `Coordinator '${coordinator}' is already assigned to another vehicle in this event.` });
            }
        }

        const payload = { ...req.body };
        if (coordinator_uid) payload.coordinator_uid = coordinator_uid;

        // Sync authoritative UUIDs and legacy tracing
        const idUuid = toUUID(id);
        if (idUuid) {
            payload.id = idUuid;
            payload.legacy_id = id;
        }
        if (payload.station_id) {
            payload.legacy_station_id = payload.station_id;
            payload.station_id = toUUID(payload.station_id);
        }
        if (targetEventId) {
            payload.legacy_event_id = targetEventId;
            payload.event_id = toUUID(targetEventId);
        }

        const { error } = await supabase.from('vehicles').update(payload).or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Vehicle updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVehicleStage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { stage, approvals } = req.body;
    try {
        const { error } = await supabase.from('vehicles').update({
            current_stage: stage,
            approvals: approvals
        }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Vehicle stage updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVehicleLocation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { location } = req.body;
    try {
        const { error } = await supabase.from('vehicles').update({ location }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Location updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVehicleChildren = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { children } = req.body;
    try {
        const { error } = await supabase.from('vehicles').update({ children }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Children count updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Cascade delete passengers first
        const { error: pError } = await supabase.from('passengers').delete().eq('vehicle_id', id);
        if (pError) throw pError;

        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Vehicle deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// --- Passengers ---
export const getPassengers = async (req: Request, res: Response) => {
    const vehicleId = req.query.vehicleId as string;
    const eventId = req.query.eventId as string;
    // Treat 'undefined' or 'null' strings from frontend as falsey
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        // STRICT SCOPING RULE: Never return global list
        if (!validEventId && !vehicleId) {
            return res.json([]);
        }

        let query = supabase.from('passengers').select('*');
        if (vehicleId) {
            const idUuid = toUUID(vehicleId);
            if (idUuid) {
                query = query.or(`vehicle_id.eq.${idUuid},legacy_vehicle_id.eq.${vehicleId}`);
            } else {
                query = query.eq('legacy_vehicle_id', vehicleId);
                logLegacyFallback('passengers', vehicleId, 'getPassengers_Vehicle');
            }
        }
        if (validEventId) {
            // Complex join-like filter: passengers -> vehicles -> stations -> event_id
            const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', validEventId);
            const stationIds = (stations || []).map(s => s.id);
            if (stationIds.length > 0) {
                const { data: vehicles } = await supabase.from('vehicles').select('id').in('station_id', stationIds);
                const vehicleIds = (vehicles || []).map(v => v.id);
                if (vehicleIds.length > 0) {
                    query = query.in('vehicle_id', vehicleIds);
                } else {
                    return res.json([]); // No vehicles for these stations
                }
            } else {
                return res.json([]); // No stations for this event
            }
        }
        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addPassenger = async (req: Request, res: Response) => {
    try {
        const payload = {
            ...req.body,
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            legacy_id: req.body.id || null,
            vehicle_id: toUUID(req.body.vehicle_id),
            legacy_vehicle_id: req.body.vehicle_id,
            event_id: toUUID(req.body.event_id),
            legacy_event_id: req.body.event_id,
            gender: req.body.gender || 'Male',
            is_first_time: req.body.is_first_time || req.body.isFirstTime || 'No',
            station_id: toUUID(req.body.station_id),
            legacy_station_id: req.body.station_id
        };
        const { error } = await supabase.from('passengers').insert([payload]);
        if (error) {
            console.error("PASSENGER INSERT ERROR:", JSON.stringify(error, null, 2));
            console.log("PASSENGER INSERT PAYLOAD:", JSON.stringify(payload, null, 2));
            throw error;
        }
        res.status(201).json({ message: 'Passenger added' });
    } catch (error: any) {
        // Ensure error is logged even if caught
        if (!error.code) { // If not logged above
            console.error("PASSENGER ADD EXCEPTION:", error);
        }
        res.status(500).json({ error: error.message, details: error.details });
    }
};

export const updatePassenger = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const payload = { ...req.body };
        const idUuid = toUUID(id);
        if (idUuid) {
            payload.id = idUuid;
            payload.legacy_id = id;
        }
        if (payload.vehicle_id) {
            payload.legacy_vehicle_id = payload.vehicle_id;
            payload.vehicle_id = toUUID(payload.vehicle_id);
        }
        if (payload.event_id) {
            payload.legacy_event_id = payload.event_id;
            payload.event_id = toUUID(payload.event_id);
        }

        const { error } = await supabase.from('passengers').update(payload).or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Passenger updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePassenger = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('passengers').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Passenger deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// --- Personal Vehicles ---
export const getPersonalVehicles = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('personal_vehicles').select('*').order('registered_date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addPersonalVehicle = async (req: Request, res: Response) => {
    try {
        const payload = {
            ...req.body,
            registered_date: new Date().toISOString(),
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            legacy_id: req.body.id || null
        };
        const { error } = await supabase.from('personal_vehicles').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Personal vehicle added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePersonalVehicleStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, serviceId } = req.body;
    try {
        const now = new Date().toISOString();
        const payload: any = { status };

        if (status === 'Checked In') {
            payload.check_in_time = now;
            payload.current_service_id = toUUID(serviceId);
            payload.legacy_current_service_id = serviceId;
        } else {
            payload.check_out_time = now;
        }

        const { error } = await supabase.from('personal_vehicles').update(payload).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Status updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
