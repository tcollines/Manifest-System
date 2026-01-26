import { Request, Response } from 'express';
import { supabase } from '../supabase';

// --- General Souls ---
export const getSouls = async (req: Request, res: Response) => {
    const { sourceId } = req.query;
    try {
        let query = supabase.from('souls').select('*').order('created_at', { ascending: false });
        if (sourceId) {
            query = query.eq('source_id', sourceId);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addSoul = async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.from('souls').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Soul added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSoul = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('souls').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Soul updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSoul = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('souls').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Soul deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSoulServiceStats = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    try {
        const { count: mainCount, error } = await supabase
            .from('souls')
            .select('*', { count: 'exact', head: true })
            .eq('source_type', 'Service')
            .eq('source_id', serviceId);

        if (error) throw error;

        // Count Next Gen Souls as well
        const { count: nextGenCount, error: ngError } = await supabase
            .from('next_gen_souls')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', serviceId);

        if (ngError) throw ngError;

        res.json({ count: (mainCount || 0) + (nextGenCount || 0) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// --- Next Gen Souls ---
export const getNextGenSouls = async (req: Request, res: Response) => {
    const { serviceId } = req.query;
    try {
        let query = supabase.from('next_gen_souls').select('*').order('created_at', { ascending: false });
        if (serviceId) {
            query = query.eq('service_id', serviceId);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addNextGenSoul = async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.from('next_gen_souls').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'NextGen Soul added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteNextGenSoul = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('next_gen_souls').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'NextGen Soul deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getNextGenSoulCount = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    try {
        const { count, error } = await supabase
            .from('next_gen_souls')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', serviceId);
        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
