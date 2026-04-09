import { MonthlyWorkplan, WorkplanActivity, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

const mapWorkplan = (d: any): MonthlyWorkplan => ({
    id:             d.id,
    manifestId:     d.manifest_id,
    departmentId:   d.department_id,
    title:          d.title,
    month:          d.month,
    objectives:     d.objectives,
    activities:     (d.activities ?? []) as WorkplanActivity[],
    status:         d.status,
    createdBy:      d.created_by,
    createdAt:      d.created_at,
    updatedAt:      d.updated_at,
    departmentName: d.department_name,
});

export const WorkplanStore = {
    /** Fetch all workplans for a department */
    getByDepartment: async (deptId: string): Promise<ServiceResponse<MonthlyWorkplan[]>> =>
        safeFetch(
            () => apiFetch(`/workplans/department/${deptId}`),
            'Failed to fetch workplans',
            (data) => (Array.isArray(data) ? data : []).map(mapWorkplan),
        ),

    /** Create a new workplan */
    create: async (payload: {
        departmentId: string;
        title: string;
        month: string;
        objectives?: string;
        activities: WorkplanActivity[];
    }): Promise<ServiceResponse<MonthlyWorkplan>> =>
        safeFetch(
            () => apiFetch('/workplans', { method: 'POST', body: JSON.stringify(payload) }),
            'Failed to create workplan',
            mapWorkplan,
        ),

    /** Update a workplan (title, objectives, activities, status) */
    update: async (
        workplanId: string,
        payload: Partial<{
            title: string;
            objectives: string;
            activities: WorkplanActivity[];
            status: 'Draft' | 'Submitted' | 'Approved';
        }>,
    ): Promise<ServiceResponse<MonthlyWorkplan>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
            'Failed to update workplan',
            mapWorkplan,
        ),

    /** Submit a workplan (Draft → Submitted) */
    submit: async (workplanId: string): Promise<ServiceResponse<MonthlyWorkplan>> =>
        WorkplanStore.update(workplanId, { status: 'Submitted' }),

    /** Approve a workplan (Submitted → Approved) — Admin/TeamLeader only */
    approve: async (workplanId: string): Promise<ServiceResponse<MonthlyWorkplan>> =>
        WorkplanStore.update(workplanId, { status: 'Approved' }),

    /** Delete a workplan */
    delete: async (workplanId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/workplans/${workplanId}`, { method: 'DELETE' }),
            'Failed to delete workplan',
        ),
};
