
import { PickUpStation } from '../types';
import { apiFetch } from '../services/api';
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
      const data = await apiFetch('/logistics/stations');
      return data.map(mapStationFromDB);
    } catch (e: any) {
      console.error('Unexpected error fetching stations:', e.message || e);
      return PICKUP_STATIONS as ExtendedStation[];
    }
  },

  addStation: async (station: ExtendedStation): Promise<void> => {
    try {
      await apiFetch('/logistics/stations', {
        method: 'POST',
        body: JSON.stringify(mapStationToDB(station))
      });
    } catch (e: any) {
      console.error('Unexpected error adding station:', e.message || e);
    }
  },

  updateStation: async (station: ExtendedStation): Promise<void> => {
    try {
      await apiFetch(`/logistics/stations/${station.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapStationToDB(station))
      });
    } catch (e: any) {
      console.error('Unexpected error updating station:', e.message || e);
    }
  },

  deleteStation: async (id: string): Promise<void> => {
    try {
      await apiFetch(`/logistics/stations/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error('Unexpected error deleting station:', e.message || e);
      throw e;
    }
  }
};
