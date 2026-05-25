
import { PickUpStation, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

export interface ExtendedStation extends PickUpStation {
  coordinatorName?: string;
  coordinatorContact?: string;
  coordinatorEmail?: string;
}

export const mapStationFromDB = (s: any): ExtendedStation => ({
  id: s.id,
  name: s.name,
  location: s.location,
  registeredAttendees: s.registered_attendees,
  vehicleStatus: s.vehicle_status,
  eventId: s.event_id,
  dataEntrantId: s.data_entrant_id,
  dataEntrantName: s.data_entrant_name,
  coordinatorName: s.coordinator_name,
  coordinatorContact: s.coordinator_contact,
  dataEntrantContact: s.data_entrant_contact,
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
  getStations: async (eventId?: string): Promise<ServiceResponse<ExtendedStation[]>> => {
    return safeFetch(
      () => {
        let url = '/logistics/stations';
        if (eventId) url += `?eventId=${eventId}`;
        return apiFetch(url);
      },
      'Failed to fetch stations',
      (data: any[]) => data ? data.map(mapStationFromDB) : []
    );
  },

  addStation: async (station: ExtendedStation): Promise<ServiceResponse<void>> => {
    return safeFetch(
      () => apiFetch('/logistics/stations', {
        method: 'POST',
        body: JSON.stringify(mapStationToDB(station))
      }),
      'Error adding station'
    );
  },

  updateStation: async (station: ExtendedStation): Promise<ServiceResponse<void>> => {
    return safeFetch(
      () => apiFetch(`/logistics/stations/${station.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapStationToDB(station))
      }),
      'Error updating station'
    );
  },

  deleteStation: async (id: string): Promise<ServiceResponse<void>> => {
    return safeFetch(
      () => apiFetch(`/logistics/stations/${id}`, { method: 'DELETE' }),
      'Error deleting station'
    );
  }
};
