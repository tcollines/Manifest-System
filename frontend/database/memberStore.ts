
import { Member } from '../types';
import { apiFetch } from '../services/api';
import { MOCK_MEMBERS } from '../constants';

const mapMemberFromDB = (m: any): Member => ({
  id: m.id,
  name: m.name,
  category: m.category,
  phone: m.phone,
  status: m.status, // API now returns status logic if requested
  checkInTime: m.check_in_time, // Keep eye on snake_case vs camelCase. 
  // Wait, the API `getMembers` returns raw DB, snake_case.
  // Frontend `mapMemberFromDB` expects these fields.
  // The API controller does NOT map keys.
  // So we need to match keys here.
  gender: m.gender,
  residency: m.residency,
  bornAgain: m.born_again,
  joinedDate: m.joined_date,
  attendedServiceIds: m.attended_service_ids || []
});

const mapMemberToDB = (m: Member) => ({
  id: m.id,
  name: m.name,
  category: m.category,
  phone: m.phone,
  status: m.status,
  check_in_time: m.checkInTime,
  gender: m.gender,
  residency: m.residency,
  born_again: m.bornAgain,
  joined_date: m.joinedDate,
  attended_service_ids: m.attendedServiceIds
});

export const MemberStore = {
  getMembers: async (page: number = 1, pageSize: number = 50, searchQuery: string = ''): Promise<{ data: Member[], count: number }> => {
    try {
      const { data, count } = await apiFetch(`/members?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);

      return {
        data: data ? data.map(mapMemberFromDB) : [],
        count: count || 0
      };
    } catch (e) {
      console.warn('Failed to fetch members, using mock data.', e);
      return { data: MOCK_MEMBERS, count: MOCK_MEMBERS.length };
    }
  },

  getAll: async (): Promise<Member[]> => {
    const result = await MemberStore.getMembers(1, 100);
    return result.data;
  },

  add: async (member: Member): Promise<void> => {
    try {
      await apiFetch('/members', {
        method: 'POST',
        body: JSON.stringify(mapMemberToDB(member))
      });
    } catch (e) {
      console.error('Error adding member:', e);
    }
  },

  getById: async (id: string): Promise<Member | null> => {
    try {
      const data = await apiFetch(`/members?id=eq.${id}&select=*`);
      if (data && data.length > 0) {
        return mapMemberFromDB(data[0]);
      }
      return null;
    } catch (e) {
      console.warn('Failed to fetch member by ID:', e);
      return null;
    }
  },

  update: async (member: Member): Promise<void> => {
    try {
      await apiFetch(`/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapMemberToDB(member))
      });
    } catch (e) {
      console.error('Error updating member:', e);
    }
  },

  delete: async (ids: string[]): Promise<void> => {
    try {
      await apiFetch('/members/delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
    } catch (e) {
      console.error('Error deleting members:', e);
    }
  },

  checkIn: async (memberId: string, serviceId: string): Promise<void> => {
    try {
      await apiFetch('/members/check-in', {
        method: 'POST',
        body: JSON.stringify({ memberId, serviceId })
      });
    } catch (e: any) {
      console.error('Check-in failed:', e.message);
      throw e;
    }
  },

  getServiceStats: async (serviceId: string, serviceDate: string): Promise<{ total: number, firstTimers: number, memberIds: string[] }> => {
    try {
      return await apiFetch(`/members/stats/${serviceId}?date=${serviceDate}`);
    } catch (e: any) {
      console.error('Failed to get service stats:', e.message || e);
      return { total: 0, firstTimers: 0, memberIds: [] };
    }
  },

  getMemberDetails: async (memberId: string): Promise<{ member: Member, attendedCount: number, totalServices: number, history: any[] }> => {
    try {
      const data = await apiFetch(`/members/${memberId}/details`);
      return {
        ...data,
        member: mapMemberFromDB(data.member)
      };
    } catch (e: any) {
      console.error("Error fetching member details:", e);
      throw e;
    }
  },

  searchMembersWithStatus: async (serviceId: string, query: string): Promise<Member[]> => {
    try {
      const data = await apiFetch(`/members/search-status/${serviceId}?query=${encodeURIComponent(query)}`);
      return data.map(mapMemberFromDB);
    } catch (e) {
      console.error("Error searching members with status:", e);
      return [];
    }
  }
};
