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
        res.status(500).json({ error: error.message });
    }
};

export const addPersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const inputId = req.body.id;
        const isUuid = inputId && /^[0-9a-f-]{36}$/i.test(inputId);
        const uuidVal = isUuid ? inputId : uuidv4();

        const payload = {
            ...req.body,
            manifest_id: manifestId, // INJECT TENANT ID
            id: uuidVal,
            legacy_id: inputId || null
        };
        const { error } = await supabase.from('personal_vehicles').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Personal vehicle added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
            .or(`id.eq.${idUuid || '00000000-0000-0000-0000-000000000000'},id_text_legacy_deprecated.eq.${id}`);

        if (error) throw error;
        res.json({ message: 'Personal vehicle updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const checkInPersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { serviceId } = req.body;
    try {
        const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const idUuid = toUUID(id);

        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles')
            .select('id, attended_service_ids')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${idUuid || '00000000-0000-0000-0000-000000000000'},id_text_legacy_deprecated.eq.${id}`)
            .single();

        if (fetchError) throw fetchError;

        const currentHistory = vehicle.attended_service_ids || [];
        const newHistory = currentHistory.includes(serviceId) ? currentHistory : [...currentHistory, serviceId];

        const serviceUuid = toUUID(serviceId);

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked In',
            current_service_id: serviceId,
            current_service_id_uuid: serviceUuid,
            check_in_time: checkInTime,
            check_out_time: null,
            attended_service_ids: newHistory
        }).eq('manifest_id', manifestId).eq('id', vehicle.id);

        if (updateError) throw updateError;

        await supabase.from('vehicle_attendance').insert({
            manifest_id: manifestId, // INJECT TENANT ID
            vehicle_id: vehicle.id,
            service_id: serviceId,
            check_in_time: new Date().toISOString()
        });

        res.json({ message: 'Vehicle checked in' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const checkOutPersonalVehicle = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const idUuid = toUUID(id);

        const { data: vehicle, error: fetchError } = await supabase.from('personal_vehicles')
            .select('id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${idUuid || '00000000-0000-0000-0000-000000000000'},id_text_legacy_deprecated.eq.${id}`)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase.from('personal_vehicles').update({
            status: 'Checked Out',
            check_out_time: checkOutTime
        }).eq('manifest_id', manifestId).eq('id', vehicle.id);

        if (updateError) throw updateError;

        await supabase
            .from('vehicle_attendance')
            .update({ check_out_time: new Date().toISOString() })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('vehicle_id', vehicle.id)
            .is('check_out_time', null);

        res.json({ message: 'Vehicle checked out' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
};
