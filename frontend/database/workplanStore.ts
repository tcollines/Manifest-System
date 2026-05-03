import { MonthlyWorkplan, WorkplanItem, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

const mapWorkplanItem = (i: any): WorkplanItem => ({
    id: i.id,
    workplanId: i.workplan_id,
    activity: i.activity,
    item: i.item,
    objective: i.objective,
    dateNeeded: i.date_needed,
    duration: i.duration,
    unitCost: i.unit_cost,
    deptContribution: i.dept_contribution,
    quantity: i.quantity,
    amount: i.amount,
    status: i.status,
    adminComment: i.admin_comment,
    tlComment: i.tl_comment,
    approvedQuantity: i.approved_quantity,
    approvedAmount: i.approved_amount,
    createdAt: i.created_at,
    updatedAt: i.updated_at
});

const mapWorkplan = (d: any): MonthlyWorkplan => ({
    id:             d.id,
    manifestId:     d.manifest_id,
    departmentId:   d.department_id,
    title:          d.title,
    month:          d.month,
    objectives:     d.objectives,
    status:         d.status,
    isLocked:       d.is_locked,
    createdBy:      d.created_by,
    createdAt:      d.created_at,
    updatedAt:      d.updated_at,
    departmentName: d.departments?.name || d.department_name || 'Unknown Department',
    items:          d.workplan_items ? d.workplan_items.map(mapWorkplanItem) : []
});

export const WorkplanStore = {
    /** Fetch all workplans for a department */
    getByDepartment: async (deptId: string): Promise<ServiceResponse<MonthlyWorkplan[]>> =>
        safeFetch(
            () => apiFetch(`/workplans/department/${deptId}`),
            'Failed to fetch workplans',
            (data) => (Array.isArray(data) ? data : []).map(mapWorkplan),
        ),

    /** Generate Global Draft Workplans for all active departments */
    generateGlobalWorkplans: async (payload: { title: string; month: string; objectives?: string }): Promise<ServiceResponse<any>> =>
        safeFetch(
            () => apiFetch('/workplans/global-generate', { method: 'POST', body: JSON.stringify(payload) }),
            'Failed to generate global workplans'
        ),

    /** Populate an existing Draft Workplan with items */
    populateDraft: async (workplanId: string, activities: any[]): Promise<ServiceResponse<any>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}/populate`, { method: 'POST', body: JSON.stringify({ activities }) }),
            'Failed to populate workplan items'
        ),

    /** Delete a draft workplan */
    deleteWorkplan: async (workplanId: string): Promise<ServiceResponse<any>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}`, { method: 'DELETE' }),
            'Failed to delete workplan'
        ),

    /** Submit a workplan (Draft → Submitted or TL_Review) */
    submit: async (workplanId: string): Promise<ServiceResponse<MonthlyWorkplan>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}/submit`, { method: 'PATCH' }),
            'Failed to submit workplan',
            mapWorkplan
        ),

    /** Finalize a workplan (TL_Review → Finalized) */
    finalize: async (workplanId: string): Promise<ServiceResponse<MonthlyWorkplan>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}/finalize`, { method: 'PATCH' }),
            'Failed to finalize workplan',
            mapWorkplan
        ),

    /** Process Admin Item Decision */
    processAdminDecision: async (
        workplanId: string, 
        itemId: string, 
        decision: 'ADMIN_APPROVED' | 'ADMIN_REJECTED', 
        comment?: string
    ): Promise<ServiceResponse<WorkplanItem>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}/items/${itemId}/admin`, { 
                method: 'PATCH', 
                body: JSON.stringify({ workplanId, decision, comment }) 
            }),
            'Failed to process admin decision',
            mapWorkplanItem
        ),

    /** Process TL Item Decision */
    processTLDecision: async (
        workplanId: string, 
        itemId: string, 
        decision: 'TL_APPROVED' | 'TL_ADJUSTED' | 'TL_REJECTED', 
        comment?: string,
        payload?: any
    ): Promise<ServiceResponse<WorkplanItem>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}/items/${itemId}/tl`, { 
                method: 'PATCH', 
                body: JSON.stringify({ workplanId, decision, comment, ...payload }) 
            }),
            'Failed to process TL decision',
            mapWorkplanItem
        ),

    /** HOD Edits a strictly rejected item before Resubmission */
    editRejectedItem: async (
        workplanId: string,
        itemId: string,
        payload: Partial<WorkplanItem>
    ): Promise<ServiceResponse<WorkplanItem>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}/items/${itemId}/edit`, {
                 method: 'PATCH',
                 body: JSON.stringify(payload)
            }),
            'Failed to edit rejected item',
            mapWorkplanItem
        ),

    /** HOD Bumps a document back up to Admin/TL after edits */
    resubmitWorkplan: async (workplanId: string): Promise<ServiceResponse<MonthlyWorkplan>> =>
         safeFetch(
             () => apiFetch(`/workplans/${workplanId}/resubmit`, { method: 'POST' }),
             'Failed to resubmit workplan',
             mapWorkplan
         ),

    /** Complete Admin Review */
    completeAdminReview: async (workplanId: string): Promise<ServiceResponse<MonthlyWorkplan>> =>
         safeFetch(
             () => apiFetch(`/workplans/${workplanId}/admin/complete`, { method: 'PATCH' }),
             'Failed to complete review',
             mapWorkplan
         ),

    /** Add Ad-hoc Item by Admin or TL */
    addAdHocItem: async (workplanId: string, payload: any): Promise<ServiceResponse<WorkplanItem>> =>
         safeFetch(
             () => apiFetch(`/workplans/${workplanId}/items/add`, { method: 'POST', body: JSON.stringify(payload) }),
             'Failed to add item',
             mapWorkplanItem
         ),

    /** Delete a workplan (Must be draft) */
    delete: async (workplanId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}`, { method: 'DELETE' }),
            'Failed to delete workplan',
        ),

    /** Fetch all active workplans across tenants bypassing department filters (Admins/TL only) */
    getAllGlobal: async (): Promise<ServiceResponse<MonthlyWorkplan[]>> =>
        safeFetch(
            // NOTE: Must implement this endpoint returning `ADMIN_REVIEW | TL_REVIEW` payloads
            () => apiFetch(`/workplans/global-queue`),
            'Failed to query Global Approvals',
            (data) => (Array.isArray(data) ? data : []).map(mapWorkplan),
        ),
};
