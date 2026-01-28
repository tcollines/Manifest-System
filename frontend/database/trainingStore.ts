
import { TrainingRequest } from '../types';
import { supabase } from '../services/supabaseClient';

export const TrainingStore = {
    getAll: async (): Promise<TrainingRequest[]> => {
        try {
            const { data, error } = await supabase
                .from('training_requests')
                .select('*, users:requester_id(name)')
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
            const { data, error } = await supabase
                .from('training_requests')
                .insert(mapToDB({ ...request, status: 'Pending' }))
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
            const { error } = await supabase
                .from('training_requests')
                .update(mapToDB(request))
                .eq('id', request.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating training request:', error);
            throw error;
        }
    },

    delete: async (id: string) => {
        try {
            const { error } = await supabase
                .from('training_requests')
                .delete()
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
