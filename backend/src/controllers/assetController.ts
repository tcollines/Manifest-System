import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllAssets = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAssetsByDepartment = async (req: Request, res: Response) => {
    const { departmentId } = req.params;
    try {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('department_id', departmentId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addAsset = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('assets')
            .insert([req.body])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAsset = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('assets')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteAsset = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Asset deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
