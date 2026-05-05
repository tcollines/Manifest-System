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

    try {
        const { data: requisitions, error } = await supabase
            .from('requisitions')
            .select('total_amount, status')
            .eq('manifest_id', manifestId)
            .eq('department_id', deptId);

        if (error) throw error;

        let approved_budget = 0;
        let requested_budget = 0;
        let items_pending = 0;
        let items_rejected = 0;

        requisitions?.forEach((req: any) => {
            const amount = Number(req.total_amount) || 0;
            requested_budget += amount;

            if (req.status === 'APPROVED' || req.status === 'FINANCE_BATCH' || req.status === 'PAID') {
                approved_budget += amount;
            } else if (req.status === 'PENDING' || req.status === 'TL_APPROVAL' || req.status === 'ADMIN_REVIEW') {
                items_pending += 1;
            } else if (req.status === 'REJECTED') {
                items_rejected += 1;
            }
        });

        res.json({
            approved_budget,
            requested_budget,
            items_pending,
            items_rejected
        });
    } catch (error: any) {
        console.error('[ANALYTICS] getDepartmentAnalytics error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getFinanceAnalytics = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data: incomeData } = await supabase
            .from('finance_transactions')
            .select('amount')
            .eq('manifest_id', manifestId)
            .eq('type', 'Income');
            
        const totalIncome = incomeData?.reduce((acc: number, row: any) => acc + (Number(row.amount) || 0), 0) || 0;

        const { data: reqPayments } = await supabase
            .from('requisition_payments')
            .select('amount')
            .eq('manifest_id', manifestId);
            
        const reqExpenses = reqPayments?.reduce((acc: number, row: any) => acc + (Number(row.amount) || 0), 0) || 0;

        const { data: expensesData } = await supabase
            .from('finance_transactions')
            .select('amount')
            .eq('manifest_id', manifestId)
            .eq('type', 'Expense');
            
        const manualExpenses = expensesData?.reduce((acc: number, row: any) => acc + (Number(row.amount) || 0), 0) || 0;

        const totalExpenses = reqExpenses + manualExpenses;

        const { count: requisitionsPending } = await supabase
            .from('requisitions')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('status', 'PENDING');

        res.json({
            total_income: totalIncome,
            total_expenses: totalExpenses,
            requisitions_pending: requisitionsPending || 0
        });
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
