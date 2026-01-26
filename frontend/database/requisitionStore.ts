import { Requisition, RequisitionItem, RequisitionPayment } from '../types';
import { apiFetch } from '../services/api';

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

export const RequisitionStore = {
    create: async (req: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdAt' | 'updatedAt'>, items: Omit<RequisitionItem, 'id' | 'requisitionId'>[]): Promise<void> => {
        try {
            await apiFetch('/requisitions', {
                method: 'POST',
                body: JSON.stringify({ req, items })
            });
        } catch (error: any) {
            console.error("Requisition create error:", error);
            throw error;
        }
    },

    getAll: async (): Promise<Requisition[]> => {
        try {
            const data = await apiFetch('/requisitions');
            return (data || []).map(mapRequisitionFromDB);
        } catch (error: any) {
            console.error("Requisition getAll error:", error);
            throw error;
        }
    },

    getByDepartment: async (deptId: string): Promise<Requisition[]> => {
        try {
            const data = await apiFetch(`/requisitions/department/${deptId}`);
            return (data || []).map(mapRequisitionFromDB);
        } catch (error: any) {
            console.error("Requisition getByDepartment error:", error);
            throw error;
        }
    },

    update: async (id: string, req: Partial<Requisition>, items: Omit<RequisitionItem, 'id' | 'requisitionId'>[]): Promise<void> => {
        try {
            await apiFetch(`/requisitions/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ req, items })
            });
        } catch (error: any) {
            console.error("Requisition update error:", error);
            throw error;
        }
    },

    updateStatus: async (id: string, status: 'Approved' | 'Rejected' | 'Paid' | 'Pending Finance' | 'Pending Team Leader', reason?: string): Promise<void> => {
        try {
            await apiFetch(`/requisitions/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status, reason })
            });
        } catch (e: any) {
            throw e;
        }
    },

    addPayment: async (reqId: string, payment: Omit<RequisitionPayment, 'id' | 'requisitionId'>, newTotalPaid: number, isFullPayment: boolean): Promise<void> => {
        try {
            await apiFetch(`/requisitions/${reqId}/payment`, {
                method: 'POST',
                body: JSON.stringify({ payment, newTotalPaid, isFullPayment })
            });
        } catch (error: any) {
            console.error("Add Payment Error:", error);
            throw error;
        }
    }
};
