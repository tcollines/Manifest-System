
import { TrainingRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import { UserStore } from './userStore';

const getManifestId = () => {
    const user = UserStore.getSession();
    return user?.manifestId;
};

export const TrainingStore = {
    getAll: async (): Promise<TrainingRequest[]> => {
        try {
            const manifestId = getManifestId();
            if (!manifestId) throw new Error("No active tenant session");

            const { data, error } = await supabase
                .from('training_requests')
                .select('*, users:requester_id(name)')
                .eq('manifest_id', manifestId) // Tenant isolation
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapFromDB);
        } catch (error) {
            console.error('Error fetching training requests:', error);
            return [];
        }
    },

    add: async (request: Omit<TrainingRequest, 'id' | 'createdAt' | 'status'>) => {
        try {
            const manifestId = getManifestId();
            if (!manifestId) throw new Error("No active tenant session");

            const { data, error } = await supabase
                .from('training_requests')
                .insert({ ...mapToDB({ ...request, status: 'Pending' }), manifest_id: manifestId }) // Inject tenant ID
                .select()
                .single();

            if (error) throw error;
            return mapFromDB(data);
        } catch (error) {
            console.error('Error adding training request:', error);
            throw error;
        }
    },

    update: async (request: TrainingRequest) => {
        try {
            const manifestId = getManifestId();
            if (!manifestId) throw new Error("No active tenant session");

            const { error } = await supabase
                .from('training_requests')
                .update(mapToDB(request))
                .eq('manifest_id', manifestId) // Tenant isolation
                .eq('id', request.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating training request:', error);
            throw error;
        }
    },

    delete: async (id: string) => {
        try {
            const manifestId = getManifestId();
            if (!manifestId) throw new Error("No active tenant session");

            const { error } = await supabase
                .from('training_requests')
                .delete()
                .eq('manifest_id', manifestId) // Tenant isolation
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting training request:', error);
            throw error;
        }
    }
};

const mapFromDB = (data: any): TrainingRequest => ({
    id: data.id,
    requesterId: data.requester_id,
    topic: data.topic,
    date: data.date,
    status: data.status,
    comments: data.comments,
    createdAt: data.created_at,
    requesterName: data.users?.name
});

const mapToDB = (data: Partial<TrainingRequest>) => ({
    requester_id: data.requesterId,
    topic: data.topic,
    date: data.date,
    status: data.status,
    comments: data.comments
});
