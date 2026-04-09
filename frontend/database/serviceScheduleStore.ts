import { ServiceSchedule, ScheduleSession, ScheduleAssignment, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

const mapAssignment = (d: any): ScheduleAssignment => ({
    id:           d.id,
    sessionId:    d.session_id,
    roleLabel:    d.role_label,
    ministerName: d.minister_name,
    memberId:     d.member_id,
    sequence:     d.sequence ?? 0,
    createdAt:    d.created_at,
});

const mapSession = (d: any): ScheduleSession => ({
    id:           d.id,
    scheduleId:   d.schedule_id,
    sessionLabel: d.session_label,
    sessionDate:  d.session_date,
    arrivalTime:  d.arrival_time,
    sequence:     d.sequence ?? 0,
    notes:        d.notes,
    createdAt:    d.created_at,
    assignments:  (d.schedule_assignments ?? d.assignments ?? []).map(mapAssignment),
});

const mapSchedule = (d: any): ServiceSchedule => ({
    id:           d.id,
    manifestId:   d.manifest_id,
    departmentId: d.department_id,
    title:        d.title,
    weekStart:    d.week_start,
    status:       d.status,
    notes:        d.notes,
    createdBy:    d.created_by,
    createdAt:    d.created_at,
    updatedAt:    d.updated_at,
    sessions:     (d.schedule_sessions ?? d.sessions ?? []).map(mapSession),
});

export const ServiceScheduleStore = {
    /** Fetch all schedules across all departments (Administration) */
    getAll: async (): Promise<ServiceResponse<ServiceSchedule[]>> =>
        safeFetch(
            () => apiFetch(`/schedules`),
            'Failed to fetch all schedules',
            (data) => (Array.isArray(data) ? data : []).map(d => ({
                ...mapSchedule(d),
                departmentName: d.departments?.name, // Add department name since it returned from the join we added in the backend
            })),
        ),

    /** Fetch all schedules for a department (includes sessions + assignments) */
    getByDepartment: async (deptId: string): Promise<ServiceResponse<ServiceSchedule[]>> =>
        safeFetch(
            () => apiFetch(`/schedules/department/${deptId}`),
            'Failed to fetch schedules',
            (data) => (Array.isArray(data) ? data : []).map(mapSchedule),
        ),

    /** Create a new schedule */
    create: async (payload: {
        departmentId: string;
        title: string;
        weekStart: string;
        notes?: string;
    }): Promise<ServiceResponse<ServiceSchedule>> =>
        safeFetch(
            () => apiFetch('/schedules', { method: 'POST', body: JSON.stringify(payload) }),
            'Failed to create schedule',
            mapSchedule,
        ),

    /** Update schedule (title, weekStart, notes, or status) */
    update: async (
        scheduleId: string,
        payload: Partial<{ title: string; weekStart: string; notes: string; status: 'Draft' | 'Published' }>,
    ): Promise<ServiceResponse<ServiceSchedule>> => {
        const body: any = { ...payload };
        if (body.weekStart) { body.week_start = body.weekStart; delete body.weekStart; }
        return safeFetch(
            () => apiFetch(`/schedules/${scheduleId}`, { method: 'PATCH', body: JSON.stringify(body) }),
            'Failed to update schedule',
            mapSchedule,
        );
    },

    /** Delete a schedule */
    delete: async (scheduleId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/schedules/${scheduleId}`, { method: 'DELETE' }),
            'Failed to delete schedule',
        ),

    // ── Sessions ────────────────────────────────────────────────────────────

    addSession: async (
        scheduleId: string,
        payload: { sessionLabel: string; sessionDate: string; arrivalTime: string; notes?: string },
    ): Promise<ServiceResponse<ScheduleSession>> =>
        safeFetch(
            () => apiFetch(`/schedules/${scheduleId}/sessions`, { method: 'POST', body: JSON.stringify(payload) }),
            'Failed to add session',
            mapSession,
        ),

    updateSession: async (
        scheduleId: string,
        sessionId: string,
        payload: Partial<{ sessionLabel: string; sessionDate: string; arrivalTime: string; notes: string }>,
    ): Promise<ServiceResponse<ScheduleSession>> =>
        safeFetch(
            () => apiFetch(`/schedules/${scheduleId}/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
            'Failed to update session',
            mapSession,
        ),

    deleteSession: async (scheduleId: string, sessionId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/schedules/${scheduleId}/sessions/${sessionId}`, { method: 'DELETE' }),
            'Failed to delete session',
        ),

    // ── Assignments ─────────────────────────────────────────────────────────

    addAssignment: async (
        sessionId: string,
        payload: { roleLabel: string; ministerName: string; memberId?: string },
    ): Promise<ServiceResponse<ScheduleAssignment>> =>
        safeFetch(
            () => apiFetch(`/schedules/sessions/${sessionId}/assignments`, { method: 'POST', body: JSON.stringify(payload) }),
            'Failed to add assignment',
            mapAssignment,
        ),

    deleteAssignment: async (sessionId: string, assignmentId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/schedules/sessions/${sessionId}/assignments/${assignmentId}`, { method: 'DELETE' }),
            'Failed to delete assignment',
        ),
};
