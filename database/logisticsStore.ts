
import { PickUpStation } from '../types';
import { supabase } from '../services/supabaseClient';
import { PICKUP_STATIONS } from '../constants';

export interface ExtendedStation extends PickUpStation {
    coordinatorName?: string;
    coordinatorContact?: string;
}

const mapStationFromDB = (s: any): ExtendedStation => ({
  id: s.id,
  name: s.name,
  location: s.location,
  registeredAttendees: s.registered_attendees,
  vehicleStatus: s.vehicle_status,
  eventId: s.event_id,
  coordinatorName: s.coordinator_name,
  coordinatorContact: s.coordinator_contact
});

const mapStationToDB = (s: ExtendedStation) => ({
  id: s.id,
  name: s.name,
  location: s.location,
  registered_attendees: s.registeredAttendees,
  vehicle_status: s.vehicleStatus,
  event_id: s.eventId,
  coordinator_name: s.coordinatorName,
  coordinator_contact: s.coordinatorContact
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
  }
};
