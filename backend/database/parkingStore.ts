
import { PersonalVehicle } from '../types';
import { supabase } from '../services/supabaseClient';


const mapPVFromDB = (v: any): PersonalVehicle => ({
  id: v.id,
  number_plate: v.number_plate,
  driverName: v.driver_name,
  driverContact: v.driver_contact,
  status: v.status,
  checkInTime: v.check_in_time,
  checkOutTime: v.check_out_time,
  currentServiceId: v.current_service_id,
  registeredDate: v.registered_date,
  attendedServiceIds: v.attended_service_ids || []
});

const mapPVToDB = (v: PersonalVehicle) => ({
  id: v.id,
  number_plate: v.number_plate,
  driver_name: v.driverName,
  driver_contact: v.driverContact,
  status: v.status,
  check_in_time: v.checkInTime,
  check_out_time: v.checkOutTime,
  current_service_id: v.currentServiceId || null,
  registered_date: v.registeredDate,
  attended_service_ids: v.attendedServiceIds
});

export const ParkingStore = {
  getAll: async (): Promise<PersonalVehicle[]> => {
    try {
      const { data, error } = await supabase.from('personal_vehicles').select('*');
      if (error) {
        console.error('Error fetching personal vehicles:', error.message);
        return [];
      }
      return data ? data.map(mapPVFromDB) : [];
    } catch (e: any) {
      console.error('Unexpected error fetching personal vehicles:', e.message || e);
      return [];
    }
  },

  add: async (vehicle: PersonalVehicle): Promise<void> => {
    try {
      const { error } = await supabase.from('personal_vehicles').insert([mapPVToDB(vehicle)]);
      if (error) console.error('Error adding personal vehicle:', error.message);
    } catch (e: any) {
      console.error('Unexpected error adding personal vehicle:', e.message || e);
    }
  },

  update: async (vehicle: PersonalVehicle): Promise<void> => {
    try {
      const { error } = await supabase.from('personal_vehicles').update(mapPVToDB(vehicle)).eq('id', vehicle.id);
      if (error) console.error('Error updating personal vehicle:', error.message);
    } catch (e: any) {
      console.error('Unexpected error updating personal vehicle:', e.message || e);
    }
  },

  getServiceCount: async (serviceId: string): Promise<number> => {
    try {
      // Use contains to find if serviceId is in the array
      const { count, error } = await supabase
        .from('personal_vehicles')
        .select('*', { count: 'exact', head: true })
        .contains('attended_service_ids', [serviceId]);

      if (error) {
        console.error('Error fetching parking count:', error.message);
        return 0;
      }
      return count || 0;
    } catch (e) {
      console.error('Unexpected error fetching parking count:', e);
      return 0;
    }
  },

  checkIn: async (vehicleId: string, serviceId: string): Promise<void> => {
    try {
      // 1. Fetch current vehicle to get history
      const { data: vehicle, error: fetchError } = await supabase
        .from('personal_vehicles')
        .select('attended_service_ids')
        .eq('id', vehicleId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update Array (Cache)
      const currentHistory = vehicle.attended_service_ids || [];
      const newHistory = currentHistory.includes(serviceId) ? currentHistory : [...currentHistory, serviceId];
      const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const { error: updateError } = await supabase.from('personal_vehicles').update({
        status: 'Checked In',
        current_service_id: serviceId,
        check_in_time: checkInTime,
        check_out_time: null,
        attended_service_ids: newHistory
      }).eq('id', vehicleId);

      if (updateError) throw updateError;

      // 3. Insert into Attendance Table (Log)
      // We try to insert; if it fails (e.g. table doesn't exist), we log but don't crash the UI flow
      const { error: logError } = await supabase.from('vehicle_attendance').insert({
        vehicle_id: vehicleId,
        service_id: serviceId,
        check_in_time: new Date().toISOString()
      });

      if (logError) console.warn('Attendance log insert failed (Table might be missing):', logError.message);

    } catch (e: any) {
      console.error('Error checking in vehicle:', e.message || e);
    }
  },

  checkOut: async (vehicleId: string): Promise<void> => {
    try {
      const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Update Vehicle Status
      const { error: updateError } = await supabase.from('personal_vehicles').update({
        status: 'Checked Out',
        check_out_time: checkOutTime,
        // We leave current_service_id as comes in useful for history sometimes, or we can clear it.
        // Usually we assume 'Checked Out' implies from current_service_id.
      }).eq('id', vehicleId);

      if (updateError) throw updateError;

      // 2. Update Attendance Log (Find latest open record for this vehicle)
      // This is tricky without a transaction or known attendance ID. 
      // We'll update the most recent record for this vehicle where check_out_time is null.
      const { error: logError } = await supabase
        .from('vehicle_attendance')
        .update({ check_out_time: new Date().toISOString() })
        .eq('vehicle_id', vehicleId)
        .is('check_out_time', null); // Only update open sessions

      if (logError) console.warn('Attendance log update failed:', logError.message);

    } catch (e: any) {
      console.error('Error checking out vehicle:', e.message || e);
    }
  },

  getAttendanceCount: async (serviceId: string): Promise<number> => {
    try {
      // Logic 1: count rows in vehicle_attendance (Source of Truth)
      const { count, error } = await supabase
        .from('vehicle_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId);

      if (!error && count !== null) {
        return count;
      }

      // Fallback: If table is empty (migration run but no data yet?) or error, use the array method from personal_vehicles
      // This handles cases where user might have old data in arrays but empty table
      console.warn('Vehicle attendance table empty or error, falling back to array check.', error?.message);
      const { count: arrayCount, error: arrayError } = await supabase
        .from('personal_vehicles')
        .select('*', { count: 'exact', head: true })
        .contains('attended_service_ids', [serviceId]);

      return arrayCount || 0;

    } catch (e) {
      console.error('Error fetching attendance count:', e);
      return 0;
    }
  }
};
