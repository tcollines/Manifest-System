import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
