import { supabase } from '../services/supabaseClient';
import { VolunteerAttendance } from '../types';

const mapFromDB = (record: any): VolunteerAttendance => ({
    id: record.id,
    date: record.date,
    volunteerId: record.volunteer_id,
    serviceId: record.service_id,
    role: record.role,
    status: record.status,
    notes: record.notes,
    timestamp: record.timestamp
});

const mapToDB = (attendance: VolunteerAttendance) => ({
    id: attendance.id,
    volunteer_id: attendance.volunteerId,
    service_id: attendance.serviceId,
    date: attendance.date,
    role: attendance.role,
    status: attendance.status,
    notes: attendance.notes,
    timestamp: attendance.timestamp
});

export const VolunteerAttendanceStore = {
    // Fetch attendance for a specific service
    getByService: async (serviceId: string): Promise<VolunteerAttendance[]> => {
        try {
            const { data, error } = await supabase
                .from('volunteer_attendance')
                .select('*')
                .eq('service_id', serviceId);

            if (error) throw error;
            return (data || []).map(mapFromDB);
        } catch (error) {
            console.error('Error fetching volunteer attendance:', error);
            return [];
        }
    },

    // Save specific attendance record (Upsert)
    save: async (attendance: VolunteerAttendance) => {
        try {
            const { data, error } = await supabase
                .from('volunteer_attendance')
                .upsert(mapToDB(attendance), { onConflict: 'volunteer_id, service_id' })
                .select()
                .single();

            if (error) throw error;
            return mapFromDB(data);
        } catch (error) {
            console.error('Error saving volunteer attendance:', error);
            throw error;
        }
    },

    // Bulk save
    saveBatch: async (attendances: VolunteerAttendance[]) => {
        try {
            const records = attendances.map(mapToDB);
            const { data, error } = await supabase
                .from('volunteer_attendance')
                .upsert(records, { onConflict: 'volunteer_id, service_id' })
                .select();

            if (error) throw error;
            return (data || []).map(mapFromDB);
        } catch (error) {
            console.error('Error batch saving volunteer attendance:', error);
            throw error;
        }
    },

    // Delete attendance record
    delete: async (volunteerId: string, serviceId: string) => {
        try {
            const { error } = await supabase
                .from('volunteer_attendance')
                .delete()
                .match({ volunteer_id: volunteerId, service_id: serviceId });

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting volunteer attendance:', error);
            throw error;
        }
    }
};
