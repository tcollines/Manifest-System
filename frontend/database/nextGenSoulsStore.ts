import { apiFetch } from '../services/api';

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

const mapToDB = (s: NextGenSoul) => ({
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

export const NextGenSoulsStore = {
    add: async (soul: Omit<NextGenSoul, 'id' | 'createdAt'>): Promise<void> => {
        try {
            await apiFetch('/souls/nextgen', {
                method: 'POST',
                body: JSON.stringify(mapToDB(soul as NextGenSoul))
            });
        } catch (error: any) {
            throw error;
        }
    },

    getAll: async (): Promise<NextGenSoul[]> => {
        try {
            const data = await apiFetch('/souls/nextgen');
            return data.map(mapNextGenSoulFromDB);
        } catch (error) {
            return [];
        }
    },

    delete: async (id: string): Promise<void> => {
        try {
            await apiFetch(`/souls/nextgen/${id}`, { method: 'DELETE' });
        } catch (error: any) {
            throw error;
        }
    },

    getByService: async (serviceId: string): Promise<NextGenSoul[]> => {
        try {
            const data = await apiFetch(`/souls/nextgen?serviceId=${serviceId}`);
            return data.map(mapNextGenSoulFromDB);
        } catch (error) {
            return [];
        }
    },

    getCountByService: async (serviceId: string): Promise<number> => {
        try {
            const { count } = await apiFetch(`/souls/nextgen/count/${serviceId}`);
            return count || 0;
        } catch (error) {
            return 0;
        }
    }
};
