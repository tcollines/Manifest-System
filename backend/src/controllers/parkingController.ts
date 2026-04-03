import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID } from '../utils/uuid';

export const getPersonalVehicles = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase.from('personal_vehicles').select('*').eq('manifest_id', manifestId); // Tenant Isolation
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
        const inputId = req.body.id;
        const uuidVal = inputId || uuidv4();

        const payload = {
            manifest_id: manifestId,
            id: uuidVal,
            number_plate: req.body.number_plate,
            driver_name: req.body.driverName || req.body.driver_name,
            driver_contact: req.body.driverContact || req.body.driver_contact || '',
            status: req.body.status || 'Absent',
            check_in_time: req.body.checkInTime || req.body.check_in_time || null,
            check_out_time: req.body.checkOutTime || req.body.check_out_time || null,
            current_service_id: req.body.currentServiceId || req.body.current_service_id || null,
            registered_date: req.body.registeredDate || req.body.registered_date || new Date().toISOString(),
            attended_service_ids: req.body.attended_service_ids || req.body.attendedServiceIds || []
        };

        const { error } = await supabase.from('personal_vehicles').insert([payload]);
        if (error) {
            console.error("DEBUG: Minimal Insert Error:", JSON.stringify(error, null, 2));
            throw error;
        }
        res.status(201).json({ message: 'Personal vehicle added' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updatePersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const idUuid = toUUID(id);
        const { error } = await supabase.from('personal_vehicles')
            .update(req.body)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', toUUID(id));

        if (error) throw error;
        res.json({ message: 'Personal vehicle updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const checkInPersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { serviceId } = req.body;
    try {
        const checkInTime = new Date().toISOString();
        const idUuid = toUUID(id);

        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles')
            .select('id, attended_service_ids')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid)
            .single();

        if (fetchError) throw fetchError;

        const currentHistory = vehicle.attended_service_ids || [];
        const newHistory = currentHistory.includes(serviceId) ? currentHistory : [...currentHistory, serviceId];

        const serviceUuid = toUUID(serviceId);

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked In',
            current_service_id: serviceId,
            check_in_time: checkInTime,
            check_out_time: null,
            attended_service_ids: newHistory
        }).eq('manifest_id', manifestId).eq('id', vehicle.id);

        if (updateError) throw updateError;

        res.json({ message: 'Vehicle checked in' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const checkOutPersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const checkOutTime = new Date().toISOString();
        const idUuid = toUUID(id);

        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles')
            .select('id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', idUuid)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked Out',
            check_out_time: checkOutTime
        }).eq('manifest_id', manifestId).eq('id', vehicle.id);

        if (updateError) throw updateError;

        res.json({ message: 'Vehicle checked out' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getAttendanceCount = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    try {
        const { count, error } = await supabase
            .from('vehicle_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('service_id', serviceId);

        if (!error && count !== null) {
            return res.json({ count });
        }

        const { count: arrayCount } = await supabase
            .from('personal_vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .contains('attended_service_ids', [serviceId]);

        res.json({ count: arrayCount || 0 });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
