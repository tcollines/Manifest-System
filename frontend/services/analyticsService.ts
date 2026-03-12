import { supabase } from './supabaseClient';
import { apiFetch } from './api';
import { SOUL_WINNING_DATA, ATTENDANCE_DATA } from '../constants';

export const analyticsService = {
    fetchAttendanceAnalytics: async () => {
        // In a real implementation, this would fetch from a database view or RPC.
        // For now, returning the constant data expected by the chart fallback.
        return ATTENDANCE_DATA;
    },

    fetchSoulWinningAnalytics: async () => {
        try {
            const data = await apiFetch('/analytics/souls');
            return data;
        } catch (error) {
            console.error('Error fetching soul winning analytics:', error);
            return SOUL_WINNING_DATA; // Fallback entirely to mock if backend fails
        }
    }
};
