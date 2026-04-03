import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllRequisitions = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('requisitions')
            .select(`*, requisition_items (*)`)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getRequisitionsByDepartment = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { deptId } = req.params;
    try {
        const { data, error } = await supabase
            .from('requisitions')
            .select(`*, requisition_items (*)`)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('department_id', deptId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const createRequisition = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { req: requisition, items } = req.body;
    try {
        const reqNumber = `REQ-${Date.now().toString().slice(-6)}`;

        const { data: reqData, error: reqError } = await supabase
            .from('requisitions')
            .insert([{
                manifest_id: manifestId, // INJECT TENANT ID
                title: requisition.title,
                department_id: requisition.departmentId,
                requester_id: requisition.requesterId,
                status: 'Pending',
                total_amount: requisition.totalAmount,
                notes: requisition.notes,
                requisition_number: reqNumber
            }])
            .select()
            .single();

        if (reqError) throw reqError;
        if (!reqData) throw new Error("Failed to create requisition record.");

        const itemsToInsert = items.map((item: any) => ({
            manifest_id: manifestId, // INJECT TENANT ID
            requisition_id: reqData.id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total_cost: item.totalCost
        }));

        const { error: itemsError } = await supabase.from('requisition_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        res.status(201).json({ message: 'Requisition created' });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateRequisition = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { req: requisition, items } = req.body;

    try {
        const { error: reqError } = await supabase
            .from('requisitions')
            .update({
                title: requisition.title,
                total_amount: requisition.totalAmount,
                notes: requisition.notes,
                status: 'Pending',
                rejection_reason: null,
                updated_at: new Date().toISOString()
            })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);

        if (reqError) throw reqError;

        const { error: deleteError } = await supabase.from('requisition_items').delete().eq('manifest_id', manifestId).eq('requisition_id', id);
        if (deleteError) throw deleteError;

        const itemsToInsert = items.map((item: any) => ({
            manifest_id: manifestId, // INJECT TENANT ID
            requisition_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total_cost: item.totalCost
        }));

        const { error: itemsError } = await supabase.from('requisition_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        res.json({ message: 'Requisition updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateStatus = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { status, reason } = req.body;

    try {
        const updateData: any = { status, updated_at: new Date().toISOString() };
        if (reason) updateData.rejection_reason = reason;

        const { error } = await supabase.from('requisitions').update(updateData).eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;

        res.json({ message: 'Status updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addPayment = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { payment, newTotalPaid, isFullPayment } = req.body;

    try {
        const { error: payError } = await supabase.from('requisition_payments').insert([{
            manifest_id: manifestId, // INJECT TENANT ID
            requisition_id: id,
            amount: payment.amount,
            method: payment.method,
            transaction_id: payment.transactionId,
            notes: payment.notes,
            recorded_by: payment.recordedBy
        }]);

        if (payError) throw payError;

        const updateData: any = {
            amount_paid: newTotalPaid,
            updated_at: new Date().toISOString()
        };

        if (isFullPayment) {
            updateData.status = 'Paid';
        }

        const { error: reqError } = await supabase.from('requisitions').update(updateData).eq('manifest_id', manifestId).eq('id', id);
        if (reqError) throw reqError;

        res.json({ message: 'Payment added' });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
