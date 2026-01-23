
import { MinistryEvent } from '../types';
import { supabase } from '../services/supabaseClient';
import { MOCK_EVENTS } from '../constants';

const mapEventFromDB = (e: any): MinistryEvent => ({
  id: e.id,
  title: e.title,
  type: e.type,
  date: e.date,
  time: e.time,
  location: e.location,
  description: e.description,
  stats: e.stats || { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 }
});

const mapEventToDB = (e: MinistryEvent) => ({
  id: e.id,
  title: e.title,
  type: e.type,
  date: e.date,
  time: e.time,
  location: e.location,
  description: e.description,
  stats: e.stats
});

export const EventStore = {
  getAll: async (): Promise<MinistryEvent[]> => {
    try {
      const { data, error } = await supabase.from('ministry_events').select('*').order('date', { ascending: false });
      if (error) {
        console.warn('Error fetching events:', error.message);
        return [];
      }
      return data && data.length > 0 ? data.map(mapEventFromDB) : [];
    } catch (e) {
      console.warn('Failed to fetch events:', e);
      return [];
    }
  },

  add: async (event: MinistryEvent): Promise<void> => {
    const { error } = await supabase.from('ministry_events').insert([mapEventToDB(event)]);
    if (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  },

  update: async (event: MinistryEvent): Promise<void> => {
    const { error } = await supabase.from('ministry_events').update(mapEventToDB(event)).eq('id', event.id);
    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      // 1. Delete Logistics (Stations -> Vehicles -> Passengers)
      // We need to fetch stations for this event first.
      // Assuming LogisticsStore has a way to get stations by event or we query directly.
      const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', id);

      if (stations && stations.length > 0) {
        // We import LogisticsStore dynamically to avoid circular dependency issues if any, 
        // or just use the raw logic if cleaner. 
        // Using raw logic here to be safe and atomic.

        for (const station of stations) {
          // 1.1 Detach Users
          await supabase.from('users').update({ station_id: null }).eq('station_id', station.id);

          // 1.2 Get Vehicles
          const { data: vehicles } = await supabase.from('vehicles').select('id').eq('station_id', station.id);
          if (vehicles && vehicles.length > 0) {
            const vIds = vehicles.map(v => v.id);
            // 1.3 Delete Passengers
            await supabase.from('passengers').delete().in('vehicle_id', vIds);
            // 1.4 Delete Vehicles
            await supabase.from('vehicles').delete().in('id', vIds);
          }
          // 1.5 Delete Station
          await supabase.from('pickup_stations').delete().eq('id', station.id);
        }
      }

      // 2. Remove Attendance from Members
      const { data: members } = await supabase.from('members').select('id, attended_service_ids').contains('attended_service_ids', [id]);
      if (members && members.length > 0) {
        for (const m of members) {
          const newIds = (m.attended_service_ids || []).filter((i: string) => i !== id);
          await supabase.from('members').update({ attended_service_ids: newIds }).eq('id', m.id);
        }
      }

      // 3. Remove Attendance from Children
      const { data: children } = await supabase.from('children').select('id, attended_service_ids').contains('attended_service_ids', [id]);
      if (children && children.length > 0) {
        for (const c of children) {
          const newIds = (c.attended_service_ids || []).filter((i: string) => i !== id);
          await supabase.from('children').update({ attended_service_ids: newIds }).eq('id', c.id);
        }
      }

      // 4. Remove Attendance from Personal Vehicles
      const { data: pCars } = await supabase.from('personal_vehicles').select('id, attended_service_ids').contains('attended_service_ids', [id]);
      if (pCars && pCars.length > 0) {
        for (const c of pCars) {
          const newIds = (c.attended_service_ids || []).filter((i: string) => i !== id);
          await supabase.from('personal_vehicles').update({ attended_service_ids: newIds }).eq('id', c.id);
        }
      }

      // 5. Delete the Event itself
      const { error } = await supabase.from('ministry_events').delete().eq('id', id);
      if (error) throw error;

    } catch (e: any) {
      console.error('Error deleting event:', e.message || e);
      throw e;
    }
  }
};
