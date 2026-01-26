
import { Child } from '../types';
import { apiFetch } from '../services/api';
import { MOCK_CHILDREN } from '../constants';

const mapChildFromDB = (c: any): Child => ({
  id: c.id,
  name: c.name,
  parentName: c.parent_name,
  parentContact: c.parent_contact,
  age: c.age,
  gender: c.gender,
  category: c.category || 'Member', // Default to Member
  residence: c.residence,
  status: c.status || 'Absent',
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
  category: c.category,
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
      const data = await apiFetch('/children');
      return data.map(mapChildFromDB);
    } catch (e: any) {
      console.error('Unexpected error fetching children:', e.message || e);
      return MOCK_CHILDREN;
    }
  },

  add: async (child: Child): Promise<void> => {
    try {
      await apiFetch('/children', {
        method: 'POST',
        body: JSON.stringify(mapChildToDB(child))
      });
    } catch (e: any) {
      console.error('Unexpected error adding child:', e.message || e);
    }
  },

  bulkAdd: async (children: Child[]): Promise<void> => {
    try {
      const mappedChildren = children.map(mapChildToDB);
      await apiFetch('/children/bulk', {
        method: 'POST',
        body: JSON.stringify({ children: mappedChildren })
      });
    } catch (e: any) {
      console.error('Unexpected error bulk adding children:', e.message || e);
    }
  },

  update: async (child: Child): Promise<void> => {
    try {
      await apiFetch(`/children/${child.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapChildToDB(child))
      });
    } catch (e: any) {
      console.error('Unexpected error updating child:', e.message || e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiFetch(`/children/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.error('Unexpected error deleting child:', e.message || e);
    }
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    try {
      await apiFetch('/children/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
    } catch (e: any) {
      console.error('Unexpected error bulk deleting children:', e.message || e);
    }
  },

  getServiceAttendance: async (serviceId: string): Promise<number> => {
    try {
      const { count } = await apiFetch(`/children/attendance/${serviceId}`);
      return count || 0;
    } catch (e) {
      console.error('Unexpected error fetching child attendance:', e);
      return 0;
    }
  }
};
