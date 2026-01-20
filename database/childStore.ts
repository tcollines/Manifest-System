
import { Child } from '../types';
import { supabase } from '../services/supabaseClient';
import { MOCK_CHILDREN } from '../constants';

const mapChildFromDB = (c: any): Child => ({
  id: c.id,
  name: c.name,
  parentName: c.parent_name,
  parentContact: c.parent_contact,
  age: c.age,
  gender: c.gender,
  residence: c.residence,
  status: 'Absent', // Default to Absent for context-aware check-ins
  checkInTime: c.check_in_time,
  checkOutTime: c.check_out_time,
  joinedDate: c.joined_date,
  attendedServiceIds: c.attended_service_ids || []
});

const mapChildToDB = (c: Child) => ({
  id: c.id,
  name: c.name,
  parent_name: c.parentName,
  parent_contact: c.parentContact,
  age: c.age,
  gender: c.gender,
  residence: c.residence,
  status: c.status,
  check_in_time: c.checkInTime,
  check_out_time: c.checkOutTime,
  joined_date: c.joinedDate,
  attended_service_ids: c.attendedServiceIds
});

export const ChildStore = {
  getAll: async (): Promise<Child[]> => {
    try {
      const { data, error } = await supabase.from('children').select('*');
      if (error) {
        console.error('Error fetching children:', error.message);
        return MOCK_CHILDREN;
      }
      return data.map(mapChildFromDB);
    } catch (e: any) {
      console.error('Unexpected error fetching children:', e.message || e);
      return MOCK_CHILDREN;
    }
  },



  add: async (child: Child): Promise<void> => {
    try {
      const { error } = await supabase.from('children').insert([mapChildToDB(child)]);
      if (error) console.error('Error adding child:', error.message);
    } catch (e: any) {
      console.error('Unexpected error adding child:', e.message || e);
    }
  },

  bulkAdd: async (children: Child[]): Promise<void> => {
    try {
      const mappedChildren = children.map(mapChildToDB);
      const { error } = await supabase.from('children').insert(mappedChildren);
      if (error) console.error('Error bulk adding children:', error.message);
    } catch (e: any) {
      console.error('Unexpected error bulk adding children:', e.message || e);
    }
  },

  update: async (child: Child): Promise<void> => {
    try {
      const { error } = await supabase.from('children').update(mapChildToDB(child)).eq('id', child.id);
      if (error) console.error('Error updating child:', error.message);
    } catch (e: any) {
      console.error('Unexpected error updating child:', e.message || e);
    }
  }
};
