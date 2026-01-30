import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getMembers = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const searchQuery = req.query.search as string || '';

    try {
        let query = supabase.from('members').select('*', { count: 'exact' });

        if (searchQuery) {
            const tokens = searchQuery.split(/\s+/).filter(Boolean);
            tokens.forEach(token => {
                const tokenClean = token.replace(/\D/g, '');
                if (tokenClean.length > 0) {
                    query = query.or(`name.ilike.%${token}%,phone.ilike.%${tokenClean}%`);
                } else {
                    query = query.or(`name.ilike.%${token}%`);
                }
            });
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await query
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ data: data || [], count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addMember = async (req: Request, res: Response) => {
    try {
        console.log('[ADD MEMBER] Payload:', JSON.stringify(req.body));

        const { error } = await supabase.from('members').insert([req.body]);
        if (error) {
            console.error('[ADD MEMBER ERROR]', error);
            throw error;
        }
        res.status(201).json({ message: 'Member added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateMember = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('members').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Member updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteMember = async (req: Request, res: Response) => {
    const { ids } = req.body; // Expecting array of IDs
    try {
        const { error } = await supabase.from('members').delete().in('id', ids);
        if (error) throw error;
        res.json({ message: 'Members deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const checkInMember = async (req: Request, res: Response) => {
    const { memberId, serviceId } = req.body;
    try {
        // 1. Check if already checked in
        const { data: existing } = await supabase
            .from('service_attendance')
            .select('id')
            .eq('member_id', memberId)
            .eq('service_id', serviceId)
            .single();

        if (existing) {
            return res.json({ message: 'Already checked in' });
        }

        // 2. Insert Attendance Record
        const { error } = await supabase
            .from('service_attendance')
            .insert([{
                member_id: memberId,
                service_id: serviceId,
                check_in_time: new Date().toISOString()
            }]);

        if (error) throw error;

        // 3. Update Check In Time
        await supabase.from('members').update({ check_in_time: new Date().toLocaleTimeString() }).eq('id', memberId); // Note: DB field is check_in_time? Frontend mapped it checkInTime. DB likely snake_case. 
        // Checking frontend mapping: mapMemberToDB uses check_in_time. 

        res.json({ message: 'Checked in successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getServiceStats = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const serviceDate = req.query.date as string;

    try {
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', serviceId);

        if (attError) throw attError;
        const memberIds = attendance?.map(a => a.member_id) || [];

        if (memberIds.length === 0) {
            return res.json({ total: 0, firstTimers: 0, memberIds: [] });
        }

        const { data: members, error: memError } = await supabase
            .from('members')
            .select('id, joined_date, category')
            .in('id', memberIds);

        if (memError) throw memError;

        const firstTimerCount = (members || []).filter(m => m.category === 'First Timer').length;

        const validMemberIds = members?.map(m => m.id) || [];

        res.json({
            total: members?.length || 0,
            firstTimers: firstTimerCount,
            memberIds: validMemberIds
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const getMemberDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Fetch Member Profile
        const { data: member, error: memError } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();

        if (memError || !member) throw new Error("Member not found");

        // 2. Fetch Attendance
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('service_id, check_in_time')
            .eq('member_id', id)
            .order('check_in_time', { ascending: false });

        if (attError) throw attError;

        const attendedServiceIds = attendance?.map(a => a.service_id) || [];

        let history: any[] = [];
        if (attendedServiceIds.length > 0) {
            const { data: events } = await supabase
                .from('ministry_events')
                .select('id, title, date')
                .in('id', attendedServiceIds);

            history = (attendance || []).map(a => {
                const evt = events?.find(e => e.id === a.service_id);
                return {
                    serviceId: a.service_id,
                    date: evt?.date || new Date(a.check_in_time).toISOString().split('T')[0],
                    title: evt?.title || 'Unknown Service',
                    checkInTime: new Date(a.check_in_time).toLocaleTimeString()
                };
            });
        }

        // 3. Expected Services
        const joinedDate = member.joined_date || new Date().toISOString();
        const { count: totalServices } = await supabase
            .from('ministry_events')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'Service')
            .gte('date', joinedDate)
            .lte('date', new Date().toISOString().split('T')[0]);

        res.json({
            member: member,
            attendedCount: attendedServiceIds.length,
            totalServices: totalServices || 0,
            history: history
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const searchMembersWithStatus = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const queryStr = req.query.query as string || '';

    try {
        let queryBuilder = supabase.from('members').select('*');
        if (queryStr) {
            const tokens = queryStr.split(/\s+/).filter(Boolean);
            tokens.forEach(token => {
                const tokenClean = token.replace(/\D/g, '');
                if (tokenClean.length > 0) {
                    queryBuilder = queryBuilder.or(`name.ilike.%${token}%,phone.ilike.%${tokenClean}%`);
                } else {
                    queryBuilder = queryBuilder.or(`name.ilike.%${token}%`);
                }
            });
        }

        const { data: members, error: memError } = await queryBuilder.limit(20);
        if (memError || !members) return res.json([]);

        const memberIds = members.map(m => m.id);

        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', serviceId)
            .in('member_id', memberIds);

        if (attError) throw attError;

        const attendedMemberIds = new Set(attendance?.map(a => a.member_id));

        // Return raw DB members + status flag, let frontend map it if needed, or map here.
        // Frontend expects Member objects. Let's return objects with status field populated.
        const result = members.map(m => ({
            ...m,
            status: attendedMemberIds.has(m.id) ? 'Checked In' : 'Absent'
        }));

        res.json(result);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
