import { Member, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import { safeFetch } from '../services/safeFetch';

export const mapMemberFromDB = (m: any): Member => ({
  id: m.id,
  name: m.name,
  category: m.category,
  phone: m.phone,
  status: m.status,
  checkInTime: m.check_in_time,
  gender: m.gender,
  residency: m.residency,
  bornAgain: m.born_again,
  joinedDate: m.joined_date,
  attendedServiceIds: m.attended_service_ids || [],
  firstTimerServiceId: m.first_timer_service_id,
  createdAt: m.created_at,
  occupation: m.occupation,
  placeOfWork: m.place_of_work,
  email: m.email,
  isPhanerooMember: m.is_phaneroo_member,
  referralSource: m.referral_source,
  // Passenger-specific flags returned by getEventAttendees for ministry events
  isFirstTime: m.isFirstTime ?? false,
  soulWon: m.soulWon ?? false,
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
  attended_service_ids: m.attendedServiceIds,
  currentServiceId: m.currentServiceId,
  occupation: m.occupation,
  place_of_work: m.placeOfWork,
  email: m.email,
  is_phaneroo_member: m.isPhanerooMember,
  referral_source: m.referralSource,
});

const MEMBER_CACHE = new Map<string, { timestamp: number, data: ServiceResponse<Member[]> }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10;

export const MemberStore = {
  invalidateCache: () => {
    MEMBER_CACHE.clear();
  },

  getMembers: async (page: number = 1, pageSize: number = 50, searchQuery: string = '', signal?: AbortSignal): Promise<ServiceResponse<Member[]>> => {
    const trimmedQuery = searchQuery.trim();
    const cacheKey = `${page}-${pageSize}-${trimmedQuery}`;
    const now = Date.now();

    // 1. Cache Strategy: Only cache empty searches (browse view) and enforce TTL
    if (!trimmedQuery && MEMBER_CACHE.has(cacheKey)) {
      const cached = MEMBER_CACHE.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      MEMBER_CACHE.delete(cacheKey);
    }

    const response = await safeFetch(
      () => apiFetch(`/members?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(trimmedQuery)}`, { signal }),
      'Failed to load members list.',
      (raw: any) => {
        if (Array.isArray(raw)) return raw.map(mapMemberFromDB);
        if (raw && Array.isArray(raw.data)) return raw.data.map(mapMemberFromDB);
        return [];
      },
      signal
    );

    // 2. Cache Set Strategy for browse views
    if (response.status === 'success' && !signal?.aborted && !trimmedQuery) {
      if (MEMBER_CACHE.size >= MAX_CACHE_SIZE) {
        const firstKey = MEMBER_CACHE.keys().next().value;
        if (firstKey) MEMBER_CACHE.delete(firstKey);
      }
      MEMBER_CACHE.set(cacheKey, { timestamp: Date.now(), data: response });
    }

    return response;
  },

  getAll: async (): Promise<ServiceResponse<Member[]>> => {
    return MemberStore.getMembers(1, 100);
  },

  add: async (member: Member): Promise<any> => {
    const isValidUUID = (id?: string) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const finalId = isValidUUID(member.id) ? member.id! : uuidv4();
    const memberWithId = { ...member, id: finalId };
    try {
      const result = await apiFetch('/members', {
        method: 'POST',
        body: JSON.stringify(mapMemberToDB(memberWithId))
      });
      MemberStore.invalidateCache();
      return result;
    } catch (e: any) {
      console.error('Error adding member:', e);
      throw e;
    }
  },

  getById: async (id: string): Promise<Member | null> => {
    try {
      const data = await apiFetch(`/members/${id}`);
      if (data) {
        return mapMemberFromDB(data);
      }
      return null;
    } catch (e) {
      console.warn('Failed to fetch member by ID:', e);
      return null;
    }
  },

  getManyByIds: async (ids: string[]): Promise<ServiceResponse<Member[]>> => {
    if (!ids || ids.length === 0) return { status: 'success', data: [], count: 0 };
    return safeFetch(
      () => apiFetch('/members/batch', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }),
      'Failed to fetch members by IDs',
      (data: any[]) => data ? data.map(mapMemberFromDB) : []
    );
  },

  update: async (member: Member): Promise<void> => {
    try {
      await apiFetch(`/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapMemberToDB(member))
      });
      MemberStore.invalidateCache();
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
      MemberStore.invalidateCache();
    } catch (e) {
      console.error('Error deleting members:', e);
    }
  },

  checkIn: async (memberId: string, serviceId: string | string[]): Promise<any> => {
    try {
      return await apiFetch('/members/check-in', {
        method: 'POST',
        body: JSON.stringify({ memberId, serviceId })
      });
    } catch (e: any) {
      console.error('Check-in failed:', e.message);
      throw e;
    }
  },

  undoCheckIn: async (memberId: string, serviceId: string): Promise<any> => {
    try {
      return await apiFetch('/members/uncheck-in', {
        method: 'POST',
        body: JSON.stringify({ memberId, serviceId })
      });
    } catch (e: any) {
      console.error('Undo Check-in failed:', e.message);
      throw e;
    }
  },

  getServiceStats: async (serviceId: string, serviceDate: string): Promise<{ total: number, firstTimers: number, memberIds: string[] }> => {
    try {
      return await apiFetch(`/members/stats/${serviceId}?date=${serviceDate}`);
    } catch (e: any) {
      console.error('Failed to get service stats:', e.message || e);
      throw e;
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
  },

  getAttendees: async (serviceId: string): Promise<Member[]> => {
    try {
      const data = await apiFetch(`/members/attendees/${serviceId}`);
      return data.map(mapMemberFromDB);
    } catch (e) {
      console.error("Error fetching attendees:", e);
      return [];
    }
  },

  searchMembersByResidency: async (residencySearch: string): Promise<Member[]> => {
    try {
      if (!residencySearch) return [];
      const data = await apiFetch(`/members/search-by-residency?residency=${encodeURIComponent(residencySearch)}`);
      return data ? data.map(mapMemberFromDB) : [];
    } catch (e) {
      console.error("Error searching members by residency:", e);
      return [];
    }
  },

  bulkUpdateResidency: async (memberIds: string[], residencyName: string): Promise<void> => {
    try {
      if (!memberIds.length || !residencyName) return;
      await apiFetch('/members/bulk-update-residency', {
        method: 'POST',
        body: JSON.stringify({ memberIds, residencyName })
      });
    } catch (e) {
      console.error('Error bulk updating residency:', e);
      throw e;
    }
  },

  getFirstTimers: async (): Promise<{ services: any[], events: any[] }> => {
    try {
      return await apiFetch(`/members/lists/first-timers`);
    } catch (e: any) {
      console.error('Error fetching first timers:', e);
      return { services: [], events: [] };
    }
  }
};
