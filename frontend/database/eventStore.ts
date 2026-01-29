
import { MinistryEvent } from '../types';
import { apiFetch } from '../services/api';

const mapEventFromDB = (e: any): MinistryEvent => ({
  id: e.id,
  title: e.title,
  type: e.type,
  date: e.date,
  time: e.time,
  location: e.location,
  description: e.description,
  stats: e.stats || { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 },
  serviceNumber: e.service_number
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
  service_number: e.serviceNumber
});

export const EventStore = {
  getAll: async (): Promise<MinistryEvent[]> => {
    try {
      const data = await apiFetch('/events');
      return data && data.length > 0 ? data.map(mapEventFromDB) : [];
    } catch (e) {
      console.warn('Failed to fetch events:', e);
      return [];
    }
  },

  add: async (event: MinistryEvent): Promise<void> => {
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(mapEventToDB(event))
      });
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
      console.error('Error updating event:', error);
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
  }
};
