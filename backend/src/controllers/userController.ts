import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllUsers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const role = req.query.role as string;
    const eventId = req.query.eventId as string;
    const departmentId = req.query.departmentId as string;
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        if (role === 'Coordinator' && !validEventId) {
            console.warn('[BACKEND] Blocked global coordinator fetch attempt. Missing eventId.');
            return res.json([]);
        }

        let query = supabase.from('users').select('*').eq('manifest_id', manifestId); // Tenant Isolation
        if (role) query = query.eq('role', role);
        if (validEventId) query = query.eq('event_id', validEventId);
        if (departmentId) query = query.eq('department_id', departmentId);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    const user = (req as any).user;

    if (!manifestId || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .eq('manifest_id', manifestId)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


export const createUser = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = {
            ...req.body,
            manifest_id: manifestId, // INJECT TENANT ID
            department_id: req.body.departmentId || req.body.department_id || null,
            station_id: req.body.stationId || req.body.station_id || null,
            event_id: req.body.eventId || req.body.event_id || null,
        };
        delete payload.departmentId;
        delete payload.stationId;
        delete payload.eventId;

        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'User created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const payload = {
            ...req.body,
            department_id: req.body.departmentId || req.body.department_id || null,
            station_id: req.body.stationId || req.body.station_id || null,
            event_id: req.body.eventId || req.body.event_id || null,
        };
        delete payload.departmentId;
        delete payload.stationId;
        delete payload.eventId;

        const { error } = await supabase.from('users').update(payload).eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'User updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase.from('users').delete().eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'User deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
