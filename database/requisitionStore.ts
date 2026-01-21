import { Requisition, RequisitionItem, RequisitionPayment } from '../types';
import { supabase } from '../services/supabaseClient';

export const RequisitionStore = {
    // Create a new requisition with items transactionally
    create: async (req: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdAt' | 'updatedAt'>, items: Omit<RequisitionItem, 'id' | 'requisitionId'>[]): Promise<void> => {
        try {
            // 1. Insert Requisition
            // We rely on DB to generate ID and Req Number ideally, or we generate UUID here.
            // Let's generate UUID here if possible or let Supabase return it.

            // Generate a temporary ID for linking items if not returning from single call immediately? 
            // Actually supabase insert returns data.

            // Generate Req Number manually for now or trigger? Let's assume trigger or simple random
            const reqNumber = `REQ-${Date.now().toString().slice(-6)}`;

            const { data: reqData, error: reqError } = await supabase
                .from('requisitions')
                .insert([{
                    title: req.title,
                    department_id: req.departmentId,
                    requester_id: req.requesterId,
                    status: 'Pending',
                    total_amount: req.totalAmount,
                    notes: req.notes,
                    requisition_number: reqNumber
                }])
                .select()
                .single();

            if (reqError) throw reqError;
            if (!reqData) throw new Error("Failed to create requisition record.");

            const newReqId = reqData.id;

            // 2. Insert Items
            const itemsToInsert = items.map(item => ({
                requisition_id: newReqId,
                description: item.description,
                quantity: item.quantity,
                unit_cost: item.unitCost,
                total_cost: item.totalCost
            }));

            const { error: itemsError } = await supabase
                .from('requisition_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

        } catch (error: any) {
            console.error("Requisition create error:", error);
            throw error;
        }
    },

    getAll: async (): Promise<Requisition[]> => {
        const { data, error } = await supabase
            .from('requisitions')
            .select(`
        *,
        requisition_items (*)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapRequisitionFromDB);
    },

    getByDepartment: async (deptId: string): Promise<Requisition[]> => {
        const { data, error } = await supabase
            .from('requisitions')
            .select(`
        *,
        requisition_items (*)
      `)
            .eq('department_id', deptId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapRequisitionFromDB);
    },

    update: async (id: string, req: Partial<Requisition>, items: Omit<RequisitionItem, 'id' | 'requisitionId'>[]): Promise<void> => {
        try {
            // 1. Update Requisition Details
            const { error: reqError } = await supabase
                .from('requisitions')
                .update({
                    title: req.title,
                    total_amount: req.totalAmount,
                    notes: req.notes,
                    status: 'Pending', // Reset to Pending on resubmit
                    rejection_reason: null, // Clear rejection reason
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (reqError) throw reqError;

            // 2. Delete existing items
            const { error: deleteError } = await supabase
                .from('requisition_items')
                .delete()
                .eq('requisition_id', id);

            if (deleteError) throw deleteError;

            // 3. Insert new items
            const itemsToInsert = items.map(item => ({
                requisition_id: id,
                description: item.description,
                quantity: item.quantity,
                unit_cost: item.unitCost,
                total_cost: item.totalCost
            }));

            const { error: itemsError } = await supabase
                .from('requisition_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

        } catch (error: any) {
            console.error("Requisition update error:", error);
            throw error;
        }
    },

    updateStatus: async (id: string, status: 'Approved' | 'Rejected' | 'Paid' | 'Pending Finance' | 'Pending Team Leader', reason?: string): Promise<void> => {
        const updateData: any = { status, updated_at: new Date().toISOString() };
        if (reason) updateData.rejection_reason = reason;

        const { error } = await supabase
            .from('requisitions')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
    },

    addPayment: async (reqId: string, payment: Omit<RequisitionPayment, 'id' | 'requisitionId'>, newTotalPaid: number, isFullPayment: boolean): Promise<void> => {
        try {
            // 1. Insert Payment Record
            const { error: payError } = await supabase
                .from('requisition_payments')
                .insert([{
                    requisition_id: reqId,
                    amount: payment.amount,
                    method: payment.method,
                    transaction_id: payment.transactionId,
                    notes: payment.notes,
                    recorded_by: payment.recordedBy
                }]);

            if (payError) throw payError;

            // 2. Update Requisition (Amount Paid & Status)
            const updateData: any = {
                amount_paid: newTotalPaid,
                updated_at: new Date().toISOString()
            };

            if (isFullPayment) {
                updateData.status = 'Paid';
            }

            const { error: reqError } = await supabase
                .from('requisitions')
                .update(updateData)
                .eq('id', reqId);

            if (reqError) throw reqError;

        } catch (error: any) {
            console.error("Add Payment Error:", error);
            throw error;
        }
    }
};

const mapRequisitionFromDB = (dbReq: any): Requisition => ({
    id: dbReq.id,
    requisitionNumber: dbReq.requisition_number,
    title: dbReq.title,
    departmentId: dbReq.department_id,
    requesterId: dbReq.requester_id,
    status: dbReq.status,
    totalAmount: dbReq.total_amount,
    amountPaid: dbReq.amount_paid || 0,
    payments: (dbReq.requisition_payments || []).map((p: any) => ({
        id: p.id,
        requisitionId: p.requisition_id,
        amount: p.amount,
        method: p.method,
        transactionId: p.transaction_id,
        paymentDate: p.payment_date,
        notes: p.notes
    })),
    notes: dbReq.notes,
    rejectionReason: dbReq.rejection_reason,
    createdAt: dbReq.created_at,
    updatedAt: dbReq.updated_at,
    items: (dbReq.requisition_items || []).map((item: any) => ({
        id: item.id,
        requisitionId: item.requisition_id,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        totalCost: item.total_cost
    }))
});
