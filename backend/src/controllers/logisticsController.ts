import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getStations = async (req: Request, res: Response) => {
    const eventId = req.query.eventId as string;
    try {
        let query = supabase.from('pickup_stations').select('*');
        if (eventId) query = query.eq('event_id', eventId);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addStation = async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.from('pickup_stations').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Station added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateStation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('pickup_stations').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Station updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteStation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Get all vehicles in station
        const { data: vehicles } = await supabase.from('vehicles').select('id').eq('station_id', id);

        if (vehicles && vehicles.length > 0) {
            const vehicleIds = vehicles.map(v => v.id);

            // 2. Delete all passengers in these vehicles
            const { error: pError } = await supabase.from('passengers').delete().in('vehicle_id', vehicleIds);
            if (pError) throw pError;

            // 3. Delete the vehicles
            const { error: vError } = await supabase.from('vehicles').delete().in('id', vehicleIds);
            if (vError) throw vError;
        }

        // 4. Delete associated Data Entrants (Users)
        const { error: uError } = await supabase.from('users').delete().eq('station_id', id);
        if (uError) throw uError;

        // 5. Delete the station
        const { error } = await supabase.from('pickup_stations').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: 'Station and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
