
import { PersonalVehicle } from '../types';
import { apiFetch } from '../services/api';

const mapPVFromDB = (v: any): PersonalVehicle => ({
  id: v.id,
  idUuid: v.id_uuid || undefined,
  legacyId: v.legacy_id || undefined,
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
      const data = await apiFetch('/parking');
      return data ? data.map(mapPVFromDB) : [];
    } catch (e: any) {
      console.error('Unexpected error fetching personal vehicles:', e.message || e);
      return [];
    }
  },

  add: async (vehicle: PersonalVehicle): Promise<void> => {
    try {
      await apiFetch('/parking', {
        method: 'POST',
        body: JSON.stringify(mapPVToDB(vehicle))
      });
    } catch (e: any) {
      console.error('Unexpected error adding personal vehicle:', e.message || e);
    }
  },

  update: async (vehicle: PersonalVehicle): Promise<void> => {
    try {
      await apiFetch(`/parking/${vehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapPVToDB(vehicle))
      });
    } catch (e: any) {
      console.error('Unexpected error updating personal vehicle:', e.message || e);
    }
  },

  getServiceCount: async (serviceId: string): Promise<number> => {
    try {
      const { count } = await apiFetch(`/parking/count/${serviceId}`);
      return count || 0;
    } catch (e) {
      console.error('Unexpected error fetching parking count:', e);
      return 0;
    }
  },

  checkIn: async (vehicleId: string, serviceId: string): Promise<void> => {
    try {
      await apiFetch(`/parking/${vehicleId}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ serviceId })
      });
    } catch (e: any) {
      console.error('Error checking in vehicle:', e.message || e);
    }
  },

  checkOut: async (vehicleId: string): Promise<void> => {
    try {
      await apiFetch(`/parking/${vehicleId}/check-out`, { method: 'POST' });
    } catch (e: any) {
      console.error('Error checking out vehicle:', e.message || e);
    }
  },

  getAttendanceCount: async (serviceId: string): Promise<number> => {
    try {
      const { count } = await apiFetch(`/parking/count/${serviceId}`);
      return count || 0;
    } catch (e) {
      console.error('Error fetching attendance count:', e);
      return 0;
    }
  }
};
