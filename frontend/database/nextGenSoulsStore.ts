import { create } from 'zustand';
import { apiFetch } from '../services/api';
import { supabase } from '../services/supabaseClient';

export interface NextGenSoul {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    age: number;
    gender: 'Male' | 'Female';
    residence: string;
    serviceId: string;
    status: string;
    capturedBy: string;
    notes: string;
    createdAt: string;
}

export const mapNextGenSoulFromDB = (s: any): NextGenSoul => ({
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    phone: s.phone,
    age: s.age,
    gender: s.gender,
    residence: s.residence,
    serviceId: s.service_id,
    status: s.status,
    capturedBy: s.captured_by,
    notes: s.notes,
    createdAt: s.created_at
});

const mapToDB = (s: Partial<NextGenSoul>) => ({
    first_name: s.firstName,
    last_name: s.lastName,
    phone: s.phone,
    age: s.age,
    gender: s.gender,
    residence: s.residence,
    service_id: s.serviceId,
    status: s.status,
    captured_by: s.capturedBy,
    notes: s.notes
});

interface NextGenSoulsState {
    souls: NextGenSoul[];
    loading: boolean;
    initialized: boolean;
    fetchSouls: () => Promise<NextGenSoul[]>;
    add: (soul: Omit<NextGenSoul, 'id' | 'createdAt'>) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getByService: (serviceId: string) => Promise<NextGenSoul[]>;
    getCountByService: (serviceId: string) => Promise<number>;
    subscribe: () => void;
    unsubscribe: () => void;
}

let channel: ReturnType<typeof supabase.channel> | null = null;

export const useNextGenSoulsStore = create<NextGenSoulsState>((set, get) => ({
    souls: [],
    loading: false,
    initialized: false,
    
    fetchSouls: async () => {
        set({ loading: true });
        try {
            const data = await apiFetch('/souls/nextgen');
            const mapped = data.map(mapNextGenSoulFromDB);
            set({ souls: mapped, initialized: true, loading: false });
            return mapped;
        } catch (error) {
            set({ loading: false });
            return [];
        }
    },

    add: async (soul) => {
        await apiFetch('/souls/nextgen', {
            method: 'POST',
            body: JSON.stringify(mapToDB(soul))
        });
    },

    delete: async (id) => {
        await apiFetch(`/souls/nextgen/${id}`, { method: 'DELETE' });
    },

    getByService: async (serviceId) => {
        try {
            const data = await apiFetch(`/souls/nextgen?serviceId=${serviceId}`);
            return data.map(mapNextGenSoulFromDB);
        } catch (error) {
            return [];
        }
    },

    getCountByService: async (serviceId) => {
        try {
            const { count } = await apiFetch(`/souls/nextgen/count/${serviceId}`);
            return count || 0;
        } catch (error) {
            return 0;
        }
    },

    subscribe: () => {
        if (channel) return;
        channel = supabase.channel('nextgen-souls-store-live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'next_gen_souls' }, (payload) => {
                const newSoul = mapNextGenSoulFromDB(payload.new);
                set(state => ({
                    souls: state.souls.some(s => s.id === newSoul.id) ? state.souls : [newSoul, ...state.souls]
                }));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'next_gen_souls' }, (payload) => {
                const updated = mapNextGenSoulFromDB(payload.new);
                set(state => ({
                    souls: state.souls.map(s => s.id === updated.id ? updated : s)
                }));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'next_gen_souls' }, (payload) => {
                set(state => ({
                    souls: state.souls.filter(s => s.id !== payload.old.id)
                }));
            })
            .subscribe();
    },

    unsubscribe: () => {
        if (channel) {
            supabase.removeChannel(channel);
            channel = null;
        }
    }
}));

// Backward compatibility object for non-React files or legacy components
export const NextGenSoulsStore = {
    add: (soul: Omit<NextGenSoul, 'id' | 'createdAt'>) => useNextGenSoulsStore.getState().add(soul),
    getAll: () => useNextGenSoulsStore.getState().fetchSouls(),
    delete: (id: string) => useNextGenSoulsStore.getState().delete(id),
    getByService: (serviceId: string) => useNextGenSoulsStore.getState().getByService(serviceId),
    getCountByService: (serviceId: string) => useNextGenSoulsStore.getState().getCountByService(serviceId)
};
