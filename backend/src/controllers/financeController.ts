import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getFinanceSummary = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const eventId = req.query.eventId as string;

        // Uses the newly created PostgreSQL RPC function for O(1) row aggregation
        const { data, error } = await supabase.rpc('get_finance_event_summary', {
            p_manifest_id: manifestId,
            p_event_id: (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null
        });

        if (error) throw error;

        // The RPC returns a single row with the aggregates
        res.json(data[0] || { total_income: 0, total_expense: 0, net_balance: 0, transaction_count: 0 });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const page = Number(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const eventId = req.query.eventId as string;

        let query = supabase.from('transactions')
            .select('*')
            .eq('manifest_id', manifestId); // Tenant Isolation

        if (eventId && eventId !== 'undefined' && eventId !== 'null') {
            query = query.eq('event_id', eventId);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addTransaction = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body, manifest_id: manifestId };
        const { error } = await supabase.from('transactions').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Transaction added' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getRequests = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const page = Number(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const eventId = req.query.eventId as string;

        let query = supabase.from('department_requests')
            .select('*')
            .eq('manifest_id', manifestId); // Tenant Isolation

        if (eventId && eventId !== 'undefined' && eventId !== 'null') {
            query = query.eq('event_id', eventId);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateRequest = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { status } = req.body;
    try {
        const { error } = await supabase.from('department_requests')
            .update({ status })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Request updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
