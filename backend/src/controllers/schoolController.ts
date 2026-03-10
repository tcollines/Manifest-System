import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getSchoolReports = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { eventId } = req.query;
        let query = supabase
            .from('school_outreach_reports')
            .select('*')
            .eq('manifest_id', manifestId); // Tenant Isolation

        if (eventId) {
            query = query.eq('event_id', eventId);
        }

        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addSchoolReport = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { event_id, ...rest } = req.body;
        const payload = { ...rest, event_id, manifest_id: manifestId };
        const { data, error } = await supabase
            .from('school_outreach_reports')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
