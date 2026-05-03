import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getWorkflowSummary = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { count: workplans_pending_admin } = await supabase
            .from('monthly_workplans')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('status', 'ADMIN_REVIEW');

        const { count: workplans_finalized } = await supabase
            .from('monthly_workplans')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('status', 'FINALIZED');

        const { count: requisitions_pending_admin } = await supabase
            .from('requisitions')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('status', 'PENDING');

        const { count: requisitions_awaiting_finance } = await supabase
            .from('requisitions')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .in('status', ['APPROVED', 'FINANCE_BATCH']);

        res.json({
            workplans_pending_admin: workplans_pending_admin || 0,
            workplans_finalized: workplans_finalized || 0,
            requisitions_pending_admin: requisitions_pending_admin || 0,
            requisitions_awaiting_finance: requisitions_awaiting_finance || 0
        });
    } catch (error: any) {
        console.error('[ANALYTICS] getWorkflowSummary error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getDepartmentAnalytics = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: deptId } = req.params;
    const { from, to } = req.query;

    try {
        const { data, error } = await supabase.rpc('analytics_department', {
            v_manifest_id: manifestId,
            v_dept_id: deptId,
            v_from: from || null,
            v_to: to || null
        });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('[ANALYTICS] getDepartmentAnalytics error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getFinanceAnalytics = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to } = req.query;

    try {
        const { data, error } = await supabase.rpc('analytics_finance', {
            v_manifest_id: manifestId,
            v_from: from || null,
            v_to: to || null
        });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('[ANALYTICS] getFinanceAnalytics error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getTeamLeaderAnalytics = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to } = req.query;

    try {
        const { data, error } = await supabase.rpc('analytics_team_leader', {
            v_manifest_id: manifestId,
            v_from: from || null,
            v_to: to || null
        });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('[ANALYTICS] getTeamLeaderAnalytics error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
