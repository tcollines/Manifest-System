import { DeptChurchMember, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

const mapChurchMember = (d: any): DeptChurchMember => ({
    id:           d.id,
    departmentId: d.department_id,
    memberId:     d.member_id,
    servingRole:  d.serving_role,
    joinedDate:   d.joined_date,
    createdAt:    d.created_at,
    // members join returns name + phone (not full_name / phone_number)
    memberName:   d.member_name ?? d.members?.name,
    phoneNumber:  d.phone_number ?? d.members?.phone,
    residence:    d.residence   ?? d.members?.residence,
    userId:       d.user_id,
    linkedUserName: d.users?.name,
    linkedUserEmail: d.users?.email,
    linkedUserStatus: d.users?.status,
});

export const DeptChurchMemberStore = {
    /** Fetch all church members serving in a department */
    getByDepartment: async (deptId: string): Promise<ServiceResponse<DeptChurchMember[]>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/church-members`),
            'Failed to fetch department members',
            (data) => (Array.isArray(data) ? data : []).map(mapChurchMember),
        ),

    /** Add a church member to a department */
    add: async (
        deptId: string,
        payload: { memberId: string; servingRole: string; joinedDate?: string; userId?: string },
    ): Promise<ServiceResponse<DeptChurchMember>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/church-members`, {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
            'Failed to add church member',
            mapChurchMember,
        ),

    /** Remove a church member from a department */
    remove: async (deptId: string, memberId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/church-members/${memberId}`, { method: 'DELETE' }),
            'Failed to remove member',
        ),

    /** Link a church member to a user account */
    linkToUser: async (deptId: string, memberId: string, userId: string | null): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/church-members/${memberId}/link`, {
                method: 'PATCH',
                body: JSON.stringify({ userId }),
            }),
            'Failed to link member',
        ),

    /** Search linkable user accounts */
    searchLinkableUsers: async (deptId: string, query: string): Promise<ServiceResponse<any[]>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/linkable-users?q=${encodeURIComponent(query)}`),
            'Failed to search users',
            (data) => Array.isArray(data) ? data : [],
        ),

    /** Get all schedules a member was assigned in — for serving consistency tracking */
    getServingHistory: async (memberId: string): Promise<ServiceResponse<any[]>> =>
        safeFetch(
            () => apiFetch(`/schedules/members/${memberId}/history`),
            'Failed to fetch serving history',
            (data) => Array.isArray(data) ? data : [],
        ),
};
