
import { Member } from '../types';
import { supabase } from '../services/supabaseClient';
import { MOCK_MEMBERS } from '../constants';

const mapMemberFromDB = (m: any): Member => ({
  id: m.id,
  name: m.name,
  category: m.category,
  phone: m.phone,
  status: 'Absent', // Always default to Absent when fetching generic lists. UI must calculate 'Checked In' based on context (Service ID).
  checkInTime: m.check_in_time,
  gender: m.gender,
  residency: m.residency,
  bornAgain: m.born_again,
  joinedDate: m.joined_date,
  attendedServiceIds: m.attended_service_ids || []
  // Fields removed as they are not in the provided SQL schema:
  // email, occupation, placeOfWork, isPhanerooMember, referralSource
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
  // Fields removed as they are not in the provided SQL schema:
  // email, occupation, place_of_work, is_phaneroo_member, referral_source
});

export const MemberStore = {
  getMembers: async (page: number = 1, pageSize: number = 50, searchQuery: string = ''): Promise<{ data: Member[], count: number }> => {
    try {
      let query = supabase
        .from('members')
        .select('*', { count: 'exact' });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching members:', error.message);
        return { data: MOCK_MEMBERS, count: MOCK_MEMBERS.length };
      }

      return {
        data: data ? data.map(mapMemberFromDB) : [],
        count: count || 0
      };
    } catch (e) {
      console.warn('Failed to fetch members, using mock data.');
      return { data: MOCK_MEMBERS, count: MOCK_MEMBERS.length };
    }
  },

  getAll: async (): Promise<Member[]> => {
    // Deprecated: keeping for backward compatibility but limited
    const result = await MemberStore.getMembers(1, 100);
    return result.data;
  },

  add: async (member: Member): Promise<void> => {
    const { error } = await supabase.from('members').insert([mapMemberToDB(member)]);
    if (error) console.error('Error adding member:', error);
  },

  update: async (member: Member): Promise<void> => {
    const { error } = await supabase.from('members').update(mapMemberToDB(member)).eq('id', member.id);
    if (error) console.error('Error updating member:', error);
  },

  delete: async (ids: string[]): Promise<void> => {
    const { error } = await supabase.from('members').delete().in('id', ids);
    if (error) console.error('Error deleting members:', error);
  },

  checkIn: async (memberId: string, serviceId: string): Promise<void> => {
    try {
      // 1. Check if already checked in
      const { data: existing } = await supabase
        .from('service_attendance')
        .select('id')
        .eq('member_id', memberId)
        .eq('service_id', serviceId)
        .single();

      if (existing) return; // Already checked in

      // 2. Insert Attendance Record
      const { error } = await supabase
        .from('service_attendance')
        .insert([{
          member_id: memberId,
          service_id: serviceId,
          check_in_time: new Date().toISOString()
        }]);

      if (error) throw error;

      // 3. Update Check In Time (Last Seen) only. We DO NOT set 'status' to 'Checked In' persistently because status is service-specific.
      await supabase.from('members').update({ checkInTime: new Date().toLocaleTimeString() }).eq('id', memberId);

    } catch (e: any) {
      console.error('Check-in failed:', e.message);
      throw e;
    }
  },

  getServiceStats: async (serviceId: string, serviceDate: string): Promise<{ total: number, firstTimers: number, memberIds: string[] }> => {
    try {
      // 1. Get all attendance records for this service
      const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId);

      if (attError || !attendance) {
        console.error('Error fetching attendance:', attError?.message);
        return { total: 0, firstTimers: 0, memberIds: [] };
      }

      const memberIds = attendance.map(a => a.member_id);

      // 2. Get Member Details to check Joined Date vs Service Date
      if (memberIds.length === 0) return { total: 0, firstTimers: 0, memberIds: [] };

      const { data: members, error: memError } = await supabase
        .from('members')
        .select('id, joined_date, category')
        .in('id', memberIds);

      if (memError || !members) {
        return { total: attendance.length, firstTimers: 0, memberIds: memberIds };
      }

      // 3. Calculate "True" First Timers
      // A member is a First Timer for THIS service if their joined_date matches the serviceDate.
      // Alternatively, we can rely on the 'category' field if the user manually set it to "First Timer" during registration.
      // The user requested: "if the joined data is equal to the service date, that should be taken as a first timer"

      const firstTimerCount = members.filter(m => m.joined_date === serviceDate).length;

      return {
        total: attendance.length,
        firstTimers: firstTimerCount,
        memberIds: memberIds
      };

    } catch (e: any) {
      console.error('Failed to get service stats:', e.message || e);
      return { total: 0, firstTimers: 0, memberIds: [] };
    }
  },

  getMemberDetails: async (memberId: string): Promise<{ member: Member, attendedCount: number, totalServices: number, history: any[] }> => {
    try {
      // 1. Fetch Member Profile
      const { data: member, error: memError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memError || !member) throw new Error("Member not found");

      // 2. Fetch Attendance History (Dates & Service Names)
      // We join with the services table (ministry_events) manually since we store service_id
      const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('service_id, check_in_time')
        .eq('member_id', memberId)
        .order('check_in_time', { ascending: false });

      if (attError) throw attError;

      const attendedServiceIds = attendance.map(a => a.service_id);

      // Fetch names of attended services
      let history = [];
      if (attendedServiceIds.length > 0) {
        const { data: events } = await supabase
          .from('ministry_events')
          .select('id, title, date')
          .in('id', attendedServiceIds);

        // Merge info
        history = attendance.map(a => {
          const evt = events?.find(e => e.id === a.service_id);
          return {
            serviceId: a.service_id,
            date: evt?.date || new Date(a.check_in_time).toISOString().split('T')[0],
            title: evt?.title || 'Unknown Service',
            checkInTime: new Date(a.check_in_time).toLocaleTimeString()
          };
        });
      }

      // 3. Calculate "Expected" Services (Total Services held SINCE they joined)
      const joinedDate = member.joined_date || new Date().toISOString();
      const { count: totalServices, error: countError } = await supabase
        .from('ministry_events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Service')
        .gte('date', joinedDate) // Only count services AFTER they joined
        .lte('date', new Date().toISOString().split('T')[0]); // Don't count future services

      return {
        member: mapMemberFromDB(member),
        attendedCount: attendedServiceIds.length,
        totalServices: totalServices || 0,
        history: history
      };

    } catch (e: any) {
      console.error("Error fetching member details:", e);
      throw e;
    }
  },

  searchMembersWithStatus: async (serviceId: string, query: string): Promise<Member[]> => {
    try {
      // 1. Search Members matching query (Global Search)
      const { data: members, error: memError } = await supabase
        .from('members')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (memError || !members || members.length === 0) return [];

      const memberIds = members.map(m => m.id);

      // 2. Check Attendance for these members for the SPECIFIC service
      const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId)
        .in('member_id', memberIds);

      if (attError) {
        console.error("Error checking attendance status:", attError);
        // Return members with default status if check fails, or assume absent
        return members.map(mapMemberFromDB);
      }

      const attendedMemberIds = new Set(attendance?.map(a => a.member_id));

      // 3. Map members and set status dynamically
      return members.map(m => {
        const mapped = mapMemberFromDB(m);
        // Override status for this specific context
        mapped.status = attendedMemberIds.has(m.id) ? 'Checked In' : 'Absent';
        return mapped;
      });

    } catch (e) {
      console.error("Error searching members with status:", e);
      return [];
    }
  }
};
