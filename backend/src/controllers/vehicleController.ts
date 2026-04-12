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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const coordinator = req.query.coordinator as string;
    const coordinatorUid = req.query.coordinatorUid as string;
    const eventId = req.query.eventId as string;
    const stationId = req.query.stationId as string;

    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        if (!coordinator && !validEventId && !stationId) {
            return res.json([]);
        }

        let query = supabase.from('vehicles').select('*').eq('manifest_id', manifestId); // Tenant Isolation
        query = query.order('created_at', { ascending: false });

        const validUid = coordinatorUid ? toUUID(coordinatorUid) : null;

        if (validUid && coordinator) {
            query = query.or(`coordinator_uid.eq.${validUid},coordinator.ilike."${coordinator}"`);
        } else if (validUid) {
            query = query.eq('coordinator_uid', validUid);
        } else if (coordinator) {
            query = query.ilike('coordinator', coordinator);
        }

        if (validEventId) {
            const idUuid = toUUID(validEventId);
            if (idUuid) {
                query = query.eq('event_id', idUuid);
            }
        }

        if (stationId) {
            const idUuid = toUUID(stationId);
            if (idUuid) {
                query = query.eq('station_id', idUuid);
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('vehicles')
            .select('*')
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Vehicle not found' });

        res.json({ vehicle: data });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { coordinator, event_id, station_id, coordinator_contact } = req.body;
        let { coordinator_uid } = req.body;

        if (!coordinator_uid && coordinator) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .ilike('name', coordinator)
                .maybeSingle();

            if (existingUser) {
                coordinator_uid = existingUser.id;
            } else {
                const newUserId = uuidv4();
                const { error: createError } = await supabase.from('users').insert([{
                    manifest_id: manifestId, // INJECT TENANT ID
                    id: newUserId,
                    name: coordinator,
                    role: 'Vehicle Coordinator',
                    username: generateUsername(coordinator),
                    password: 'ChangeMe123!',
                    contact: coordinator_contact || null,
                    event_id: event_id,
                    department_id: 'd5',
                    status: 'Active'
                }]);

                if (!createError) {
                    coordinator_uid = newUserId;
                } else {
                    console.error("Failed to auto-create user for vehicle:", createError.message);
                }
            }
        }

        if (coordinator_uid && event_id) {
            const { data: dups, error: dupError } = await supabase
                .from('vehicles')
                .select('id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .eq('event_id', event_id)
                .eq('coordinator_uid', coordinator_uid);

            if (dupError) throw dupError;
            if (dups && dups.length > 0) {
                return res.status(400).json({ error: `Coordinator '${coordinator}' is already assigned to another vehicle in this event.` });
            }
        }

        const payload = {
            ...req.body,
            manifest_id: manifestId, // INJECT TENANT ID
            coordinator_uid,
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            station_id: toUUID(station_id),
            event_id: toUUID(event_id),
            current_stage: req.body.currentStage || 'Onboarding',
            journey_direction: req.body.journeyDirection || 'Ongoing'
        };
        delete payload.currentStage;
        delete payload.journeyDirection;

        const { data, error } = await supabase.from('vehicles').insert([payload]).select('*').maybeSingle();
        if (error) throw error;
        res.status(201).json({ message: 'Vehicle added', vehicle: data });
    } catch (error: any) {
        console.error("Add Vehicle Error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { coordinator, event_id, coordinator_contact } = req.body;
        let { coordinator_uid } = req.body;

        if (!coordinator_uid && coordinator) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .ilike('name', coordinator)
                .maybeSingle();

            if (existingUser) {
                coordinator_uid = existingUser.id;
            } else {
                const newUserId = uuidv4();
                const { error: createError } = await supabase.from('users').insert([{
                    manifest_id: manifestId, // INJECT TENANT ID
                    id: newUserId,
                    name: coordinator,
                    role: 'Vehicle Coordinator',
                    username: generateUsername(coordinator),
                    password: 'ChangeMe123!',
                    contact: coordinator_contact || null,
                    event_id: event_id,
                    status: 'Active'
                }]);
                if (!createError) coordinator_uid = newUserId;
            }
        }

        let targetEventId = event_id;
        if (!targetEventId) {
            const { data: currentV } = await supabase.from('vehicles').select('event_id')
                .eq('manifest_id', manifestId).eq('id', id).single();
            targetEventId = currentV?.event_id;
        }

        if (coordinator_uid && targetEventId) {
            const { data: dups } = await supabase
                .from('vehicles')
                .select('id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .eq('event_id', targetEventId)
                .eq('coordinator_uid', coordinator_uid)
                .neq('id', id);

            if (dups && dups.length > 0) {
                return res.status(400).json({ error: `Coordinator '${coordinator}' is already assigned to another vehicle in this event.` });
            }
        }

        const payload: any = { ...req.body };
        if (coordinator_uid) payload.coordinator_uid = coordinator_uid;

        const idUuid = toUUID(id);
        if (idUuid) {
            payload.id = idUuid;
        }
        if (payload.station_id) {
            payload.station_id = toUUID(payload.station_id);
        }
        if (targetEventId) {
            payload.event_id = toUUID(targetEventId);
        }

        const expectedVersion = payload.version;
        delete payload.version; // Override trigger expectation

        let query = supabase.from('vehicles')
            .update({ ...payload, version: expectedVersion !== undefined ? expectedVersion + 1 : undefined })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid);

        if (expectedVersion !== undefined) {
            query = query.eq('version', expectedVersion);
        }

        const { data, error } = await query.select('*').maybeSingle();
        if (error) throw error;

        // Optimistic Locking Conflict Check
        if (!data && expectedVersion !== undefined) {
            return res.status(409).json({ error: 'Conflict: This vehicle has been modified by another coordinator. Please refresh to get the latest version.' });
        }

        res.json({ message: 'Vehicle updated', vehicle: data });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateVehicleStage = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { stage, approvals, status, journey_direction, ongoing_arrival_time, return_arrival_time, ongoing_start_time, return_start_time, version } = req.body;
    try {
        const payload: any = {};
        if (stage !== undefined) payload.current_stage = stage;
        if (approvals !== undefined) payload.approvals = approvals;
        if (status !== undefined) payload.status = status;
        if (journey_direction !== undefined) payload.journey_direction = journey_direction;
        if (ongoing_arrival_time !== undefined) payload.ongoing_arrival_time = ongoing_arrival_time;
        if (return_arrival_time !== undefined) payload.return_arrival_time = return_arrival_time;
        if (ongoing_start_time !== undefined) payload.ongoing_start_time = ongoing_start_time;
        if (return_start_time !== undefined) payload.return_start_time = return_start_time;

        // Pre-Verify Tenant Access
        const { data: vRecord, error: vErr } = await supabase.from('vehicles')
            .select('id').eq('manifest_id', manifestId).eq('id', id).maybeSingle();
        if (vErr || !vRecord) return res.status(404).json({ error: 'Vehicle not found' });

        // Optimistic Locking Requirement Removed for Reversion
        // Version increments are now handled manually or ignored for simplicity.

        // Direct Update
        const { data, error } = await supabase.from('vehicles')
            .update({
                current_stage: payload.current_stage,
                approvals: payload.approvals,
                status: payload.status,
                ongoing_start_time: payload.ongoing_start_time,
                return_start_time: payload.return_start_time,
                ongoing_arrival_time: payload.ongoing_arrival_time,
                return_arrival_time: payload.return_arrival_time,
                version: (version || 0) + 1 // Basic increment without enforcement
            })
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Vehicle not found during update' });
        if (error) throw error;

        res.json({ message: 'Vehicle stage updated', vehicle: data });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const startReturnJourney = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { version } = req.body;
    try {
        const { data: vRecord, error: vErr } = await supabase.from('vehicles')
            .select('id').eq('manifest_id', manifestId).eq('id', id).maybeSingle();
        if (vErr || !vRecord) return res.status(404).json({ error: 'Vehicle not found' });

        // 1. Reset all passengers linked to this vehicle
        const { error: pResetErr } = await supabase.from('passengers')
            .update({ verified: false })
            .eq('manifest_id', manifestId)
            .eq('vehicle_id', id);
        if (pResetErr) throw pResetErr;

        // 2. Update the vehicle to Return defaults
        const { data, error } = await supabase.from('vehicles')
            .update({
                journey_direction: 'Return',
                current_stage: 'Onboarding',
                approvals: { registration: 'Pending', finance: 'Pending' },
                version: (version || 0) + 1
            })
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Vehicle not found' });

        res.json({ message: 'Return journey started', vehicle: data });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};


export const updateVehicleFinance = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { finance_details, approvals, current_stage, journey_direction, ongoing_start_time, return_start_time, version } = req.body;
    try {
        const payload: any = {};
        if (finance_details !== undefined) payload.finance_details = finance_details;
        if (approvals !== undefined) payload.approvals = approvals;
        if (current_stage !== undefined) payload.current_stage = current_stage;
        if (journey_direction !== undefined) payload.journey_direction = journey_direction;
        if (ongoing_start_time !== undefined) payload.ongoing_start_time = ongoing_start_time;
        if (return_start_time !== undefined) payload.return_start_time = return_start_time;

        let query = supabase.from('vehicles')
            .update({ ...payload, version: version !== undefined ? version + 1 : undefined })
            .eq('manifest_id', manifestId).eq('id', id);

        if (version !== undefined) {
            query = query.eq('version', version);
        }

        const { data, error } = await query.select('*').maybeSingle();
        if (error) throw error;

        // Optimistic Locking Conflict Check
        if (!data && version !== undefined) {
            return res.status(409).json({ error: 'Conflict: This vehicle has been financially updated by another coordinator. Please refresh.' });
        }

        res.json({ message: 'Vehicle finance updated', vehicle: data });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateVehicleLocation = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { location } = req.body;
    try {
        const { error } = await supabase.from('vehicles')
            .update({ location })
            .eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Location updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateVehicleChildren = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { children } = req.body;
    try {
        const { error } = await supabase.from('vehicles')
            .update({ children })
            .eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Children count updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error: pError } = await supabase.from('passengers').delete()
            .eq('manifest_id', manifestId).eq('vehicle_id', id);
        if (pError) throw pError;

        const { error } = await supabase.from('vehicles').delete()
            .eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Vehicle deleted' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// --- Passengers ---
export const getPassengers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const vehicleId = req.query.vehicleId as string;
    const eventId = req.query.eventId as string;
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        if (!validEventId && !vehicleId) {
            return res.json([]);
        }

        let query = supabase.from('passengers').select('*').eq('manifest_id', manifestId); // Tenant Isolation
        if (vehicleId) {
            const idUuid = toUUID(vehicleId);
            if (idUuid) {
                query = query.eq('vehicle_id', idUuid);
            }
        }
        if (validEventId) {
            const uuid = toUUID(validEventId);
            if (uuid) {
                query = query.eq('event_id', uuid);
            }
        }
        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addPassenger = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = {
            ...req.body,
            manifest_id: manifestId, // INJECT TENANT ID
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            vehicle_id: toUUID(req.body.vehicle_id),
            event_id: toUUID(req.body.event_id),
            gender: req.body.gender || 'Male',
            is_first_time: req.body.is_first_time || req.body.isFirstTime || 'No',
            station_id: toUUID(req.body.station_id)
        };
        const { data, error } = await supabase.from('passengers').insert([payload]).select('*').maybeSingle();
        if (error) throw error;
        res.status(201).json({ message: 'Passenger added', passenger: data });
    } catch (error: any) {
        console.error('[addPassenger ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updatePassenger = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const payload = { ...req.body };
        const expectedVersion = payload.version;
        delete payload.version; // Prevent manually setting it

        const idUuid = toUUID(id);
        if (idUuid) {
            payload.id = idUuid;
        }
        if (payload.vehicle_id) {
            payload.vehicle_id = toUUID(payload.vehicle_id);
        }
        if (payload.event_id) {
            payload.event_id = toUUID(payload.event_id);
        }

        let query = supabase.from('passengers')
            .update(payload)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid);

        if (expectedVersion !== undefined) {
            query = query.eq('version', expectedVersion);
        }

        const { data, error } = await query.select('id').maybeSingle();
        if (error) throw error;

        // Optimistic Locking Conflict Check
        if (!data && expectedVersion !== undefined) {
            return res.status(409).json({ error: 'Conflict: This passenger has been modified by another coordinator. Please refresh.' });
        }

        res.json({ message: 'Passenger updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const checkinPassenger = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { isVerified, version } = req.body;

    try {
        const idUuid = toUUID(id);
        const { data: pRecord, error: pErr } = await supabase.from('passengers')
            .select('id').eq('manifest_id', manifestId).eq('id', idUuid).maybeSingle();
        if (pErr || !pRecord) return res.status(404).json({ error: 'Passenger not found' });

        // Direct Update Replacement for RPC
        let query = supabase.from('passengers')
            .update({ verified: isVerified })
            .eq('manifest_id', manifestId)
            .eq('id', idUuid);
            
        if (version !== undefined) {
            query = query.eq('version', version);
        }

        const { data, error } = await query.select('*').maybeSingle();

        if (!data && version !== undefined) {
            return res.status(409).json({ error: 'Conflict: Passenger state changed concurrently. Please refresh.' });
        }
        if (error) throw error;

        res.json({ message: 'Passenger checked in', passenger: data });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deletePassenger = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase.from('passengers').delete()
            .eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Passenger deleted' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getPassengerCounts = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const eventId = req.query.eventId as string;
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        if (!validEventId) {
            return res.json({});
        }

        const idUuid = toUUID(validEventId);

        const { data, error } = await supabase
            .from('passengers')
            .select('vehicle_id')
            .eq('manifest_id', manifestId)
            .eq('event_id', idUuid);

        if (error) throw error;

        const counts: Record<string, number> = {};
        if (data) {
            data.forEach(p => {
                if (p.vehicle_id) {
                    counts[p.vehicle_id] = (counts[p.vehicle_id] || 0) + 1;
                }
            });
        }
        res.json(counts);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// --- Personal Vehicles ---
export const getPersonalVehicles = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase.from('personal_vehicles')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('registered_date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addPersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = {
            ...req.body,
            manifest_id: manifestId, // INJECT TENANT ID
            registered_date: new Date().toISOString(),
            id: req.body.id ? toUUID(req.body.id) : uuidv4()
        };
        const { error } = await supabase.from('personal_vehicles').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Personal vehicle added' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updatePersonalVehicleStatus = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { status, serviceId } = req.body;
    try {
        const now = new Date().toISOString();
        const payload: any = { status };

        if (status === 'Checked In') {
            payload.check_in_time = now;
            payload.current_service_id = toUUID(serviceId);
        } else {
            payload.check_out_time = now;
        }

        const { error } = await supabase.from('personal_vehicles')
            .update(payload)
            .eq('manifest_id', manifestId).eq('id', toUUID(id));
        if (error) throw error;
        res.json({ message: 'Status updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
