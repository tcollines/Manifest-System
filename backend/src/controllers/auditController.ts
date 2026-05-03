import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getWorkplanItemAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;
        const manifestId = (req as any).manifestId;

        if (!manifestId) {
            res.status(404).json({ error: 'No active manifest found' });
            return;
        }

        const { data, error } = await supabase
            .from('workplan_item_logs')
            .select(`
                *,
                user:users(id, name, email, role)
            `)
            .eq('manifest_id', manifestId)
            .eq('item_id', itemId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ status: 'success', data });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getRequisitionAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, type } = req.query; // id is either requisition_id or batch_id
        const manifestId = (req as any).manifestId;

        if (!manifestId) {
            res.status(404).json({ error: 'No active manifest found' });
            return;
        }

        if (!id || !type) {
            res.status(400).json({ error: 'ID and type (requisition or batch) are required' });
            return;
        }

        const column = type === 'batch' ? 'batch_id' : 'requisition_id';

        const { data, error } = await supabase
            .from('requisition_logs')
            .select(`
                *,
                user:users(id, name, email, role)
            `)
            .eq('manifest_id', manifestId)
            .eq(column, id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ status: 'success', data });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
