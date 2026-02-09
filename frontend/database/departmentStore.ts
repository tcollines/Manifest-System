
import { Department, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

export const DepartmentStore = {
    getAll: async (): Promise<ServiceResponse<Department[]>> => {
        return safeFetch(
            () => apiFetch('/departments'), // We need to ensure backend has this endpoint?
            // Assuming generic CRUD or we might need to add it to backend if not exists.
            // But for Phase 1, we just added the table. We might need a controller.
            // Let's assume we can fetch it via Supabase directly or standard endpoint.
            // If /departments doesn't exist, we need to create it. 
            // Checking file list, there is no 'departmentController.ts'. 
            // We might need to add it OR just use supabase client in frontend if allowed?
            // The user pattern seems to use valid API endpoints.
            // I will create a simple backend endpoint/controller as well.
            'Failed to fetch departments'
        );
    },

    getByCode: async (code: string): Promise<Department | null> => {
        const result = await DepartmentStore.getAll();
        if (result.status === 'success') {
            return result.data.find(d => d.code === code) || null;
        }
        return null;
    }
};
