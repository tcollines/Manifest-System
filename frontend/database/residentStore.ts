import { create } from 'zustand';
import { Residence, ResidenceOutreachReport } from '../types';
import { apiFetch } from '../services/api';

interface ResidentState {
    residences: Residence[];
    reports: ResidenceOutreachReport[];
    loading: boolean;
    error: string | null;
    fetchResidences: () => Promise<void>;
    addResidence: (payload: Omit<Residence, 'id' | 'createdAt'>) => Promise<boolean>;
    deleteResidence: (id: string) => Promise<boolean>;
    fetchResidenceMembers: (id: string) => Promise<any[]>;
    fetchReports: () => Promise<void>;
    addReport: (payload: Omit<ResidenceOutreachReport, 'id' | 'residenceName' | 'submittedAt'>) => Promise<boolean>;
}

export const useResidentStore = create<ResidentState>((set) => ({
    residences: [],
    reports: [],
    loading: false,
    error: null,

    fetchResidences: async () => {
        set({ loading: true, error: null });
        try {
            const data = await apiFetch('/residents');
            const mappedData = data.map((res: any) => ({
                id: res.id,
                name: res.name,
                coordinatorName: res.coordinator_name || res.coordinatorName,
                coordinatorEmail: res.coordinator_email || res.coordinatorEmail,
                coordinatorContact: res.coordinator_contact || res.coordinatorContact,
                createdAt: res.created_at || res.createdAt
            }));
            set({ residences: mappedData, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    addResidence: async (payload) => {
        set({ loading: true, error: null });
        try {
            const newResidence = await apiFetch('/residents', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const mappedResidence = {
                id: newResidence.id,
                name: newResidence.name,
                coordinatorName: newResidence.coordinator_name || newResidence.coordinatorName,
                coordinatorEmail: newResidence.coordinator_email || newResidence.coordinatorEmail,
                coordinatorContact: newResidence.coordinator_contact || newResidence.coordinatorContact,
                createdAt: newResidence.created_at || newResidence.createdAt
            };
            set((state) => ({
                residences: [...state.residences, mappedResidence],
                loading: false
            }));
            return true;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            return false;
        }
    },

    deleteResidence: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await apiFetch(`/residents/${id}`, { method: 'DELETE' });
            set((state) => ({
                residences: state.residences.filter((r) => r.id !== id),
                loading: false
            }));
            return true;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            return false;
        }
    },

    fetchResidenceMembers: async (id: string) => {
        try {
            const data = await apiFetch(`/residents/${id}/members`);
            return data;
        } catch (error: any) {
            console.error('Failed to fetch residence members:', error);
            return [];
        }
    },

    fetchReports: async () => {
        set({ loading: true, error: null });
        try {
            const data = await apiFetch('/residents/reports');
            const formattedData = data.map((item: any) => ({
                ...item,
                residenceName: item.residences?.name // Extract from joined table
            }));
            set({ reports: formattedData, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    addReport: async (payload) => {
        set({ loading: true, error: null });
        try {
            const newReport = await apiFetch('/residents/reports', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            // Refetch reports to get the joined residenceName
            useResidentStore.getState().fetchReports();
            return true;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            return false;
        }
    }
}));
