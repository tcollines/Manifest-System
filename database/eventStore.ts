
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
        console.warn('Error fetching events, using mock data:', error.message);
        return MOCK_EVENTS;
      }
      return data.length > 0 ? data.map(mapEventFromDB) : MOCK_EVENTS;
    } catch (e) {
      console.warn('Failed to fetch events, using mock data.');
      return MOCK_EVENTS;
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
  }
};
