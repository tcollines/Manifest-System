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
        const inputId = req.body.id;
        // Check if input is ALREADY a UUID (from previous system or manual entry)
        const isUuid = inputId && /^[0-9a-f-]{36}$/i.test(inputId);
        const uuidVal = isUuid ? inputId : uuidv4();

        const payload = {
            ...req.body,
            // NEW SCHEMA: 'id' is UUID. 'legacy_id' is Text.
            id: uuidVal,
            legacy_id: inputId || null
            // Removed: id_uuid (Column renamed to id)
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
        const idUuid = toUUID(id);
        const { error } = await supabase.from('personal_vehicles')
            .update(req.body)
            // QUERY: 'id' is now UUID. 'legacy_id' (renamed from id) is Text.
            // We search against both to match the incoming ID param (which might be legacy).
            .or(`id.eq.${idUuid || '00000000-0000-0000-0000-000000000000'},id_text_legacy_deprecated.eq.${id}`);

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
        const idUuid = toUUID(id);

        // 1. Fetch current vehicle (Dual Lookup)
        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles')
            .select('id, attended_service_ids')
            .or(`id.eq.${idUuid || '00000000-0000-0000-0000-000000000000'},id_text_legacy_deprecated.eq.${id}`)
            .single();

        if (fetchError) throw fetchError;

        const currentHistory = vehicle.attended_service_ids || [];
        const newHistory = currentHistory.includes(serviceId) ? currentHistory : [...currentHistory, serviceId];

        const serviceUuid = toUUID(serviceId);

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked In',
            current_service_id: serviceId, // Legacy
            current_service_id_uuid: serviceUuid, // UUID
            check_in_time: checkInTime,
            check_out_time: null,
            attended_service_ids: newHistory
        }).eq('id', vehicle.id); // Use resolved UUID

        if (updateError) throw updateError;

        // 2. Log attendance (Native UUID FK)
        await supabase.from('vehicle_attendance').insert({
            vehicle_id: vehicle.id, // Now UUID
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
        const idUuid = toUUID(id);

        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles')
            .select('id')
            .or(`id.eq.${idUuid || '00000000-0000-0000-0000-000000000000'},id_text_legacy_deprecated.eq.${id}`)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked Out',
            check_out_time: checkOutTime
        }).eq('id', vehicle.id);

        if (updateError) throw updateError;

        await supabase
            .from('vehicle_attendance')
            .update({ check_out_time: new Date().toISOString() })
            .eq('vehicle_id', vehicle.id) // Now UUID
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
