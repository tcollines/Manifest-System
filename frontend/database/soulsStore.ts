import { Soul } from '../types';
import { apiFetch } from '../services/api';
import { NextGenSoulsStore } from './nextGenSoulsStore';

const mapSoulFromDB = (s: any): Soul => ({
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    phone: s.phone,
    email: s.email,
    gender: s.gender,
    residence: s.residence,
    status: s.status,
    sourceType: s.source_type,
    sourceId: s.source_id,
    capturedBy: s.captured_by,
    notes: s.notes,
    createdAt: s.created_at,
    preferredCallTime: s.preferred_call_time,
    studentStatus: s.student_status,
    age: s.age,
    occupation: s.occupation,
    invitedBy: s.invited_by,
    ministry: s.ministry
});

const mapSoulToDB = (s: Soul) => ({
    first_name: s.firstName,
    last_name: s.lastName,
    phone: s.phone,
    email: s.email,
    gender: s.gender,
    residence: s.residence,
    status: s.status,
    source_type: s.sourceType,
    source_id: s.sourceId,
    captured_by: s.capturedBy,
    notes: s.notes,
    preferred_call_time: s.preferredCallTime,
    student_status: s.studentStatus,
    age: s.age,
    occupation: s.occupation,
    invited_by: s.invitedBy,
    ministry: s.ministry
});

export const SoulsStore = {
    getAll: async (): Promise<Soul[]> => {
        try {
            const data = await apiFetch('/souls');
            return data.map(mapSoulFromDB);
        } catch (e) {
            console.error('Failed to fetch souls', e);
            return [];
        }
    },

    getBySource: async (sourceId: string): Promise<Soul[]> => {
        try {
            const data = await apiFetch(`/souls?sourceId=${sourceId}`);
            return data.map(mapSoulFromDB);
        } catch (e) {
            console.error('Failed to fetch source souls', e);
            return [];
        }
    },

    add: async (soul: Soul): Promise<void> => {
        try {
            await apiFetch('/souls', {
                method: 'POST',
                body: JSON.stringify(mapSoulToDB(soul))
            });
        } catch (error: any) {
            throw error;
        }
    },

    update: async (soul: Soul): Promise<void> => {
        try {
            await apiFetch(`/souls/${soul.id}`, {
                method: 'PUT',
                body: JSON.stringify(mapSoulToDB(soul))
            });
        } catch (error: any) {
            throw error;
        }
    },

    getServiceStats: async (serviceId: string): Promise<number> => {
        try {
            const { count } = await apiFetch(`/souls/stats/${serviceId}`);
            return count || 0;
        } catch (e) {
            console.error('Unexpected error fetching souls stats:', e);
            return 0;
        }
    },

    delete: async (id: string): Promise<void> => {
        try {
            await apiFetch(`/souls/${id}`, { method: 'DELETE' });
        } catch (error: any) {
            throw error;
        }
    }
};
