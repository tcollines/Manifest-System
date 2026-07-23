import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

export const getMembers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized: Missing Manifest ID' });

    const page = parseInt(req.query.page as string) || 1;
    const requestedSize = parseInt(req.query.pageSize as string) || 50;
    const pageSize = Math.min(requestedSize, 100);
    const searchQuery = (req.query.search as string || '').trim();

    try {
        if (searchQuery) {
            // Attempt RPC search with hasMore contract first
            const { data: rpcData, error: rpcError } = await supabase.rpc('search_members_v2', {
                _manifest_id: manifestId,
                _search_query: searchQuery,
                _page: page,
                _page_size: pageSize
            });

            if (!rpcError && Array.isArray(rpcData)) {
                const hasMore = rpcData.length > 0 ? Boolean(rpcData[0].has_more) : false;
                const cleanedData = rpcData.map(({ has_more, row_num, ...m }: any) => m);
                return res.json({ data: cleanedData, count: cleanedData.length, hasMore, page });
            }

            // Fallback: Use pageSize + 1 range query without { count: 'exact' }
            const cleanPhone = searchQuery.replace(/\D/g, '');
            let query = supabase.from('members')
                .select('id, name, category, phone, status, check_in_time, gender, residency, born_again, joined_date, attended_service_ids, created_at, occupation, place_of_work, email, is_phaneroo_member, referral_source')
                .eq('manifest_id', manifestId);

            if (cleanPhone.length >= 7) {
                query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${cleanPhone}%`);
            } else {
                query = query.ilike('name', `%${searchQuery}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize; // Fetch 1 extra row to check hasMore

            const { data, error } = await query
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const items = data || [];
            const hasMore = items.length > pageSize;
            const finalData = hasMore ? items.slice(0, pageSize) : items;

            return res.json({ data: finalData, count: finalData.length, hasMore, page });
        }

        // Unfiltered database view: retain exact total count for standard pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await supabase
            .from('members')
            .select('id, name, category, phone, status, check_in_time, gender, residency, born_again, joined_date, attended_service_ids, created_at, occupation, place_of_work, email, is_phaneroo_member, referral_source', { count: 'exact' })
            .eq('manifest_id', manifestId)
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.json({ data: data || [], count: count || 0, hasMore: (from + (data?.length || 0)) < (count || 0), page });
    } catch (error: any) {
        console.error('[GET MEMBERS EXCEPTION]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// getAllMembers removed completely to prevent Node.js Out-Of-Memory crashes.
// All consumers must use the paginated getMembers endpoint exclusively.

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
            _name: m.name || null,
            _category: m.category || null,
            _phone: m.phone || null,
            _status: m.status || null,
            _check_in_time: m.check_in_time || m.checkInTime || null,
            _gender: m.gender || null,
            _residency: m.residency || null,
            _born_again: typeof m.born_again === 'boolean' ? m.born_again : (m.born_again === 'Yes'),
            _joined_date: m.joined_date || m.joinedDate || new Date().toISOString(),
            _attended_service_ids: safeServiceIds || [],
            _current_service_id: m.category === 'First Timer' && m.currentServiceId ? toUUID(m.currentServiceId) : null
        });

        if (error) {
            console.error('[ADD MEMBER RPC ERROR]', error);
            throw error;
        }

        if (data?._meta?.ignored_service_ids?.length > 0) {
            console.warn('[ADD MEMBER WARNING] Ignored Temporary/Invalid IDs:', data._meta.ignored_service_ids);
        }

        const memberId = data?.id;
        if (memberId) {
            const updates: any = {};
            if (m.occupation !== undefined) updates.occupation = m.occupation;
            if (m.place_of_work !== undefined || m.placeOfWork !== undefined) {
                updates.place_of_work = m.place_of_work !== undefined ? m.place_of_work : m.placeOfWork;
            }
            if (m.email !== undefined) updates.email = m.email;
            if (m.is_phaneroo_member !== undefined || m.isPhanerooMember !== undefined) {
                updates.is_phaneroo_member = m.is_phaneroo_member !== undefined ? m.is_phaneroo_member : m.isPhanerooMember;
            }
            if (m.referral_source !== undefined || m.referralSource !== undefined) {
                updates.referral_source = m.referral_source !== undefined ? m.referral_source : m.referralSource;
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('members')
                    .update(updates)
                    .eq('manifest_id', manifestId)
                    .eq('id', toUUID(memberId));

                if (updateError) {
                    console.error('[ADD MEMBER UPDATE ERROR] Failed to save extra columns:', updateError);
                } else {
                    Object.assign(data, updates);
                }
            }
        }

        res.status(201).json(data);

    } catch (error: any) {
        if (error.message && error.message.includes('idx_members_unique_identity')) {
            res.status(409).json({ error: 'This member (Name + Phone) is already registered in this Manifest.' });
        } else {
            res.status(500).json({ error: 'An internal server error occurred.' });
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
    if (m.gender !== undefined) updates.gender = m.gender;
    if (m.residency !== undefined) updates.residency = m.residency;
    if (m.occupation !== undefined) updates.occupation = m.occupation;
    if (m.email !== undefined) updates.email = m.email;

    // Support both camelCase and snake_case for frontend requests
    if (m.check_in_time !== undefined || m.checkInTime !== undefined) {
        updates.check_in_time = m.check_in_time !== undefined ? m.check_in_time : m.checkInTime;
    }
    if (m.born_again !== undefined || m.bornAgain !== undefined) {
        updates.born_again = m.born_again !== undefined ? m.born_again : m.bornAgain;
    }
    if (m.joined_date !== undefined || m.joinedDate !== undefined) {
        updates.joined_date = m.joined_date !== undefined ? m.joined_date : m.joinedDate;
    }
    if (m.place_of_work !== undefined || m.placeOfWork !== undefined) {
        updates.place_of_work = m.place_of_work !== undefined ? m.place_of_work : m.placeOfWork;
    }
    if (m.is_phaneroo_member !== undefined || m.isPhanerooMember !== undefined) {
        updates.is_phaneroo_member = m.is_phaneroo_member !== undefined ? m.is_phaneroo_member : m.isPhanerooMember;
    }
    if (m.referral_source !== undefined || m.referralSource !== undefined) {
        updates.referral_source = m.referral_source !== undefined ? m.referral_source : m.referralSource;
    }
    if (m.attended_service_ids !== undefined || m.attendedServiceIds !== undefined) {
        updates.attended_service_ids = m.attended_service_ids !== undefined ? m.attended_service_ids : m.attendedServiceIds;
    }
    if (m.first_timer_service_id !== undefined || m.firstTimerServiceId !== undefined) {
        const val = m.first_timer_service_id !== undefined ? m.first_timer_service_id : m.firstTimerServiceId;
        updates.first_timer_service_id = val ? toUUID(val) : null;
    }
    if (m.follow_up_status !== undefined || m.followUpStatus !== undefined) {
        updates.follow_up_status = m.follow_up_status !== undefined ? m.follow_up_status : m.followUpStatus;
    }
    if (m.follow_up_notes !== undefined || m.followUpNotes !== undefined) {
        updates.follow_up_notes = m.follow_up_notes !== undefined ? m.follow_up_notes : m.followUpNotes;
    }

    try {
        // [FIX] Administrative Correction: If shifting a First Timer to Member, explicitly clear First Timer flags
        if (m.category !== undefined) {
            const { data: oldRecord } = await supabase
                .from('members')
                .select('category')
                .eq('manifest_id', manifestId)
                .eq('id', toUUID(id))
                .single();

            if (m.category === 'Member') {
                updates.is_first_timer = false;
                updates.first_timer_service_id = null;
                updates.first_timer_date = null;
            }
        }
        const { error } = await supabase.from('members')
            .update(updates)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', toUUID(id));
        if (error) throw error;
        res.json({ message: 'Member updated', updates });
    } catch (error: any) {
        console.error('Update Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteMember = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { ids } = req.body;
    try {
        const uuidIds = ids.map((id: string) => toUUID(id)).filter(Boolean);

        if (uuidIds.length === 0) {
            return res.status(400).json({ error: 'No valid UUIDs provided for deletion.' });
        }

        const { error } = await supabase.from('members')
            .delete()
            .eq('manifest_id', manifestId)
            .in('id', uuidIds);

        if (error) throw error;
        res.json({ message: 'Members deleted' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
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
            const uuidMemberId = toUUID(memberId);
            if (!uuidMemberId) throw new Error("Invalid Member UUID");

            const uuidServiceIds = validIds.map(toUUID).filter((id): id is string => !!id);

            const { data: existing } = await supabase
                .from('service_attendance')
                .select('service_id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .eq('member_id', uuidMemberId)
                .in('service_id', uuidServiceIds);

            const existingSet = new Set(existing?.map(e => e.service_id));
            const toInsert = uuidServiceIds.filter(id => !existingSet.has(id));

            results.alreadyCheckedIn = Array.from(existingSet) as string[];

            if (toInsert.length > 0) {
                const rows = toInsert.map((sid) => {
                    return {
                        manifest_id: manifestId, // INJECT TENANT ID
                        member_id: uuidMemberId,
                        service_id: sid,
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
                .eq('id', uuidMemberId)
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
                .eq('id', uuidMemberId);
        }

        res.json({
            message: 'Check-in processed',
            results,
            _meta: { ignored_service_ids: tempIds }
        });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const uncheckInMember = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { memberId, serviceId } = req.body;
    
    if (!memberId || !serviceId) {
        return res.status(400).json({ error: 'memberId and serviceId are required' });
    }

    try {
        const uuidMemberId = toUUID(memberId);
        const uuidServiceId = toUUID(serviceId);

        if (!uuidMemberId || !uuidServiceId) {
            throw new Error("Invalid UUIDs provided");
        }

        // 1. Delete from service_attendance
        const { error: deleteError } = await supabase
            .from('service_attendance')
            .delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('member_id', uuidMemberId)
            .eq('service_id', uuidServiceId);

        if (deleteError) throw deleteError;

        // 2. Safely Update the members table cache arrays and first timer flags
        const { data: member } = await supabase.from('members')
            .select('attended_service_ids, first_timer_service_id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', uuidMemberId)
            .single();

        if (member) {
            const currentIds = member.attended_service_ids || [];
            const newIds = currentIds.filter((id: string) => toUUID(id) !== uuidServiceId);

            const updatePayload: any = {
                attended_service_ids: newIds
            };

            // If this exact service triggered their First Timer status, revoke it
            // So they can be cleanly flagged as a First Timer at the correct service next time
            if (member.first_timer_service_id === uuidServiceId) {
                updatePayload.first_timer_service_id = null;
                updatePayload.legacy_first_timer_service_id = null;
                updatePayload.is_first_timer = false;
                updatePayload.first_timer_date = null;
            }

            const { error: updateError } = await supabase.from('members')
                .update(updatePayload)
                .eq('manifest_id', manifestId) // Tenant Isolation
                .eq('id', uuidMemberId);

            if (updateError) throw updateError;
        }

        res.json({ message: 'Undo Check-in processed successfully' });

    } catch (error: any) {
        console.error('[UNCHECK-IN ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
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
            .eq('service_id', toUUID(serviceId));

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
            .select('id, joined_date, category, first_timer_service_id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .in('id', uuidIds);

        if (membersError) throw membersError;
        members = fetchedMembers || [];

        const firstTimerCount = (members || []).filter(m => {
            const joinedDate = m.joined_date ? m.joined_date.split('T')[0].split(' ')[0] : null;
            // Only count them as a First Timer if they were actually registered as a First Timer
            if (m.category === 'First Timer' && joinedDate === serviceDate) return true;
            // Or if their first timer origin event is this exact service
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
        res.status(500).json({ error: 'An internal server error occurred.' });
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
            .eq('id', toUUID(id))
            .single();

        if (memError || !member) throw new Error("Member not found");

        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('service_id, check_in_time')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('member_id', toUUID(id))
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
        const dateOnly = joinedDate.substring(0, 10);
        const { count: totalServices } = await supabase
            .from('ministry_events')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('type', 'Service')
            .gte('date', dateOnly)
            .lte('date', new Date().toISOString().substring(0, 10));

        res.json({
            member: member,
            attendedCount: serviceCount,
            totalServices: totalServices || 0,
            history: history
        });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
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
            .eq('service_id', toUUID(serviceId))
            .in('member_id', memberIds.filter(Boolean));

        if (attError) throw attError;

        const attendedMemberIds = new Set(attendance?.map(a => a.member_id));

        const result = members.map(m => ({
            ...m,
            status: attendedMemberIds.has(m.id) ? 'Checked In' : 'Absent'
        }));

        res.json(result);

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
}

export const getEventAttendees = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    console.log('[GET ATTENDEES] Fetching for service/event:', id);
    try {
        const idUuid = toUUID(id);

        if (!idUuid) {
            return res.status(400).json({ error: 'Invalid UUID for event/service' });
        }

        // Step 1: Check service_attendance (used for regular services/check-in flows)
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('manifest_id', manifestId)
            .eq('service_id', idUuid);

        if (attError) throw attError;

        const memberIds = (attendance || []).map(a => a.member_id).filter(Boolean);

        if (memberIds.length > 0) {
            // Regular service path: fetch member records
            const { data: members, error: memError } = await supabase
                .from('members')
                .select('id, name, phone, gender, residency, category, status, check_in_time')
                .eq('manifest_id', manifestId)
                .in('id', memberIds);

            if (memError) throw memError;
            return res.json(members || []);
        }

        // Step 2: Fallback ΓÇö Ministry Events use passengers as attendees
        // (e.g. Men Gather, Return Journey events where check-in is via vehicles/transport)
        const { data: passengers, error: passError } = await supabase
            .from('passengers')
            .select('id, name, created_at, gender, residence, contact, is_first_time, soul_won')
            .eq('manifest_id', manifestId)
            .eq('event_id', idUuid);

        if (passError) throw passError;

        // Map passengers to the same shape as members for frontend compatibility
        const mapped = (passengers || []).map(p => ({
            id: p.id,
            name: p.name,
            phone: p.contact || '',
            gender: p.gender || '',
            residency: p.residence || '',
            category: 'Passenger',
            status: 'Checked In',
            check_in_time: p.created_at,
            isFirstTime: p.is_first_time === 'Yes' || p.is_first_time === true,
            soulWon: p.soul_won === true
        }));

        res.json(mapped);

    } catch (error: any) {
        console.error('[GET ATTENDEES ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
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
        res.status(500).json({ error: 'An internal server error occurred.' });
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
            query = query.eq('id', idUuid);
        } else {
            return res.status(400).json({ error: 'Invalid UUID' });
        }

        const { data, error } = await query.single();
        if (error) throw error;
        res.json(data || null);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// Helper function for fuzzy string matching (S├╕rensenΓÇôDice coefficient)
function calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) {
        return s1.includes(s2) || s2.includes(s1) ? 0.5 : 0;
    }

    const bigrams1 = [];
    for (let i = 0; i < s1.length - 1; i++) bigrams1.push(s1.substring(i, i + 2));
    const bigrams2 = [];
    for (let i = 0; i < s2.length - 1; i++) bigrams2.push(s2.substring(i, i + 2));

    bigrams1.sort();
    bigrams2.sort();

    let intersection = 0;
    let i = 0;
    let j = 0;

    while (i < bigrams1.length && j < bigrams2.length) {
        if (bigrams1[i] === bigrams2[j]) {
            intersection++;
            i++;
            j++;
        } else if (bigrams1[i] < bigrams2[j]) {
            i++;
        } else {
            j++;
        }
    }

    return (2.0 * intersection) / (bigrams1.length + bigrams2.length);
}

export const searchMembersByResidency = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const residencySearch = req.query.residency as string || '';
    if (!residencySearch) {
        return res.json([]);
    }

    try {
        // Find ALL members with a residency to compute string similarity (since we need fuzzy matching)
        // Bypassing Supabase's default 1000-row limit by using pagination
        let allMembers: any[] = [];
        let page = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: members, error: memError } = await supabase
                .from('members')
                .select('*')
                .eq('manifest_id', manifestId)
                .not('residency', 'is', null)
                .neq('residency', '')
                .range(page * limit, (page + 1) * limit - 1);

            if (memError) throw memError;

            if (!members || members.length === 0) {
                hasMore = false;
            } else {
                allMembers = allMembers.concat(members);
                if (members.length < limit) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }

        if (allMembers.length === 0) return res.json([]);

        // Filter based on 50% similarity or substring match
        const matchingMembers = allMembers.filter((m: any) => {
            const residency = m.residency || '';
            // Treat exact substring as a valid match just in case
            if (residency.toLowerCase().includes(residencySearch.toLowerCase())) {
                return true;
            }

            // Calculate similarity (>= 50% match)
            const similarity = calculateSimilarity(residencySearch, residency);
            return similarity >= 0.5;
        });

        // Return all matching members
        res.json(matchingMembers);
    } catch (error: any) {
        console.error('searchMembersByResidency Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const bulkUpdateResidency = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { memberIds, residencyName } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || !residencyName) {
        return res.status(400).json({ error: 'Missing memberIds or residencyName' });
    }

    try {
        const uuidIds = memberIds.map(toUUID).filter(Boolean);
        if (uuidIds.length === 0) {
            return res.json({ message: 'No valid UUIDs provided for bulk update.' });
        }

        const { error } = await supabase
            .from('members')
            .update({ residency: residencyName })
            .eq('manifest_id', manifestId)
            .in('id', uuidIds);

        if (error) throw error;

        res.json({ message: 'Members residencies mapped successfully' });
    } catch (error: any) {
        console.error('bulkUpdateResidency Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getFirstTimers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data: membersData, error: memError } = await supabase
            .from('members')
            .select('id, name, phone, gender, residency, check_in_time, first_timer_service_id, joined_date, first_timer_date, created_at')
            .eq('manifest_id', manifestId)
            .or('category.eq.First Timer,first_timer_service_id.not.is.null');

        if (memError) throw memError;

        const { data: passengersData, error: passError } = await supabase
            .from('passengers')
            .select('id, name, contact, gender, residence, created_at, event_id')
            .eq('manifest_id', manifestId)
            .or('is_first_time.eq.Yes,is_first_time.eq.true');

        if (passError) throw passError;

        const eventIds = new Set<string>([
            ...(membersData || []).map(m => m.first_timer_service_id).filter(Boolean),
            ...(passengersData || []).map(p => p.event_id).filter(Boolean)
        ]);

        let eventTitles: Record<string, string> = {};
        let eventDates: Record<string, string> = {};
        if (eventIds.size > 0) {
            const { data: eventsData } = await supabase
                .from('ministry_events')
                .select('id, title, date')
                .eq('manifest_id', manifestId)
                .in('id', Array.from(eventIds));
            
            if (eventsData) {
                eventsData.forEach(e => {
                    eventTitles[e.id] = e.title;
                    eventDates[e.id] = e.date;
                });
            }
        }

        const events = (passengersData || []).map(p => ({
            id: p.id,
            name: p.name,
            phone: p.contact || '',
            gender: p.gender || '',
            residency: p.residence || '',
            check_in_time: (p.event_id ? eventDates[p.event_id] : null) || p.created_at,
            source_event_id: p.event_id,
            source_event_title: p.event_id ? (eventTitles[p.event_id] || 'Unknown Event') : 'Unknown Event'
        }));

        const services = (membersData || []).map(m => ({
            id: m.id,
            name: m.name,
            phone: m.phone || '',
            gender: m.gender || '',
            residency: m.residency || '',
            check_in_time: (m.first_timer_service_id ? eventDates[m.first_timer_service_id] : null) || m.first_timer_date || m.joined_date || m.created_at || m.check_in_time,
            source_event_id: m.first_timer_service_id,
            source_event_title: m.first_timer_service_id ? (eventTitles[m.first_timer_service_id] || 'Unknown Service') : 'Unknown Service'
        }));

        res.json({ services, events });
    } catch (error: any) {
        console.error('getFirstTimers Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getPassengerDetails = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { data: pass, error: passError } = await supabase
            .from('passengers')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', toUUID(id))
            .single();

        if (passError || !pass) throw new Error("Passenger not found");

        let history: any[] = [];
        let serviceCount = 0;

        if (pass.event_id) {
            const { data: evt } = await supabase
                .from('ministry_events')
                .select('id, title, date, type')
                .eq('manifest_id', manifestId)
                .eq('id', pass.event_id)
                .single();

            if (evt) {
                history = [{
                    serviceId: evt.id,
                    date: evt.date,
                    title: evt.title,
                    type: evt.type,
                    checkInTime: new Date(pass.created_at).toLocaleTimeString()
                }];
                serviceCount = 1;
            }
        }

        res.json({
            member: {
                id: pass.id,
                name: pass.name,
                phone: pass.contact,
                residency: pass.residence,
                gender: pass.gender,
                category: 'Event First Timer',
                status: 'Passenger',
                joinedDate: pass.created_at
            },
            attendedCount: serviceCount,
            totalServices: 1, // First timer via event only tracked for that event locally
            history: history
        });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getAttendanceSummary = async (req: any, res: any) => {
    const manifestId = req.manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized: Missing Manifest ID' });

    const { dateFrom, dateTo } = req.query;

    try {
        // Fetch Service-type events, optionally filtered by date range
        let evtQuery = supabase
            .from('ministry_events')
            .select('id')
            .eq('manifest_id', manifestId)
            .eq('type', 'Service');

        if (dateFrom) evtQuery = (evtQuery as any).gte('date', dateFrom);
        if (dateTo)   evtQuery = (evtQuery as any).lte('date', dateTo);

        const { data: serviceEvents, error: evtError } = await evtQuery;
        if (evtError) throw evtError;

        const serviceEventIds = (serviceEvents || []).map((e: any) => e.id);
        const totalServices = serviceEventIds.length;

        if (totalServices === 0) {
            return res.json({ summary: {}, totalServices: 0 });
        }

        const serviceIdSet = new Set(serviceEventIds);
        const summary: Record<string, number> = {};
        const CHUNK = 1000;
        let offset = 0;
        let totalFetched = 0;

        while (true) {
            const { data: rows, error: attError } = await supabase
                .from('service_attendance')
                .select('member_id, service_id')
                .eq('manifest_id', manifestId)
                .in('service_id', serviceEventIds)
                .range(offset, offset + CHUNK - 1);

            if (attError) throw attError;
            if (!rows || rows.length === 0) break;

            for (const row of rows) {
                if (!serviceIdSet.has(row.service_id)) continue;
                summary[row.member_id] = (summary[row.member_id] || 0) + 1;
            }

            totalFetched += rows.length;
            if (rows.length < CHUNK) break;
            offset += CHUNK;
        }

        console.log('[ATTENDANCE SUMMARY] dateFrom=' + (dateFrom || 'all') + ', dateTo=' + (dateTo || 'all') + ', totalFetched=' + totalFetched + ', services=' + totalServices + ', members=' + Object.keys(summary).length);
        res.json({ summary, totalServices });
    } catch (error: any) {
        console.error('[ATTENDANCE SUMMARY ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};