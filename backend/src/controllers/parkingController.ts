import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID } from '../utils/uuid';

export const getPersonalVehicles = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('personal_vehicles').select('*');
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

export const updatePersonalVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('personal_vehicles').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Personal vehicle updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const checkInPersonalVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { serviceId } = req.body;
    try {
        const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // 1. Fetch current vehicle history
        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles').select('attended_service_ids').eq('id', id).single();
        if (fetchError) throw fetchError;

        const currentHistory = vehicle.attended_service_ids || [];
        const newHistory = currentHistory.includes(serviceId) ? currentHistory : [...currentHistory, serviceId];

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked In',
            current_service_id: toUUID(serviceId),
            legacy_current_service_id: serviceId,
            check_in_time: checkInTime,
            check_out_time: null,
            attended_service_ids: newHistory
        }).or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`);

        if (updateError) throw updateError;

        // 2. Log attendance
        await supabase.from('vehicle_attendance').insert({
            vehicle_id: id,
            service_id: serviceId,
            check_in_time: new Date().toISOString()
        });

        res.json({ message: 'Vehicle checked in' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const checkOutPersonalVehicle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked Out',
            check_out_time: checkOutTime
        }).eq('id', id);

        if (updateError) throw updateError;

        await supabase
            .from('vehicle_attendance')
            .update({ check_out_time: new Date().toISOString() })
            .eq('vehicle_id', id)
            .is('check_out_time', null);

        res.json({ message: 'Vehicle checked out' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAttendanceCount = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    try {
        const { count, error } = await supabase
            .from('vehicle_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', serviceId);

        if (!error && count !== null) {
            return res.json({ count });
        }

        // Fallback
        const { count: arrayCount } = await supabase
            .from('personal_vehicles')
            .select('*', { count: 'exact', head: true })
            .contains('attended_service_ids', [serviceId]);

        res.json({ count: arrayCount || 0 });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
