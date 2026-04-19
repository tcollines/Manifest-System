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
        res.status(500).json({ error: 'An internal server error occurred.' });
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

        // Unified Ledger Sync
        if (data && data.souls_won > 0) {
            const unifiedPayload = {
                id: data.id,
                manifest_id: manifestId,
                source_category: 'School Outreach',
                source_id: data.id,
                soul_count: data.souls_won,
                notes: data.notes || '',
                captured_by: data.submitted_by || ''
            };
            await supabase.from('unified_souls_won').insert([unifiedPayload]);
        }

        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
