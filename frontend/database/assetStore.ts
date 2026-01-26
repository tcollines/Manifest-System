import { apiFetch } from '../services/api';
import { supabase } from '../services/supabaseClient';

export interface Asset {
    id: string;
    asset_number: string;
    name: string;
    description: string;
    serial_number: string;
    date_procured: string;
    value_at_purchase: number;
    department_id: string;
    current_condition: string;
    storage_location: string;
    responsible_person: string;
    created_at?: string;
    updated_at?: string;
}

export const AssetStore = {
    // Get all assets (for Admin)
    getAll: async () => {
        try {
            return await apiFetch('/assets');
        } catch (error) {
            throw error;
        }
    },

    // Get assets by department
    getByDepartment: async (departmentId: string) => {
        try {
            return await apiFetch(`/assets/department/${departmentId}`);
        } catch (error) {
            throw error;
        }
    },

    // Add new asset
    add: async (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            return await apiFetch('/assets', {
                method: 'POST',
                body: JSON.stringify(asset)
            });
        } catch (error) {
            throw error;
        }
    },

    // Update asset
    update: async (id: string, updates: Partial<Asset>) => {
        try {
            return await apiFetch(`/assets/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        } catch (error) {
            throw error;
        }
    },

    // Delete asset
    delete: async (id: string) => {
        try {
            await apiFetch(`/assets/${id}`, { method: 'DELETE' });
        } catch (error) {
            throw error;
        }
    },

    // Subscribe to real-time changes
    subscribe: (callback: () => void) => {
        return supabase
            .channel('assets_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'assets' },
                () => callback()
            )
            .subscribe();
    }
};
