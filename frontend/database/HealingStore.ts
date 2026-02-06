
import { apiFetch } from '../services/api';
import { Soul } from '../types';

export interface HealingReport {
    id: string;
    date: string;
    hospital_name: string;
    labourers_count: number;
    souls_count: number;
    notes?: string;
    created_at: string;
    created_by?: string;
    healing_testimonies?: HealingTestimony[];
    people_reached?: number;
}

export interface HealingTestimony {
    id: string;
    report_id: string;
    content: string;
    testifier_name?: string;
    testifier_contact?: string;
    created_at: string;
}

export const HealingStore = {
    // Create new Outreach Report
    createReport: async (payload: {
        date: string;
        hospital_name: string;
        labourers_count: number;
        souls_count: number;
        people_reached: number;
        notes?: string;
        captured_by: string;
        testimonies: { content: string; testifier_name?: string; testifier_contact?: string }[];
        souls: Partial<Soul>[]; // Souls to be added to main DB
    }): Promise<HealingReport> => {
        try {
            return await apiFetch('/healing/reports', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error creating healing report:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to create report: ${errorMessage}`);
        }
    },

    // Get all reports
    getAllReports: async (): Promise<HealingReport[]> => {
        try {
            return await apiFetch('/healing/reports');
        } catch (error) {
            console.error('Error fetching healing reports:', error);
            return [];
        }
    },

    // Update Report
    updateReport: async (id: string, updates: Partial<HealingReport>) => {
        return await apiFetch(`/healing/reports/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    // Delete Report
    deleteReport: async (id: string) => {
        return await apiFetch(`/healing/reports/${id}`, {
            method: 'DELETE'
        });
    },

    // Get All Healing Souls
    getSouls: async (): Promise<Soul[]> => {
        try {
            return await apiFetch('/healing/souls');
        } catch (error) {
            console.error('Error fetching healing souls:', error);
            return [];
        }
    },

    // Get All Testimonies
    getTestimonies: async (): Promise<HealingTestimony[]> => {
        try {
            return await apiFetch('/healing/testimonies');
        } catch (error) {
            console.error('Error fetching healing testimonies:', error);
            return [];
        }
    },

    // Update Testimony
    updateTestimony: async (id: string, updates: Partial<HealingTestimony>) => {
        return await apiFetch(`/healing/testimonies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    // Delete Testimony
    deleteTestimony: async (id: string) => {
        return await apiFetch(`/healing/testimonies/${id}`, {
            method: 'DELETE'
        });
    },

    // Update Soul (Using generic souls endpoint)
    updateSoul: async (id: string, updates: Partial<Soul>) => {
        return await apiFetch(`/souls/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    // Delete Soul (Using generic souls endpoint)
    deleteSoul: async (id: string) => {
        return await apiFetch(`/souls/${id}`, {
            method: 'DELETE'
        });
    },

    // Get Stats
    getStats: async (): Promise<{ totalReports: number; totalTestimonies: number; totalSouls: number }> => {
        try {
            return await apiFetch('/healing/stats');
        } catch (error) {
            console.error('Error fetching healing stats:', error);
            return { totalReports: 0, totalTestimonies: 0, totalSouls: 0 };
        }
    }
};
