
import { PickUpStation } from '../types';
import { supabase } from '../services/supabaseClient';
import { PICKUP_STATIONS } from '../constants';

export interface ExtendedStation extends PickUpStation {
  coordinatorName?: string;
  coordinatorContact?: string;
  coordinatorEmail?: string;
}

const mapStationFromDB = (s: any): ExtendedStation => ({
  id: s.id,
  name: s.name,
  location: s.location,
  registeredAttendees: s.registered_attendees,
  vehicleStatus: s.vehicle_status,
  eventId: s.event_id,
  coordinatorName: s.coordinator_name,
  coordinatorContact: s.coordinator_contact,
  coordinatorEmail: s.coordinator_email
});

const mapStationToDB = (s: ExtendedStation) => ({
  id: s.id,
  name: s.name,
  location: s.location,
  registered_attendees: s.registeredAttendees,
  vehicle_status: s.vehicleStatus,
  event_id: s.eventId,
  coordinator_name: s.coordinatorName,
  coordinator_contact: s.coordinatorContact,
  coordinator_email: s.coordinatorEmail
});

export const LogisticsStore = {
  getStations: async (): Promise<ExtendedStation[]> => {
    try {
      const { data, error } = await supabase.from('pickup_stations').select('*');
      if (error) {
        console.error('Error fetching stations:', error.message);
        return PICKUP_STATIONS as ExtendedStation[];
      }
      return data.map(mapStationFromDB);
    } catch (e: any) {
      console.error('Unexpected error fetching stations:', e.message || e);
      return PICKUP_STATIONS as ExtendedStation[];
    }
  },

  addStation: async (station: ExtendedStation): Promise<void> => {
    try {
      const { error } = await supabase.from('pickup_stations').insert([mapStationToDB(station)]);
      if (error) console.error('Error adding station:', error.message);
    } catch (e: any) {
      console.error('Unexpected error adding station:', e.message || e);
    }
  },

  updateStation: async (station: ExtendedStation): Promise<void> => {
    try {
      const { error } = await supabase.from('pickup_stations').update(mapStationToDB(station)).eq('id', station.id);
      if (error) console.error('Error updating station:', error.message);
    } catch (e: any) {
      console.error('Unexpected error updating station:', e.message || e);
    }
  },

  deleteStation: async (id: string): Promise<void> => {
    try {
      // 1. Get all vehicles in station
      const { data: vehicles } = await supabase.from('vehicles').select('id').eq('station_id', id);

      if (vehicles && vehicles.length > 0) {
        const vehicleIds = vehicles.map(v => v.id);

        // 2. Delete all passengers in these vehicles
        const { error: pError } = await supabase.from('passengers').delete().in('vehicle_id', vehicleIds);
        if (pError) throw pError;

        // 3. Delete the vehicles
        const { error: vError } = await supabase.from('vehicles').delete().in('id', vehicleIds);
        if (vError) throw vError;
      }

      // 4. Delete associated Data Entrants (Users)
      const { error: uError } = await supabase.from('users').delete().eq('station_id', id);
      if (uError) {
        console.warn('Warning: Failed to delete associated users:', uError.message);
        throw uError;
      }

      // 5. Delete the station
      const { error } = await supabase.from('pickup_stations').delete().eq('id', id);
      if (error) throw error;

    } catch (e: any) {
      console.error('Unexpected error deleting station:', e.message || e);
      throw e;
    }
  }
};
