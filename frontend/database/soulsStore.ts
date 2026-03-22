import { Soul } from '../types';
import { apiFetch } from '../services/api';
import { NextGenSoulsStore } from './nextGenSoulsStore';

export const mapSoulFromDB = (s: any): Soul => ({
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
    ministry: s.ministry,
    eventId: s.event_id
});

const mapSoulToDB = (s: Soul) => ({
    id: s.id, // Pass ID to Backend to enforce UUID
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
    ministry: s.ministry,
    event_id: s.eventId,
    station_id: s.stationId,
    vehicle_id: s.vehicleId
});

export const SoulsStore = {
    getAll: async (eventId?: string): Promise<Soul[]> => {
        try {
            const url = eventId ? `/souls?sourceId=${eventId}` : '/souls';
            const data = await apiFetch(url);
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

    getBySourceType: async (sourceType: string): Promise<Soul[]> => {
        try {
            const data = await apiFetch(`/souls`);
            return data.map(mapSoulFromDB).filter(s => s.sourceType === sourceType);
        } catch (e) {
            console.error('Failed to fetch souls by source type', e);
            return [];
        }
    },

    add: async (soul: Soul): Promise<void> => {
        // Ensure UUID
        const finalSoul = { ...soul, id: soul.id || crypto.randomUUID() };
        try {
            await apiFetch('/souls', {
                method: 'POST',
                body: JSON.stringify(mapSoulToDB(finalSoul))
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

    getSoulDetails: async (soulId: string): Promise<{ member: any, attendedCount: number, totalServices: number, history: any[] }> => {
        try {
            const data = await apiFetch(`/souls/${soulId}/details`);
            return data;
        } catch (e: any) {
            console.error("Error fetching soul details:", e);
            throw e;
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
