import { Request, Response } from 'express';
import { supabase } from '../supabase';

// --- Vehicles ---
export const getVehicles = async (req: Request, res: Response) => {
    const coordinator = req.query.coordinator as string;
    const eventId = req.query.eventId as string;
    // Treat 'undefined' or 'null' strings from frontend as falsey
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        // STRICT SCOPING RULE: Never return global list
        // Allow coordinator-specific fetch (e.g. "My Vehicle") OR event-specific fetch
        if (!validEventId && !coordinator) {
            console.warn('[BACKEND] Blocked global vehicle fetch attempt. Missing eventId.');
            return res.json([]);
        }

        let query = supabase.from('vehicles').select('*');
        if (coordinator) {
            query = query.eq('coordinator', coordinator);
        }
        if (validEventId) {
            console.log(`[BACKEND] Fetching vehicles for event: ${validEventId}`);
            // Get station IDs for this event first
            const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', validEventId);
            const stationIds = (stations || []).map(s => s.id);
            if (stationIds.length > 0) {
                query = query.in('station_id', stationIds);
            } else {
                return res.json([]); // No stations for this event, so no vehicles
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
        const { error } = await supabase.from('vehicles').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Vehicle added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('vehicles').update(req.body).eq('id', id);
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
            query = query.eq('vehicle_id', vehicleId);
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
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addPassenger = async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.from('passengers').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Passenger added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePassenger = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('passengers').update(req.body).eq('id', id);
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
            registered_date: new Date().toISOString()
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
            payload.current_service_id = serviceId;
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

