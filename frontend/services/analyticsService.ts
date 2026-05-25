import { supabase } from './supabaseClient';
import { apiFetch } from './api';
import { useQuery } from '@tanstack/react-query';

export const analyticsService = {
    fetchAttendanceAnalytics: async () => {
        try {
            const data = await apiFetch('/analytics/attendance');
            return data || [];
        } catch (error) {
            console.error('Error fetching attendance analytics:', error);
            return [];
        }
    },

    fetchSoulWinningAnalytics: async () => {
        try {
            const data = await apiFetch('/analytics/souls');
            return data || [];
        } catch (error) {
            console.error('Error fetching soul winning analytics:', error);
            return []; // No fake data mask
        }
    },

    fetchDashboardKPIs: async () => {
        try {
            const data = await apiFetch('/analytics/dashboard');
            return data;
        } catch (error) {
            console.error('Error fetching dashboard kpis:', error);
            return null;
        }
    },

    fetchFollowUpAnalysis: async () => {
        try {
            const data = await apiFetch('/analytics/followup');
            return data || [];
        } catch (error) {
            console.error('Error fetching follow up analysis:', error);
            return [];
        }
    },

    fetchDashboardBootstrap: async () => {
        try {
            const data = await apiFetch('/analytics/dashboard/bootstrap');
            return data;
        } catch (error) {
            console.error('Error fetching dashboard bootstrap:', error);
            return null;
        }
    },

    // Phase 3: Workflow Analytics
    fetchWorkflowSummary: async (from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.append('from', from);
        if (to) query.append('to', to);
        return await apiFetch(`/analytics/workflow/summary?${query.toString()}`);
    },

    fetchDepartmentAnalytics: async (deptId: string, from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.append('from', from);
        if (to) query.append('to', to);
        return await apiFetch(`/analytics/workflow/department/${deptId}?${query.toString()}`);
    },

    fetchFinanceAnalytics: async (from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.append('from', from);
        if (to) query.append('to', to);
        return await apiFetch(`/analytics/workflow/finance?${query.toString()}`);
    },

    fetchTeamLeaderAnalytics: async (from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.append('from', from);
        if (to) query.append('to', to);
        return await apiFetch(`/analytics/workflow/team-leader?${query.toString()}`);
    }
};

// React Query Hooks
export const useWorkflowSummaryAnalytics = (from?: string, to?: string) => {
    return useQuery({
        queryKey: ['analytics', 'workflow', 'summary', from, to],
        queryFn: () => analyticsService.fetchWorkflowSummary(from, to),
        staleTime: 5 * 60 * 1000,
    });
};

export const useDepartmentAnalytics = (deptId: string, from?: string, to?: string) => {
    return useQuery({
        queryKey: ['analytics', 'workflow', 'department', deptId, from, to],
        queryFn: () => analyticsService.fetchDepartmentAnalytics(deptId, from, to),
        staleTime: 5 * 60 * 1000,
        enabled: !!deptId,
    });
};

export const useFinanceAnalytics = (from?: string, to?: string) => {
    return useQuery({
        queryKey: ['analytics', 'workflow', 'finance', from, to],
        queryFn: () => analyticsService.fetchFinanceAnalytics(from, to),
        staleTime: 5 * 60 * 1000,
    });
};

export const useTeamLeaderAnalytics = (from?: string, to?: string) => {
    return useQuery({
        queryKey: ['analytics', 'workflow', 'team-leader', from, to],
        queryFn: () => analyticsService.fetchTeamLeaderAnalytics(from, to),
        staleTime: 5 * 60 * 1000,
    });
};
