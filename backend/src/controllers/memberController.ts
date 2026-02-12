import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

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
            const isNumeric = /^\d+$/.test(searchQuery);

            if (isNumeric && searchQuery.length >= 7) {
                // Optimize: Phone search only for long numbers
                query = query.ilike('phone', `%${searchQuery}%`);
            } else {
                // Flexible Search: "John Doe" matches "Doe John"
                // Logic: (Name matches T1 OR Phone matches T1) AND (Name matches T2 OR Phone matches T2)...
                const tokens = searchQuery.split(/\s+/).filter(Boolean);

                tokens.forEach(token => {
                    const tokenClean = token.replace(/\D/g, '');
                    if (tokenClean.length > 0) {
                        // Match Name OR Phone
                        query = query.or(`name.ilike.%${token}%,phone.ilike.%${tokenClean}%`);
                    } else {
                        // Match Name only (token has no digits)
                        query = query.or(`name.ilike.%${token}%`);
                    }
                });
            }
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
            _id: m.id ? toUUID(m.id) : uuidv4(), // Ensure ID is UUID, generate if not provided
            _legacy_id: m.id || null, // Store original ID as legacy_id
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
            _current_service_id: m.currentServiceId ? toUUID(m.currentServiceId) : null, // Pass context for first-timer logic
            _legacy_current_service_id: m.currentServiceId || null
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
        if (error.message && error.message.includes('idx_members_unique_identity')) {
            res.status(409).json({ error: 'This member (Name + Phone) is already registered.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

export const updateMember = async (req: Request, res: Response) => {
    const { id } = req.params; // This 'id' can be UUID or legacy
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
    if (m.firstTimerServiceId !== undefined) {
        updates.first_timer_service_id = m.firstTimerServiceId ? toUUID(m.firstTimerServiceId) : null;
        updates.legacy_first_timer_service_id = m.firstTimerServiceId || null;
    }

    try {
        // Update using either the UUID 'id' or the 'legacy_id'
        const { error } = await supabase.from('members').update(updates).or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Member updated', updates });
    } catch (error: any) {
        console.error('Update Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteMember = async (req: Request, res: Response) => {
    const { ids } = req.body; // Expecting array of IDs (can be UUID or legacy)
    try {
        // Convert all IDs to UUIDs for the 'id' column, or use legacy_id for non-UUIDs
        const uuidIds = ids.map((id: string) => toUUID(id)).filter(Boolean);
        const legacyIds = ids.filter((id: string) => !toUUID(id));

        let query = supabase.from('members').delete();
        if (uuidIds.length > 0 && legacyIds.length > 0) {
            query = query.or(`id.in.(${uuidIds.join(',')}),legacy_id.in.(${legacyIds.join(',')})`);
        } else if (uuidIds.length > 0) {
            query = query.in('id', uuidIds);
        } else if (legacyIds.length > 0) {
            query = query.in('legacy_id', legacyIds);
        } else {
            return res.status(400).json({ error: 'No valid IDs provided for deletion.' });
        }

        const { error } = await query;
        if (error) throw error;
        res.json({ message: 'Members deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const checkInMember = async (req: Request, res: Response) => {
    const { memberId, serviceId } = req.body; // memberId and serviceId can be UUID or legacy
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
            // Check existing attendance for the member across all valid service IDs
            const { data: existing } = await supabase
                .from('service_attendance')
                .select('service_id')
                .or(`member_id.eq.${toUUID(memberId)},legacy_member_id.eq.${memberId}`)
                .or(`service_id.in.(${validIds.map(toUUID).filter(Boolean).join(',')}),legacy_service_id.in.(${validIds.join(',')})`);

            const existingSet = new Set(existing?.map(e => e.service_id));
            const toInsert = validIds.filter((id: string) => !existingSet.has(id));

            results.alreadyCheckedIn = Array.from(existingSet) as string[];

            if (toInsert.length > 0) {
                const rows = toInsert.map((sid: string) => {
                    return {
                        member_id: toUUID(memberId),
                        legacy_member_id: memberId,
                        service_id: toUUID(sid),
                        legacy_service_id: sid,
                        check_in_time: new Date().toISOString()
                    };
                });

                const { error } = await supabase.from('service_attendance').insert(rows);
                if (error) throw error;
                results.checkedIn = toInsert;
            }

            // 3. Update Member's Check In Time AND Sync attended_service_ids AND Category
            // Fetch member to get current IDs AND Category
            const { data: member } = await supabase.from('members')
                .select('attended_service_ids, category, first_timer_service_id')
                .or(`id.eq.${toUUID(memberId)},legacy_id.eq.${memberId}`)
                .single();

            const currentIds = member?.attended_service_ids || [];

            // USE validIds (All requested Check-ins) instead of toInsert (Only new DB rows)
            const newIds = Array.from(new Set([...currentIds, ...validIds.map(toUUID)])); // Store UUIDs in attended_service_ids

            // AUTO-PROMOTE: If they were 'First Timer', they are now a 'Member' (Returning visitor)
            // Rule: Only promote if they joined BEFORE today. If they joined today, they are still a First Timer for this service.
            const todayStr = new Date().toISOString().split('T')[0];
            const joinedStr = member?.joined_date ? new Date(member.joined_date).toISOString().split('T')[0] : todayStr;
            const isReturnVisit = joinedStr < todayStr;

            const newCategory = (member?.category === 'First Timer' && isReturnVisit) ? 'Member' : (member?.category);

            const updatePayload: any = {
                check_in_time: new Date().toISOString(),
                attended_service_ids: newIds,
                category: newCategory
            };

            // If member was marked as first-timer for one of the services being checked into, clear that flag
            if (member?.first_timer_service_id && validIds.map(toUUID).includes(member.first_timer_service_id)) {
                updatePayload.first_timer_service_id = null;
                updatePayload.legacy_first_timer_service_id = null;
            }

            await supabase.from('members')
                .update(updatePayload)
                .or(`id.eq.${toUUID(memberId)},legacy_id.eq.${memberId}`);
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
    const { serviceId } = req.params; // serviceId can be UUID or legacy
    const serviceDate = req.query.date as string;

    try {
        // Query attendance using either UUID or legacy ID
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id, check_in_time')
            .or(`service_id.eq.${toUUID(serviceId)},legacy_service_id.eq.${serviceId}`);

        if (attError) throw attError;

        // Filter out audit-excluded records (1970-01-01)
        const validAttendance = (attendance || []).filter(a => {
            if (!a.check_in_time) return true;
            return !a.check_in_time.startsWith('1970-01-01');
        });

        const memberIds = validAttendance.map(a => a.member_id);

        if (memberIds.length === 0) {
            return res.json({ total: 0, firstTimers: 0, memberIds: [] });
        }

        let members: any[] = [];
        const chunkSize = 50; // Reduced from 200 to avoid URL length limits in some environments
        for (let i = 0; i < memberIds.length; i += chunkSize) {
            const chunk = memberIds.slice(i, i + chunkSize);

            // Build optimized query to minimize URL length
            const uuids = chunk.map(toUUID).filter(Boolean);
            const legacyIds = chunk.filter(id => !toUUID(id));

            let query = '';
            if (uuids.length > 0 && legacyIds.length > 0) {
                query = `id.in.(${uuids.join(',')}),legacy_id.in.(${legacyIds.join(',')})`;
            } else if (uuids.length > 0) {
                query = `id.in.(${uuids.join(',')})`;
            } else if (legacyIds.length > 0) {
                query = `legacy_id.in.(${legacyIds.join(',')})`;
            }

            if (!query) continue;

            const { data: chunkMembers, error: chunkError } = await supabase
                .from('members')
                .select('id, legacy_id, joined_date, category, first_timer_service_id')
                .or(query);

            if (chunkError) {
                console.error(`[getServiceStats] Chunk error at offset ${i}:`, chunkError);
                throw chunkError;
            }
            if (chunkMembers) {
                members = members.concat(chunkMembers);
            }
        }

        const firstTimerCount = (members || []).filter(m => {
            // Case 1: Joined on the exact date of the service
            const joinedDate = m.joined_date ? m.joined_date.split('T')[0].split(' ')[0] : null;
            if (joinedDate === serviceDate) return true;

            // Case 2: Explicitly marked for this service as a first timer (handles pre-registration)
            if (m.first_timer_service_id === toUUID(serviceId)) return true; // Compare UUIDs

            return false;
        }).length;

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
    const { id } = req.params; // id can be UUID or legacy
    try {
        // 1. Fetch Member Profile
        const { data: member, error: memError } = await supabase
            .from('members')
            .select('*')
            .or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`)
            .single();

        if (memError || !member) throw new Error("Member not found");

        // 2. Fetch Attendance
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('service_id, check_in_time')
            .or(`member_id.eq.${toUUID(id)},legacy_member_id.eq.${id}`)
            .order('check_in_time', { ascending: false });

        if (attError) throw attError;

        const attendedServiceIds = attendance?.map(a => a.service_id) || [];

        let history: any[] = [];
        let serviceCount = 0;

        if (attendedServiceIds.length > 0) {
            const { data: events } = await supabase
                .from('ministry_events')
                .select('id, title, date, type')
                .in('id', attendedServiceIds); // attendedServiceIds are already UUIDs

            history = (attendance || []).map(a => {
                const evt = events?.find(e => e.id === a.service_id);
                return {
                    serviceId: a.service_id,
                    date: evt?.date || new Date(a.check_in_time).toISOString().split('T')[0],
                    title: evt?.title || 'Unknown Service',
                    type: evt?.type || 'Service', // Return type for frontend
                    checkInTime: new Date(a.check_in_time).toLocaleTimeString()
                };
            });

            // FIX: Only count actual 'Service' types towards the "Total Attended" metric
            serviceCount = events?.filter(e => e.type === 'Service').length || 0;
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
            attendedCount: serviceCount, // Use the filtered count
            totalServices: totalServices || 0,
            history: history
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const searchMembersWithStatus = async (req: Request, res: Response) => {
    const { serviceId } = req.params; // serviceId can be UUID or legacy
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

        const memberIds = members.map(m => m.id); // These are UUIDs

        // Query attendance using either UUID or legacy ID for service and member
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id') // Only need member_id to check attendance
            .or(`service_id.eq.${toUUID(serviceId)},legacy_service_id.eq.${serviceId}`)
            .or(`member_id.in.(${memberIds.filter(Boolean).join(',')}),legacy_member_id.in.(${members.map(m => m.legacy_id).filter(Boolean).join(',')})`);

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
        const idUuid = toUUID(id);

        // 1. Get Direct Check-ins: Prefer service_id_uuid
        let attQuery = supabase.from('service_attendance').select('member_id, check_in_time');

        if (idUuid) {
            attQuery = attQuery.or(`service_id.eq.${idUuid},legacy_service_id.eq.${id}`);
        } else {
            attQuery = attQuery.eq('legacy_service_id', id);
            logLegacyFallback('service_attendance', id, 'getEventAttendees_Direct');
        }

        const { data: attendance, error: attError } = await attQuery;

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
        // Find stations for this event: Prefer authoritative event_id
        let stationQuery = supabase.from('pickup_stations').select('id');
        if (idUuid) {
            stationQuery = stationQuery.or(`event_id.eq.${idUuid},legacy_event_id.eq.${id}`);
        } else {
            stationQuery = stationQuery.eq('legacy_event_id', id);
            logLegacyFallback('pickup_stations', id, 'getEventAttendees_Stations');
        }

        const { data: stations } = await stationQuery;

        let passengerAttendees: any[] = [];
        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);

            // Find vehicles: Prefer authoritative station_id
            let vQuery = supabase.from('vehicles').select('id');
            vQuery = vQuery.or(`station_id.in.(${stationIds.filter(s => toUUID(s)).join(',')}),legacy_station_id.in.(${stationIds.join(',')})`);

            const { data: vehicles } = await vQuery;

            if (vehicles && vehicles.length > 0) {
                const vehicleIds = vehicles.map(v => v.id);

                // Find passengers: Prefer authoritative vehicle_id
                let pQuery = supabase.from('passengers').select('*');
                pQuery = pQuery.or(`vehicle_id.in.(${vehicleIds.filter(v => toUUID(v)).join(',')}),legacy_vehicle_id.in.(${vehicleIds.join(',')})`);

                const { data: passengers, error: passError } = await pQuery.limit(5000);

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

        // Original logic for getMembersByIds (multiple IDs)
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

// New function for getting a single member by ID, preferring native UUID
export const getMemberById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const idUuid = toUUID(id);
        let query = supabase.from('members').select('*');

        if (idUuid) {
            // id is now UUID, legacy_id is original TEXT
            query = query.or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        } else {
            query = query.eq('legacy_id', id);
            logLegacyFallback('members', id, 'getMemberById');
        }

        const { data, error } = await query.single();
        if (error) throw error;
        res.json(data || null); // Return null if not found for single item
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
