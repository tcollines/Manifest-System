
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
  }
};
