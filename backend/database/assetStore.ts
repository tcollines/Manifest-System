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
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Asset[];
    },

    // Get assets by department
    getByDepartment: async (departmentId: string) => {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('department_id', departmentId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Asset[];
    },

    // Add new asset
    add: async (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('assets')
            .insert([asset])
            .select()
            .single();
        if (error) throw error;
        return data as Asset;
    },

    // Update asset
    update: async (id: string, updates: Partial<Asset>) => {
        const { data, error } = await supabase
            .from('assets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as Asset;
    },

    // Delete asset
    delete: async (id: string) => {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);
        if (error) throw error;
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
