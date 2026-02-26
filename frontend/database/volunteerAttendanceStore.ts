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
    timestamp: record.timestamp,
    manifestId: record.manifest_id
});

const mapToDB = (attendance: VolunteerAttendance) => ({
    id: attendance.id,
    volunteer_id: attendance.volunteerId,
    service_id: attendance.serviceId,
    date: attendance.date,
    role: attendance.role,
    status: attendance.status,
    notes: attendance.notes,
    timestamp: attendance.timestamp,
    ...(attendance.manifestId && { manifest_id: attendance.manifestId })
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

    // Save specific attendance record (Fallback for Upsert)
    save: async (attendance: VolunteerAttendance) => {
        try {
            const dbRecord = mapToDB(attendance);

            // 1. Check if record already exists
            const { data: existing, error: fetchError } = await supabase
                .from('volunteer_attendance')
                .select('id')
                .eq('volunteer_id', dbRecord.volunteer_id)
                .eq('service_id', dbRecord.service_id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (existing) {
                // 2. Update existing
                const { data, error } = await supabase
                    .from('volunteer_attendance')
                    .update(dbRecord)
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                return mapFromDB(data);
            } else {
                // 3. Insert new
                const { data, error } = await supabase
                    .from('volunteer_attendance')
                    .insert(dbRecord)
                    .select()
                    .single();
                if (error) throw error;
                return mapFromDB(data);
            }
        } catch (error) {
            console.error('Error saving volunteer attendance:', error);
            throw error;
        }
    },

    // Bulk save (Fallback for Upsert)
    saveBatch: async (attendances: VolunteerAttendance[]) => {
        try {
            const savedRecords = [];
            for (const attendance of attendances) {
                // Reuse the save method to handle the fallback logic per record
                const saved = await VolunteerAttendanceStore.save(attendance);
                savedRecords.push(saved);
            }
            return savedRecords;
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
