import { Request, Response } from 'express';
import { supabase } from '../supabase';

// --- Vehicles ---
export const getVehicles = async (req: Request, res: Response) => {
    const coordinator = req.query.coordinator as string;
    try {
        let query = supabase.from('vehicles').select('*');
        if (coordinator) {
            query = query.eq('coordinator', coordinator);
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
    try {
        let query = supabase.from('passengers').select('*');
        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId);
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
