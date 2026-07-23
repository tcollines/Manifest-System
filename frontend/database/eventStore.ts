
import { MinistryEvent, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

export const mapEventFromDB = (e: any): MinistryEvent => ({
  id: e.id,
  title: e.title,
  type: e.type,
  date: e.date,
  time: e.time,
  location: e.location,
  description: e.description,
  stats: e.stats || { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 },
  serviceNumber: e.service_number,
  createdAt: e.created_at,
  lat: e.latitude ? parseFloat(e.latitude) : undefined,
  lng: e.longitude ? parseFloat(e.longitude) : undefined,
  locationName: e.location_name
});

const mapEventToDB = (e: MinistryEvent) => ({
  id: e.id,
  title: e.title,
  type: e.type,
  date: e.date,
  time: e.time,
  location: e.location,
  description: e.description,
  stats: e.stats,
  service_number: e.serviceNumber,
  latitude: e.lat,
  longitude: e.lng,
  location_name: e.locationName
});

export const EventStore = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<ServiceResponse<MinistryEvent[]>> => {
    return safeFetch(
      () => {
        // Build Query String
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);

        return apiFetch(`/events?${queryParams.toString()}`);
      },
      'Failed to fetch events',
      (data: any[]) => {
        // safeFetch already unwraps response.data into 'data' argument
        return Array.isArray(data) ? data.map(mapEventFromDB) : [];
      }
    );
  },

  add: async (event: MinistryEvent): Promise<MinistryEvent> => {
    try {
      const data = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(mapEventToDB(event))
      });
      return mapEventFromDB(data);
    } catch (error: any) {
      console.error('Error adding event:', error);
      throw error;
    }
  },

  update: async (event: MinistryEvent): Promise<void> => {
    try {
      await apiFetch(`/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapEventToDB(event))
      });
    } catch (error: any) {
      if (!error.message?.includes('Unauthorized')) {
        console.error('Error updating event:', error);
      }
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiFetch(`/events/${id}`, {
        method: 'DELETE'
      });
    } catch (e: any) {
      console.error('Error deleting event:', e.message || e);
      throw e;
    }
  },

  releaseUsers: async (id: string): Promise<void> => {
    try {
      await apiFetch(`/events/${id}/cleanup-users`, {
        method: 'POST'
      });
    } catch (e: any) {
      console.error('Error releasing event users:', e.message || e);
      throw e;
    }
  },

  getHighlights: async (id: string): Promise<any> => {
    try {
      return await apiFetch(`/events/${id}/highlights`);
    } catch (e: any) {
      console.error('Error fetching event highlights:', e.message || e);
      return null;
    }
  },

  getServiceSnapshot: async (id: string): Promise<{
    serviceId: string;
    checkedInMemberIds?: string[];
    checkedInMembers?: Array<{ id: string; name: string; phone: string }>;
    firstTimerMemberIds?: string[];
    memberAttendanceCount?: number;
    memberIds: string[];
    total: number;
    manualChildrenCount: number;
    firstTimers: number;
    soulIds: string[];
    soulsWon: number;
    generatedAt: string;
  } | null> => {
    try {
      return await apiFetch(`/events/${id}/snapshot`);
    } catch (e: any) {
      console.error('Error fetching service snapshot:', e.message || e);
      return null;
    }
  }
};
