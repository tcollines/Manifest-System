import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getChildren = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('children').select('*');
        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }
        console.log('Fetched Children:', data?.length);
        res.json(data);
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const addChild = async (req: Request, res: Response) => {
    try {
        console.log('[ADD CHILD] Payload:', JSON.stringify(req.body));
        const { error } = await supabase.from('children').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Child added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkAddChildren = async (req: Request, res: Response) => {
    try {
        const { children } = req.body;
        const { error } = await supabase.from('children').insert(children);
        if (error) throw error;
        res.status(201).json({ message: 'Children added in bulk' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateChild = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('children').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Child updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteChild = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('children').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Child deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkDeleteChildren = async (req: Request, res: Response) => {
    const { ids } = req.body;
    try {
        const { error } = await supabase.from('children').delete().in('id', ids);
        if (error) throw error;
        res.json({ message: 'Children deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getChildAttendance = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    try {
        const { count, error } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true })
            .contains('attended_service_ids', [serviceId]);

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
