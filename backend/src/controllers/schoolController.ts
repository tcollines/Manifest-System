import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getSchoolReports = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('school_outreach_reports')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addSchoolReport = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('school_outreach_reports')
            .insert([req.body])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
