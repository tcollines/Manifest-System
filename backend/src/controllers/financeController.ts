import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addTransaction = async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.from('transactions').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Transaction added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getRequests = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('department_requests').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { error } = await supabase.from('department_requests').update({ status }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Request updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
