
import { IncidentReport } from '../types';
import { supabase } from '../services/supabaseClient';

export const IncidentStore = {
    getAll: async (): Promise<IncidentReport[]> => {
        try {
            const { data, error } = await supabase
                .from('incidents')
                .select('*, children:child_id(name)')
                .order('date', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapFromDB);
        } catch (error) {
            console.error('Error fetching incidents:', error);
            return [];
        }
    },

    getByService: async (serviceId: string): Promise<IncidentReport[]> => {
        try {
            const { data, error } = await supabase
                .from('incidents')
                .select('*, children:child_id(name)')
                .eq('service_id', serviceId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapFromDB);
        } catch (error) {
            console.error('Error fetching service incidents:', error);
            return [];
        }
    },

    add: async (incident: Omit<IncidentReport, 'id' | 'createdAt'> & { id?: string }) => {
        const id = incident.id || crypto.randomUUID();
        try {
            const { data, error } = await supabase
                .from('incidents')
                .insert(mapToDB({ ...incident, id }))
                .select()
                .single();

            if (error) throw error;
            return mapFromDB(data);
        } catch (error) {
            console.error('Error adding incident:', error);
            throw error;
        }
    },

    // ... (update, delete match existing)

    update: async (incident: IncidentReport) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .update(mapToDB(incident))
                .eq('id', incident.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating incident:', error);
            throw error;
        }
    },

    delete: async (id: string) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting incident:', error);
            throw error;
        }
    }
};

const mapFromDB = (data: any): IncidentReport => ({
    id: data.id,
    childId: data.child_id,
    serviceId: data.service_id,
    date: data.date,
    reportedBy: data.reported_by,
    type: data.type,
    description: data.description,
    severity: data.severity,
    status: data.status,
    createdAt: data.created_at,
    childName: data.children?.name
});

const mapToDB = (data: Partial<IncidentReport>) => ({
    id: data.id, // Pass ID
    child_id: data.childId || null,
    service_id: data.serviceId,
    date: data.date,
    reported_by: data.reportedBy,
    type: data.type || null,
    description: data.description,
    severity: data.severity || null,
    status: data.status || 'Open'
});
