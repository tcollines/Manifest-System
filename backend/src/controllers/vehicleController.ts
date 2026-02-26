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

        if (coordinatorUid) {
            query = query.eq('coordinator_uid', coordinatorUid);
        } else if (coordinator) {
            query = query.eq('coordinator', coordinator);
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
        res.status(500).json({ error: error.message });
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
            event_id: toUUID(event_id)
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
                    role: 'Coordinator',
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

        const payload = { ...req.body };
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

        const { error } = await supabase.from('vehicles')
            .update(payload)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid);
        if (error) throw error;
        res.json({ message: 'Vehicle updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVehicleStage = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { stage, approvals } = req.body;
    try {
        const { error } = await supabase.from('vehicles')
            .update({ current_stage: stage, approvals: approvals })
            .eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Vehicle stage updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        const { error } = await supabase.from('passengers').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Passenger added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message, details: error.details });
    }
};

export const updatePassenger = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const payload = { ...req.body };
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

        const { error } = await supabase.from('passengers')
            .update(payload)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid);
        if (error) throw error;
        res.json({ message: 'Passenger updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
};
