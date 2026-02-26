import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllAssets = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAssetsByDepartment = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { departmentId } = req.params;
    try {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('department_id', departmentId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addAsset = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body, manifest_id: manifestId };
        const { data, error } = await supabase
            .from('assets')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAsset = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('assets')
            .update(req.body)
            .eq('manifest_id', manifestId) // Tenant Isolation
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Asset deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
