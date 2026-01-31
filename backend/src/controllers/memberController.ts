import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getMembers = async (req: Request, res: Response) => {
    // DEBUG LOGGING
    console.log(`[GET MEMBERS] Search: '${req.query.search}', Page: ${req.query.page}`);

    const page = parseInt(req.query.page as string) || 1;
    // Hard limit pageSize to 50 to prevent massive payloads
    const requestedSize = parseInt(req.query.pageSize as string) || 50;
    const pageSize = Math.min(requestedSize, 50);
    const searchQuery = req.query.search as string || '';

    try {
        // Select only necessary columns for check-in/list view
        let query = supabase.from('members').select('id, name, category, phone, status, check_in_time, gender, residency, born_again, joined_date', { count: 'exact' });

        if (searchQuery) {
            const tokens = searchQuery.split(/\s+/).filter(Boolean);
            tokens.forEach(token => {
                const tokenClean = token.replace(/\D/g, '');
                if (tokenClean.length > 0) {
                    // Use ILIKE with wildcards - supported by pg_trgm GIN index
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

        if (error) {
            console.error('[GET MEMBERS ERROR] Query failed:', error);
            throw error;
        }

        res.json({ data: data || [], count: count || 0 });
    } catch (error: any) {
        console.error('[GET MEMBERS EXCEPTION]', error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllMembers = async (req: Request, res: Response) => {
    try {
        // Fetch ALL members using chunked strategy to bypass 1000-row limit
        let allMembers: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
                .from('members')
                .select('id, name, category, phone, gender, residency, born_again, joined_date, status, check_in_time')
                .order('name', { ascending: true })
                .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                allMembers = allMembers.concat(data);
                // If we got fewer than pageSize, we've reached the end
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        res.json(allMembers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addMember = async (req: Request, res: Response) => {
    try {
        // console.log('[ADD MEMBER RPC] Payload:', JSON.stringify(req.body));
        const m = req.body;

        // 1. Safeguard: Normalize attended_service_ids to array
        const rawIds = m.attended_service_ids || [];
        const safeServiceIds = Array.isArray(rawIds) ? rawIds : [rawIds];

        const { data, error } = await supabase.rpc('submit_member_entry', {
            _id: m.id || null,
            _name: m.name || null,
            _category: m.category || null,
            _phone: m.phone || null,
            _status: m.status || null,
            _check_in_time: m.check_in_time || m.checkInTime || null,
            _gender: m.gender || null,
            _residency: m.residency || null,
            _born_again: m.born_again || null,
            _joined_date: m.joined_date || m.joinedDate || new Date().toISOString(),
            _attended_service_ids: safeServiceIds || [],
            _current_service_id: m.currentServiceId || null // Pass context for first-timer logic
        });

        if (error) {
            console.error('[ADD MEMBER RPC ERROR]', error);
            throw error;
        }

        // 2. Explicit Behavior: Log ignored IDs
        if (data?._meta?.ignored_service_ids?.length > 0) {
            console.warn('[ADD MEMBER WARNING] Ignored Temporary/Invalid IDs:', data._meta.ignored_service_ids);
        }

        console.log('[ADD MEMBER RPC SUCCESS] Result:', data);

        // RPC returns the record (inserted or existing).
        res.status(201).json(data);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateMember = async (req: Request, res: Response) => {
    const { id } = req.params;
    const m = req.body;

    // Map frontend CamelCase to DB snake_case
    const updates: any = {};
    if (m.name !== undefined) updates.name = m.name;
    if (m.category !== undefined) updates.category = m.category;
    if (m.phone !== undefined) updates.phone = m.phone;
    if (m.status !== undefined) updates.status = m.status;
    if (m.checkInTime !== undefined) updates.check_in_time = m.checkInTime;
    if (m.gender !== undefined) updates.gender = m.gender;
    if (m.residency !== undefined) updates.residency = m.residency;
    if (m.bornAgain !== undefined) updates.born_again = m.bornAgain;
    if (m.joinedDate !== undefined) updates.joined_date = m.joinedDate;
    if (m.placeOfWork !== undefined) updates.place_of_work = m.placeOfWork; // Add if missing
    if (m.occupation !== undefined) updates.occupation = m.occupation; // Add if missing
    if (m.email !== undefined) updates.email = m.email; // Add if missing
    // Add other fields as necessary based on schema
    if (m.attendedServiceIds !== undefined) updates.attended_service_ids = m.attendedServiceIds;


    try {
        const { error } = await supabase.from('members').update(updates).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Member updated', updates });
    } catch (error: any) {
        console.error('Update Error:', error);
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
        // Normalize serviceId to array
        const serviceIds = Array.isArray(serviceId) ? serviceId : [serviceId];

        // 0. Safeguard: Analyze IDs
        const tempIds = serviceIds.filter((id: string) => String(id).startsWith('evt-'));
        const validIds = serviceIds.filter((id: string) => !String(id).startsWith('evt-'));

        // Rule 1: If ALL selected service IDs start with evt-: Block check-in
        if (validIds.length === 0 && tempIds.length > 0) {
            return res.status(400).json({
                error: 'Please save the event before checking in attendees.',
                ignoredIds: tempIds
            });
        }

        // Rule 2: If AT LEAST ONE service ID is NOT evt-: Allow check-in
        const results = {
            checkedIn: [] as string[],
            alreadyCheckedIn: [] as string[],
            ignored: tempIds
        };

        if (validIds.length > 0) {
            // Check existing
            const { data: existing } = await supabase
                .from('service_attendance')
                .select('service_id')
                .eq('member_id', memberId)
                .in('service_id', validIds);

            const existingSet = new Set(existing?.map(e => e.service_id));
            const toInsert = validIds.filter((id: string) => !existingSet.has(id));

            results.alreadyCheckedIn = Array.from(existingSet) as string[];

            if (toInsert.length > 0) {
                const rows = toInsert.map((sid: string) => ({
                    member_id: memberId,
                    service_id: sid,
                    check_in_time: new Date().toISOString()
                }));

                const { error } = await supabase.from('service_attendance').insert(rows);
                if (error) throw error;
                results.checkedIn = toInsert;
            }

            // 3. Update Check In Time AND Sync attended_service_ids
            // Fetch member to get current IDs AND Category
            const { data: member } = await supabase.from('members').select('attended_service_ids, category').eq('id', memberId).single();
            const currentIds = member?.attended_service_ids || [];

            // USE validIds (All requested Check-ins) instead of toInsert (Only new DB rows)
            const newIds = Array.from(new Set([...currentIds, ...validIds]));

            // AUTO-PROMOTE: If they were 'First Timer', they are now a 'Member' (Returning visitor)
            const newCategory = (member?.category === 'First Timer') ? 'Member' : (member?.category);

            await supabase.from('members').update({
                check_in_time: new Date().toISOString(), // Standardize to ISO
                attended_service_ids: newIds,
                category: newCategory // Update category if promoted
            }).eq('id', memberId);
        }

        res.json({
            message: 'Check-in processed',
            results,
            _meta: { ignored_service_ids: tempIds } // Adhere to convention
        });

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

export const getEventAttendees = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log('[GET ATTENDEES] Fetching for service/event:', id);
    try {
        // 1. Get Direct Check-ins from Service Attendance
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id, check_in_time')
            .eq('service_id', id);

        if (attError) throw attError;

        let directAttendees: any[] = [];
        const memberIds = attendance?.map(a => a.member_id) || [];

        if (memberIds.length > 0) {
            const { data: members, error: memError } = await supabase
                .from('members')
                .select('*')
                .in('id', memberIds)
                .order('name');

            if (memError) throw memError;

            directAttendees = members?.map(m => {
                const att = attendance?.find(a => a.member_id === m.id);
                return {
                    ...m,
                    checkInTime: att?.check_in_time
                };
            }) || [];
        }

        // 2. Get Passengers from Logistics (Stations -> Vehicles -> Passengers)
        // Find stations for this event
        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', id);

        let passengerAttendees: any[] = [];
        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);

            // Find vehicles in these stations
            const { data: vehicles } = await supabase.from('vehicles').select('id').in('station_id', stationIds);

            if (vehicles && vehicles.length > 0) {
                const vehicleIds = vehicles.map(v => v.id);

                // Find passengers in these vehicles
                const { data: passengers, error: passError } = await supabase
                    .from('passengers')
                    .select('*')
                    .in('vehicle_id', vehicleIds)
                    .limit(5000); // Increase limit just in case

                if (passError) throw passError;

                if (passengers) {
                    passengerAttendees = passengers.map(p => ({
                        id: p.id,
                        name: p.name,
                        phone: p.contact, // Map contact to phone
                        category: p.category,
                        status: 'Checked In',
                        check_in_time: null, // As requested, do not include check-in time
                        gender: p.gender,
                        residency: p.residence,
                        source: 'Logistics'
                    }));
                }
            }
        }

        // 3. Merge Strategies
        const allAttendees = [...directAttendees];

        // Strategy: Only exclude passenger if they EXACTLY match a direct attendee (Name + Phone)
        // This allows multiple passengers with same phone (e.g. families) to be included.
        passengerAttendees.forEach(p => {
            const isAlreadyCheckedIn = directAttendees.some(d =>
                d.phone === p.phone && d.name.toLowerCase() === p.name.toLowerCase()
            );

            if (!isAlreadyCheckedIn) {
                allAttendees.push(p);
            }
        });

        res.json(allAttendees);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const getMembersByIds = async (req: Request, res: Response) => {
    const { ids } = req.body;
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .in('id', ids);

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
