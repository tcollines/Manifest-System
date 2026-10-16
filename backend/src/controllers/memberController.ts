import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { randomUUID as uuidv4 } from 'crypto';
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
            const { data: rpcResult, error: rpcError } = await supabase.rpc('search_members_v2', {
                _manifest_id: manifestId,
                _search_query: searchQuery,
                _page: page,
                _page_size: pageSize
            });

            if (!rpcError && rpcResult) {
                return res.json(rpcResult);
            }

            console.warn('[getMembers] search_members_v2 RPC fallback:', rpcError?.message);

            const from = (page - 1) * pageSize;
            const to = from + pageSize;
            const cleanPhone = searchQuery.replace(/\D/g, '');

            let query = supabase
                .from('members')
                .select('*')
                .eq('manifest_id', manifestId);

            if (cleanPhone.length >= 7) {
                query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${cleanPhone}%`);
            } else {
                query = query.ilike('name', `%${searchQuery}%`);
            }

            const { data: items, error } = await query
                .order('name', { ascending: true })
                .range(from, to);

            if (error) throw error;

            const rows = items || [];
            const hasMore = rows.length > pageSize;
            const finalData = hasMore ? rows.slice(0, pageSize) : rows;

            return res.json({ data: finalData, page, hasMore });
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
        const serviceId = m.currentServiceId || m.first_timer_service_id || (Array.isArray(m.attended_service_ids) ? m.attended_service_ids[0] : m.attended_service_ids);

        if (m.category === 'First Timer' || m.isFirstTimer || serviceId) {
            const uuidServiceId = serviceId ? toUUID(serviceId) : null;

            if (uuidServiceId) {
                const { data: rpcData, error: rpcErr } = await supabase.rpc('atomic_register_first_timer', {
                    _manifest_id: manifestId,
                    _service_id: uuidServiceId,
                    _name: m.name || 'Unnamed Member',
                    _phone: m.phone || '',
                    _gender: m.gender || null,
                    _residency: m.residency || null,
                    _occupation: m.occupation || null,
                    _place_of_work: m.place_of_work || m.placeOfWork || null,
                    _born_again: m.born_again !== undefined ? String(m.born_again) : (m.bornAgain !== undefined ? String(m.bornAgain) : null),
                    _referral_source: m.referral_source || m.referralSource || null,
                    _is_phaneroo_member: m.is_phaneroo_member || m.isPhanerooMember || null
                });

                if (!rpcErr) {
                    return res.status(201).json(rpcData);
                }

                console.warn('[addMember] atomic_register_first_timer RPC error (' + rpcErr.message + '), executing direct query fallback');
                const newMemberId = m.id ? toUUID(m.id) : uuidv4();
                const memberRecord = {
                    id: newMemberId,
                    manifest_id: manifestId,
                    name: m.name || 'Unnamed Member',
                    phone: m.phone || '',
                    category: 'First Timer',
                    status: 'Checked In',
                    check_in_time: new Date().toISOString(),
                    gender: m.gender || null,
                    residency: m.residency || null,
                    occupation: m.occupation || null,
                    place_of_work: m.place_of_work || m.placeOfWork || null,
                    born_again: m.born_again !== undefined ? (typeof m.born_again === 'boolean' ? m.born_again : m.born_again === 'Yes') : null,
                    referral_source: m.referral_source || m.referralSource || null,
                    is_phaneroo_member: m.is_phaneroo_member || m.isPhanerooMember || null,
                    is_first_timer: true,
                    first_timer_service_id: uuidServiceId,
                    first_timer_date: new Date().toISOString().split('T')[0],
                    attended_service_ids: [uuidServiceId]
                };

                const { data: createdMember, error: insertErr } = await supabase.from('members')
                    .insert(memberRecord)
                    .select()
                    .single();

                if (insertErr) {
                    console.error('[addMember Fallback Error]', insertErr);
                    return res.status(500).json({ error: 'Failed to add member: ' + insertErr.message });
                }

                try {
                    await supabase.from('service_attendance').insert({
                        manifest_id: manifestId,
                        service_id: uuidServiceId,
                        member_id: newMemberId,
                        check_in_time: new Date().toISOString()
                    });
                } catch (attErr) {
                    console.warn('[addMember Fallback Attendance Warning]', attErr);
                }

                return res.status(201).json({
                    success: true,
                    isNewMember: true,
                    alreadyExisted: false,
                    member: createdMember,
                    attendanceInserted: true,
                    alreadyCheckedIn: false,
                    serviceId: uuidServiceId
                });
            }
        }

        // Standard member creation fallback via submit_member_entry or direct table insert
        const rawIds = m.attended_service_ids || [];
        const safeServiceIds = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_member_entry', {
            _manifest_id: manifestId,
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

        if (!rpcErr) {
            return res.status(201).json(rpcData);
        }

        console.warn('[addMember] submit_member_entry RPC error (' + rpcErr.message + '), executing direct table insert');
        const newMemberId = m.id ? toUUID(m.id) : uuidv4();
        const memberRecord = {
            id: newMemberId,
            manifest_id: manifestId,
            name: m.name || 'Unnamed Member',
            phone: m.phone || '',
            category: m.category || 'Member',
            status: m.status || 'Active',
            check_in_time: m.check_in_time || m.checkInTime || null,
            gender: m.gender || null,
            residency: m.residency || null,
            occupation: m.occupation || null,
            place_of_work: m.place_of_work || m.placeOfWork || null,
            born_again: typeof m.born_again === 'boolean' ? m.born_again : (m.born_again === 'Yes'),
            joined_date: m.joined_date || m.joinedDate || new Date().toISOString().split('T')[0],
            attended_service_ids: safeServiceIds
        };

        const { data: createdMember, error: insertErr } = await supabase.from('members')
            .insert(memberRecord)
            .select()
            .single();

        if (insertErr) {
            console.error('[addMember Direct Insert Error]', insertErr);
            return res.status(500).json({ error: 'Failed to add member: ' + insertErr.message });
        }

        res.status(201).json({ success: true, member: createdMember });
    } catch (error: any) {
        if (error.message && error.message.includes('idx_members_unique_identity')) {
            res.status(409).json({ error: 'This member (Name + Phone) is already registered in this Manifest.' });
        } else {
            console.error('[ADD MEMBER EXCEPTION]', error);
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
    if (m.phone !== undefined) updates.phone = m.phone;
    if (m.gender !== undefined) updates.gender = m.gender;
    if (m.residency !== undefined) updates.residency = m.residency;
    if (m.occupation !== undefined) updates.occupation = m.occupation;
    if (m.email !== undefined) updates.email = m.email;

    if (m.place_of_work !== undefined || m.placeOfWork !== undefined) {
        updates.place_of_work = m.place_of_work !== undefined ? m.place_of_work : m.placeOfWork;
    }
    if (m.born_again !== undefined || m.bornAgain !== undefined) {
        updates.born_again = m.born_again !== undefined ? m.born_again : m.bornAgain;
    }
    if (m.is_phaneroo_member !== undefined || m.isPhanerooMember !== undefined) {
        updates.is_phaneroo_member = m.is_phaneroo_member !== undefined ? m.is_phaneroo_member : m.isPhanerooMember;
    }
    if (m.referral_source !== undefined || m.referralSource !== undefined) {
        updates.referral_source = m.referral_source !== undefined ? m.referral_source : m.referralSource;
    }
    if (m.follow_up_status !== undefined || m.followUpStatus !== undefined) {
        updates.follow_up_status = m.follow_up_status !== undefined ? m.follow_up_status : m.followUpStatus;
    }
    if (m.follow_up_notes !== undefined || m.followUpNotes !== undefined) {
        updates.follow_up_notes = m.follow_up_notes !== undefined ? m.follow_up_notes : m.followUpNotes;
    }

    // EXPLICIT IMMUTABILITY GUARD: Strip updates to first_timer fields or manifest_id
    delete updates.manifest_id;
    delete updates.first_timer_service_id;
    delete updates.first_timer_date;
    delete updates.is_first_timer;
    delete updates.id;

    try {
        const { error } = await supabase.from('members')
            .update(updates)
            .eq('manifest_id', manifestId)
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

        if (validIds.length > 1) {
            return res.status(400).json({ error: 'Multi-service check-in is not supported in a single request. Check in per service.' });
        }

        const uuidMemberId = toUUID(memberId);
        if (!uuidMemberId) return res.status(400).json({ error: 'Invalid Member ID' });

        const sid = toUUID(validIds[0]);
        if (!sid) return res.status(400).json({ error: 'Invalid Service ID' });

        let data: any = null;
        let rpcErr: any = null;

        const rpcRes = await supabase.rpc('atomic_check_in_member', {
            _manifest_id: manifestId,
            _member_id: uuidMemberId,
            _service_id: sid
        });

        data = rpcRes.data;
        rpcErr = rpcRes.error;

        if (rpcErr) {
            console.warn('[checkInMember] RPC error (' + rpcErr.message + '), executing direct query fallback');
            
            const { data: existingAtt } = await supabase.from('service_attendance')
                .select('id')
                .eq('manifest_id', manifestId)
                .eq('service_id', sid)
                .eq('member_id', uuidMemberId)
                .maybeSingle();

            if (existingAtt) {
                data = { attendanceInserted: false, alreadyCheckedIn: true };
            } else {
                const { error: insErr } = await supabase.from('service_attendance').insert({
                    manifest_id: manifestId,
                    service_id: sid,
                    member_id: uuidMemberId,
                    check_in_time: new Date().toISOString()
                });
                
                if (insErr && !insErr.message.includes('duplicate')) {
                    return res.status(500).json({ error: 'Check-in failed: ' + insErr.message });
                }

                // Safely update member check_in_time and attended_service_ids array
                const { data: memData } = await supabase.from('members')
                    .select('attended_service_ids')
                    .eq('manifest_id', manifestId)
                    .eq('id', uuidMemberId)
                    .maybeSingle();

                let currentAttended: string[] = [];
                if (Array.isArray(memData?.attended_service_ids)) {
                    currentAttended = [...memData.attended_service_ids];
                }
                if (!currentAttended.includes(sid)) {
                    currentAttended.push(sid);
                }

                await supabase.from('members').update({
                    check_in_time: new Date().toISOString(),
                    attended_service_ids: currentAttended
                }).eq('manifest_id', manifestId).eq('id', uuidMemberId);

                data = { attendanceInserted: true, alreadyCheckedIn: false };
            }
            rpcErr = null;
        }

        return res.json({
            message: 'Check-in processed',
            results: {
                checkedIn: data?.attendanceInserted ? [sid] : [],
                alreadyCheckedIn: data?.alreadyCheckedIn ? [sid] : [],
                attendanceInserted: data?.attendanceInserted,
                ignored: tempIds
            },
            _meta: { ignored_service_ids: tempIds }
        });

    } catch (error: any) {
        console.error('[checkInMember EXCEPTION]', error);
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
            return res.status(400).json({ error: 'Invalid UUIDs provided' });
        }

        const { data, error } = await supabase.rpc('atomic_undo_check_in', {
            _manifest_id: manifestId,
            _member_id: uuidMemberId,
            _service_id: uuidServiceId
        });

        if (!error) {
            return res.json({ message: 'Unchecked in successfully', data });
        }

        console.warn('[uncheckInMember] RPC error (' + error.message + '), executing direct query fallback');
        const { error: delErr } = await supabase.from('service_attendance')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('service_id', uuidServiceId)
            .eq('member_id', uuidMemberId);

        if (delErr) {
            return res.status(500).json({ error: 'Failed to uncheck member: ' + delErr.message });
        }

        // Safely update member attended_service_ids array
        const { data: memData } = await supabase.from('members')
            .select('attended_service_ids')
            .eq('manifest_id', manifestId)
            .eq('id', uuidMemberId)
            .maybeSingle();

        if (Array.isArray(memData?.attended_service_ids)) {
            const updated = memData.attended_service_ids.filter((id: string) => id !== uuidServiceId);
            await supabase.from('members').update({
                attended_service_ids: updated
            }).eq('manifest_id', manifestId).eq('id', uuidMemberId);
        }

        return res.json({
            message: 'Unchecked in successfully',
            data: { success: true, attendanceRemoved: true }
        });
    } catch (error: any) {
        console.error('[UNCHECKIN EXCEPTION]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getServiceStats = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    try {
        const uuidSid = toUUID(serviceId);
        const { data, error } = await supabase.rpc('get_service_snapshot_v2', {
            _service_id: uuidSid,
            _manifest_id: manifestId
        });

        if (!error && data) {
            return res.json(data);
        }

        if (error && !error.message.includes('Could not find the function') && !error.message.includes('schema cache')) {
            throw error;
        }

        console.warn('[getServiceStats] get_service_snapshot_v2 RPC missing, using direct query fallback');
        const { data: attRows } = await supabase.from('service_attendance')
            .select('member_id')
            .eq('manifest_id', manifestId)
            .eq('service_id', uuidSid);

        const memberIds = (attRows || []).map(r => r.member_id);

        const { data: ftRows } = await supabase.from('members')
            .select('id')
            .eq('manifest_id', manifestId)
            .eq('first_timer_service_id', uuidSid);

        const ftIds = (ftRows || []).map(r => r.id);

        return res.json({
            serviceId: uuidSid,
            checkedInMemberIds: memberIds,
            firstTimerMemberIds: ftIds,
            memberAttendanceCount: memberIds.length,
            firstTimers: ftIds.length,
            manualChildrenCount: 0,
            memberIds: memberIds,
            total: memberIds.length,
            soulIds: [],
            soulsWon: 0
        });
    } catch (error: any) {
        console.error('[getServiceStats EXCEPTION]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};


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