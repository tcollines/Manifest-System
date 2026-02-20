import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

export const getMembers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized: Missing Manifest ID' });

    console.log(`[GET MEMBERS] Search: '${req.query.search}', Page: ${req.query.page}`);

    const page = parseInt(req.query.page as string) || 1;
    const requestedSize = parseInt(req.query.pageSize as string) || 50;
    const pageSize = Math.min(requestedSize, 50);
    const searchQuery = req.query.search as string || '';

    try {
        let query = supabase.from('members').select('id, name, category, phone, status, check_in_time, gender, residency, born_again, joined_date', { count: 'exact' })
            .eq('manifest_id', manifestId); // Tenant Isolation

        if (searchQuery) {
            const isNumeric = /^\d+$/.test(searchQuery);

            if (isNumeric && searchQuery.length >= 7) {
                query = query.ilike('phone', `%${searchQuery}%`);
            } else {
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized: Missing Manifest ID' });

    try {
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
                .eq('manifest_id', manifestId) // Tenant Isolation
                .order('name', { ascending: true })
                .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                allMembers = allMembers.concat(data);
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const m = req.body;
        const rawIds = m.attended_service_ids || [];
        const safeServiceIds = Array.isArray(rawIds) ? rawIds : [rawIds];

        const { data, error } = await supabase.rpc('submit_member_entry', {
            _manifest_id: manifestId, // INJECT TENANT ID
            _id: m.id ? toUUID(m.id) : uuidv4(),
            _legacy_id: m.id || null,
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
            _current_service_id: m.currentServiceId ? toUUID(m.currentServiceId) : null,
            _legacy_current_service_id: m.currentServiceId || null
        });

        if (error) {
            console.error('[ADD MEMBER RPC ERROR]', error);
            throw error;
        }

        if (data?._meta?.ignored_service_ids?.length > 0) {
            console.warn('[ADD MEMBER WARNING] Ignored Temporary/Invalid IDs:', data._meta.ignored_service_ids);
        }

        res.status(201).json(data);

    } catch (error: any) {
        if (error.message && error.message.includes('idx_members_unique_identity')) {
            res.status(409).json({ error: 'This member (Name + Phone) is already registered in this Manifest.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

export const updateMember = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const m = req.body;

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
    if (m.placeOfWork !== undefined) updates.place_of_work = m.placeOfWork;
    if (m.occupation !== undefined) updates.occupation = m.occupation;
    if (m.email !== undefined) updates.email = m.email;
    if (m.attendedServiceIds !== undefined) updates.attended_service_ids = m.attendedServiceIds;
    if (m.firstTimerServiceId !== undefined) {
        updates.first_timer_service_id = m.firstTimerServiceId ? toUUID(m.firstTimerServiceId) : null;
        updates.legacy_first_timer_service_id = m.firstTimerServiceId || null;
    }

    try {
        const { error } = await supabase.from('members')
            .update(updates)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Member updated', updates });
    } catch (error: any) {
        console.error('Update Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteMember = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { ids } = req.body;
    try {
        const uuidIds = ids.map((id: string) => toUUID(id)).filter(Boolean);
        const legacyIds = ids.filter((id: string) => !toUUID(id));

        let query = supabase.from('members').delete().eq('manifest_id', manifestId); // Tenant Isolation
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { memberId, serviceId } = req.body;
    try {
        const serviceIds = Array.isArray(serviceId) ? serviceId : [serviceId];
        const tempIds = serviceIds.filter((id: string) => String(id).startsWith('evt-'));
        const validIds = serviceIds.filter((id: string) => !String(id).startsWith('evt-'));

        if (validIds.length === 0 && tempIds.length > 0) {
            return res.status(400).json({
                error: 'Please save the event before checking in attendees.',
                ignoredIds: tempIds
            });
        }

        const results = {
            checkedIn: [] as string[],
            alreadyCheckedIn: [] as string[],
            ignored: tempIds
        };

        if (validIds.length > 0) {
            const { data: existing } = await supabase
                .from('service_attendance')
                .select('service_id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .or(`member_id.eq.${toUUID(memberId)},legacy_member_id.eq.${memberId}`)
                .or(`service_id.in.(${validIds.map(toUUID).filter(Boolean).join(',')}),legacy_service_id.in.(${validIds.join(',')})`);

            const existingSet = new Set(existing?.map(e => e.service_id));
            const toInsert = validIds.filter((id: string) => !existingSet.has(id));

            results.alreadyCheckedIn = Array.from(existingSet) as string[];

            if (toInsert.length > 0) {
                const rows = toInsert.map((sid: string) => {
                    return {
                        manifest_id: manifestId, // INJECT TENANT ID
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

            const { data: member } = await supabase.from('members')
                .select('attended_service_ids, category, first_timer_service_id, joined_date')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .or(`id.eq.${toUUID(memberId)},legacy_id.eq.${memberId}`)
                .single();

            const currentIds = member?.attended_service_ids || [];
            const newIds = Array.from(new Set([...currentIds, ...validIds.map(toUUID)]));

            const todayStr = new Date().toISOString().split('T')[0];
            const joinedStr = member?.joined_date ? new Date(member.joined_date).toISOString().split('T')[0] : todayStr;
            const isReturnVisit = joinedStr < todayStr;
            const newCategory = (member?.category === 'First Timer' && isReturnVisit) ? 'Member' : (member?.category);

            const updatePayload: any = {
                check_in_time: new Date().toISOString(),
                attended_service_ids: newIds,
                category: newCategory
            };

            if (member?.first_timer_service_id && validIds.map(toUUID).includes(member.first_timer_service_id)) {
                updatePayload.first_timer_service_id = null;
                updatePayload.legacy_first_timer_service_id = null;
            }

            await supabase.from('members')
                .update(updatePayload)
                .eq('manifest_id', manifestId) // Tenant Isolation
                .or(`id.eq.${toUUID(memberId)},legacy_id.eq.${memberId}`);
        }

        res.json({
            message: 'Check-in processed',
            results,
            _meta: { ignored_service_ids: tempIds }
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getServiceStats = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    const serviceDate = req.query.date as string;

    try {
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id, check_in_time')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`service_id.eq.${toUUID(serviceId)},legacy_service_id.eq.${serviceId}`);

        if (attError) throw attError;

        const validAttendance = (attendance || []).filter(a => {
            if (!a.check_in_time) return true;
            return !a.check_in_time.startsWith('1970-01-01');
        });

        const memberIds = validAttendance.map(a => a.member_id);

        if (memberIds.length === 0) {
            return res.json({ total: 0, firstTimers: 0, memberIds: [] });
        }

        const uuidIds = memberIds.map(toUUID).filter(Boolean);
        const legacyIds = memberIds.filter(id => !toUUID(id));

        let members: any[] = [];
        const { data: fetchedMembers, error: membersError } = await supabase
            .from('members')
            .select('id, legacy_id, joined_date, category, first_timer_service_id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.in.(${uuidIds.join(',')}),legacy_id.in.(${legacyIds.join(',')})`);

        if (membersError) throw membersError;
        members = fetchedMembers || [];

        const firstTimerCount = (members || []).filter(m => {
            const joinedDate = m.joined_date ? m.joined_date.split('T')[0].split(' ')[0] : null;
            if (joinedDate === serviceDate) return true;
            if (m.first_timer_service_id === toUUID(serviceId)) return true;
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { data: member, error: memError } = await supabase
            .from('members')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`)
            .single();

        if (memError || !member) throw new Error("Member not found");

        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('service_id, check_in_time')
            .eq('manifest_id', manifestId) // Tenant Isolation
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
                .eq('manifest_id', manifestId) // Tenant Isolation
                .in('id', attendedServiceIds);

            history = (attendance || []).map(a => {
                const evt = events?.find(e => e.id === a.service_id);
                return {
                    serviceId: a.service_id,
                    date: evt?.date || new Date(a.check_in_time).toISOString().split('T')[0],
                    title: evt?.title || 'Unknown Service',
                    type: evt?.type || 'Service',
                    checkInTime: new Date(a.check_in_time).toLocaleTimeString()
                };
            });

            serviceCount = events?.filter(e => e.type === 'Service').length || 0;
        }

        const joinedDate = member.joined_date || new Date().toISOString();
        const { count: totalServices } = await supabase
            .from('ministry_events')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('type', 'Service')
            .gte('date', joinedDate)
            .lte('date', new Date().toISOString().split('T')[0]);

        res.json({
            member: member,
            attendedCount: serviceCount,
            totalServices: totalServices || 0,
            history: history
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const searchMembersWithStatus = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    const queryStr = req.query.query as string || '';

    try {
        let queryBuilder = supabase.from('members').select('*').eq('manifest_id', manifestId); // Tenant Isolation
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
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`service_id.eq.${toUUID(serviceId)},legacy_service_id.eq.${serviceId}`)
            .or(`member_id.in.(${memberIds.filter(Boolean).join(',')}),legacy_member_id.in.(${members.map(m => m.legacy_id).filter(Boolean).join(',')})`);

        if (attError) throw attError;

        const attendedMemberIds = new Set(attendance?.map(a => a.member_id));

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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    console.log('[GET ATTENDEES] Fetching for service/event:', id);
    try {
        const idUuid = toUUID(id);

        let attQuery = supabase.from('service_attendance').select('member_id, check_in_time').eq('manifest_id', manifestId); // Tenant Isolation

        if (idUuid) {
            attQuery = attQuery.or(`service_id.eq.${idUuid},legacy_service_id.eq.${id}`);
        } else {
            attQuery = attQuery.eq('legacy_service_id', id);
        }

        const { data: attendance, error: attError } = await attQuery;

        if (attError) throw attError;

        let directAttendees: any[] = [];
        const memberIds = attendance?.map(a => a.member_id) || [];

        if (memberIds.length > 0) {
            const { data: members, error: memError } = await supabase
                .from('members')
                .select('*')
                .eq('manifest_id', manifestId) // Tenant Isolation
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

        let stationQuery = supabase.from('pickup_stations').select('id').eq('manifest_id', manifestId); // Tenant Isolation
        if (idUuid) {
            stationQuery = stationQuery.or(`event_id.eq.${idUuid},legacy_event_id.eq.${id}`);
        } else {
            stationQuery = stationQuery.eq('legacy_event_id', id);
        }

        const { data: stations } = await stationQuery;

        let passengerAttendees: any[] = [];
        if (stations && stations.length > 0) {
            const stationIds = stations.map(s => s.id);

            let vQuery = supabase.from('vehicles').select('id').eq('manifest_id', manifestId); // Tenant Isolation
            vQuery = vQuery.or(`station_id.in.(${stationIds.filter(s => toUUID(s)).join(',')}),legacy_station_id.in.(${stationIds.join(',')})`);

            const { data: vehicles } = await vQuery;

            if (vehicles && vehicles.length > 0) {
                const vehicleIds = vehicles.map(v => v.id);

                let pQuery = supabase.from('passengers').select('*').eq('manifest_id', manifestId); // Tenant Isolation
                pQuery = pQuery.or(`vehicle_id.in.(${vehicleIds.filter(v => toUUID(v)).join(',')}),legacy_vehicle_id.in.(${vehicleIds.join(',')})`);

                const { data: passengers, error: passError } = await pQuery.limit(5000);

                if (passError) throw passError;

                if (passengers) {
                    passengerAttendees = passengers.map(p => ({
                        id: p.id,
                        name: p.name,
                        phone: p.contact,
                        category: p.category,
                        status: 'Checked In',
                        check_in_time: null,
                        gender: p.gender,
                        residency: p.residence,
                        source: 'Logistics'
                    }));
                }
            }
        }

        const allAttendees = [...directAttendees];

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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { ids } = req.body;
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .in('id', ids);

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getMemberById = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const idUuid = toUUID(id);
        let query = supabase.from('members').select('*').eq('manifest_id', manifestId); // Tenant Isolation

        if (idUuid) {
            query = query.or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        } else {
            query = query.eq('legacy_id', id);
        }

        const { data, error } = await query.single();
        if (error) throw error;
        res.json(data || null);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
