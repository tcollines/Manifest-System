import { supabase } from './supabaseClient';
import { apiFetch } from './api';
import { SOUL_WINNING_DATA, ATTENDANCE_DATA } from '../constants';

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
            return data;
        } catch (error) {
            console.error('Error fetching soul winning analytics:', error);
            return SOUL_WINNING_DATA; // Fallback entirely to mock if backend fails
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
    }
};
