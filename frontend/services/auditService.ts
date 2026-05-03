import { apiFetch } from './api';

export const auditService = {
    fetchWorkplanItemLogs: async (itemId: string) => {
        try {
            const data = await apiFetch(`/audit/workplan-items/${itemId}`);
            return data;
        } catch (error) {
            console.error('Error fetching workplan item logs:', error);
            return [];
        }
    },

    fetchRequisitionLogs: async (id: string, type: 'requisition' | 'batch') => {
        try {
            const data = await apiFetch(`/audit/requisitions?id=${id}&type=${type}`);
            return data;
        } catch (error) {
            console.error(`Error fetching ${type} logs:`, error);
            return [];
        }
    }
};
