import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getDepartments = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
