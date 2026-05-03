import { Requisition, RequisitionItem, RequisitionPayment, ServiceResponse, RequisitionStatusType } from '../types';
import { apiFetch } from '../services/api';

export const mapRequisitionFromDB = (dbReq: any): Requisition => ({
    id: dbReq.id,
    requisitionNumber: dbReq.requisition_number,
    title: dbReq.title,
    departmentId: dbReq.department_id,
    requesterId: dbReq.requester_id,
    status: dbReq.status,
    totalAmount: dbReq.total_amount,
    amountPaid: dbReq.amount_paid || 0,
    type: dbReq.type,
    dateRequired: dbReq.date_required,
    workplanItemId: dbReq.workplan_item_id,
    batchId: dbReq.batch_id,
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
    // Only ADHOC generation relies on this method frontend-side now!
    create: async (req: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdAt' | 'updatedAt' | 'workplanItemId' | 'batchId'>, items: Omit<RequisitionItem, 'id' | 'requisitionId'>[]): Promise<ServiceResponse<any>> => {
        try {
            // Strict enforcement on Create
            if (req.type !== 'ADHOC') {
                throw new Error("System violation: Only ADHOC requisitions can be manually drafted.");
            }

            const data = await apiFetch('/requisitions', {
                method: 'POST',
                body: JSON.stringify({ req, items })
            });
            return { status: 'success', data };
        } catch (error: any) {
            console.error("Requisition create error:", error);
            return { status: 'error', message: error.message || 'Failed to create requisition' };
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

    getQueue: async (): Promise<any> => {
        try {
            const data = await apiFetch('/requisitions/queue');
            
            // Map the requisitions inside the buckets
            const mapReqs = (arr: any[]) => (arr || []).map(mapRequisitionFromDB);
            const mapBatches = (arr: any[]) => (arr || []).map((dbBatch: any) => ({
                id: dbBatch.id,
                batchNumber: dbBatch.batch_number,
                status: dbBatch.status,
                createdAt: dbBatch.created_at,
                requisitions: (dbBatch.requisitions || []).map(mapRequisitionFromDB)
            }));
            
            return {
                finance: {
                    unbatched: mapReqs(data.finance?.unbatched),
                    batched_pending_tl: mapBatches(data.finance?.batched_pending_tl),
                    approved_pending_payment: mapBatches(data.finance?.approved_pending_payment),
                    history: mapReqs(data.finance?.history)
                },
                tl: {
                    pending_approval: mapBatches(data.tl?.pending_approval)
                },
                admin: {
                    pending_review: mapReqs(data.admin?.pending_review)
                }
            };
        } catch (error: any) {
            console.error("Requisition getQueue error:", error);
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

    updateStatus: async (id: string, status: RequisitionStatusType, reason?: string): Promise<void> => {
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
    },

    createBatch: async (requisitionIds: string[]): Promise<ServiceResponse<{ message: string, batchId: string }>> => {
        try {
            const data = await apiFetch('/requisitions/batch', {
                method: 'POST',
                body: JSON.stringify({ requisitionIds })
            });
            return { status: 'success', data };
        } catch (error: any) {
            return { status: 'error', message: error.message || 'Failed to create batch' };
        }
    },

    getBatches: async () => {
        try {
            const data = await apiFetch('/requisitions/batches');
            return (data || []).map((dbBatch: any) => ({
                id: dbBatch.id,
                batchNumber: dbBatch.batch_number,
                status: dbBatch.status,
                createdAt: dbBatch.created_at,
                // Nested requisitions
                requisitions: (dbBatch.requisitions || []).map((r: any) => mapRequisitionFromDB(r))
            }));
        } catch (error: any) {
            console.error("getBatches error:", error);
            throw error;
        }
    },

    updateBatchStatus: async (batchId: string, status: RequisitionStatusType, reason?: string): Promise<void> => {
        try {
            await apiFetch(`/requisitions/batches/${batchId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status, reason })
            });
        } catch (e: any) {
            throw e;
        }
    }
};
