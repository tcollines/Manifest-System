import { apiFetch } from '../services/api';
import { CampusActivity, CampusActivityAttendant, CampusFinance } from '../types';

export const CampusStore = {
    // Activities
    getActivities: async (eventId?: string): Promise<CampusActivity[]> => {
        const url = eventId ? `/campus/activities?eventId=${eventId}` : '/campus/activities';
        return await apiFetch(url);
    },

    createActivity: async (payload: Partial<CampusActivity>): Promise<CampusActivity> => {
        return await apiFetch('/campus/activities', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    deleteActivity: async (id: string): Promise<void> => {
        return await apiFetch(`/campus/activities/${id}`, {
            method: 'DELETE'
        });
    },

    updateActivity: async (id: string, payload: Partial<CampusActivity>): Promise<CampusActivity> => {
        return await apiFetch(`/campus/activities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    // Attendants
    getAttendants: async (activityId: string): Promise<CampusActivityAttendant[]> => {
        return await apiFetch(`/campus/attendants/${activityId}`);
    },

    createAttendant: async (payload: Partial<CampusActivityAttendant>): Promise<CampusActivityAttendant> => {
        return await apiFetch('/campus/attendants', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    deleteAttendant: async (id: string): Promise<void> => {
        return await apiFetch(`/campus/attendants/${id}`, {
            method: 'DELETE'
        });
    },

    // Finance
    getFinanceRecords: async (eventId?: string): Promise<CampusFinance[]> => {
        const url = eventId ? `/campus/finance?eventId=${eventId}` : '/campus/finance';
        return await apiFetch(url);
    },

    createFinanceRecord: async (payload: Partial<CampusFinance>): Promise<CampusFinance> => {
        return await apiFetch('/campus/finance', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    updateFinanceRecord: async (id: string, payload: Partial<CampusFinance>): Promise<CampusFinance> => {
        return await apiFetch(`/campus/finance/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    deleteFinanceRecord: async (id: string): Promise<void> => {
        return await apiFetch(`/campus/finance/${id}`, {
            method: 'DELETE'
        });
    }
};
