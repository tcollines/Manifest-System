import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

const guard = (req: Request, res: Response): string | null => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    return manifestId;
};

// ─── Workplans ────────────────────────────────────────────────

export const getWorkplansByDepartment = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    try {
        const { data, error } = await supabase
            .from('monthly_workplans')
            .select('*, departments(name)')
            .eq('manifest_id', manifestId)
            .eq('department_id', departmentId)
            .order('month', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const createWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = (req as any).userId;
    const { departmentId, title, month, objectives, activities } = req.body;
    if (!departmentId || !title || !month) return res.status(400).json({ error: 'departmentId, title, month are required' });
    if (!Array.isArray(activities) || activities.length === 0) return res.status(400).json({ error: 'activities must be a non-empty array' });
    // Normalise month: input type="month" sends YYYY-MM — Supabase date column needs YYYY-MM-DD
    const monthDate = month.length === 7 ? `${month}-01` : month;
    try {
        const { data, error } = await supabase
            .from('monthly_workplans')
            .insert([{ id: uuidv4(), manifest_id: manifestId, department_id: departmentId, title, month: monthDate, objectives, activities, status: 'Draft', created_by: userId }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { console.error('[createWorkplan]', err); res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const updateWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;
    const { title, objectives, activities, status } = req.body;
    if (status && !['Draft', 'Submitted', 'Approved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const update: any = { updated_at: new Date().toISOString() };
        if (title     !== undefined) update.title      = title;
        if (objectives!== undefined) update.objectives = objectives;
        if (activities!== undefined) update.activities = activities;
        if (status    !== undefined) update.status     = status;
        const { data, error } = await supabase
            .from('monthly_workplans')
            .update(update)
            .eq('manifest_id', manifestId)
            .eq('id', workplanId)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const deleteWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;
    try {
        const { error } = await supabase
            .from('monthly_workplans')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('id', workplanId);
        if (error) throw error;
        res.json({ message: 'Workplan deleted' });
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};
