import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export const getPublicResidence = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('residences')
            .select('id, name, coordinator_name, created_at')
            .eq('id', id)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ error: 'Residence not found' });
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const submitPublicSouls = async (req: Request, res: Response) => {
    const { residenceId, souls } = req.body;
    
    if (!residenceId || !Array.isArray(souls) || souls.length === 0) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
        const { data: residence, error: residenceError } = await supabase
                .from('residences')
                .select('manifest_id, name')
                .eq('id', residenceId)
                .single();
        
        if (residenceError || !residence) {
            return res.status(404).json({ error: 'Residence not found' });
        }
        
        const manifestId = residence.manifest_id;

        const formattedSouls = souls.map((s: any) => ({
            id: uuidv4(),
            manifest_id: manifestId,
            first_name: s.firstName,
            last_name: s.lastName,
            phone: s.phone,
            gender: s.gender,
            residence: s.residence,
            status: 'New',
            source_type: 'Residential',
            source_id: residenceId,
            captured_by: s.capturedBy,
            notes: s.notes
        }));

        const { minorsCount } = req.body;
        if (minorsCount && typeof minorsCount === 'number' && minorsCount > 0) {
            const defaultLabourer = souls.length > 0 ? souls[0].capturedBy : 'Public Link';
            for (let i = 0; i < minorsCount; i++) {
                formattedSouls.push({
                    id: uuidv4(),
                    manifest_id: manifestId,
                    first_name: 'Minor',
                    last_name: 'Soul',
                    phone: null,
                    gender: 'Male', // Default required by schema
                    residence: residence.name || null,
                    status: 'New',
                    source_type: 'Residential',
                    source_id: residenceId,
                    captured_by: defaultLabourer,
                    notes: 'Anonymous minor added via Residential Public Link'
                });
            }
        }
        
        const { error } = await supabase.from('souls').insert(formattedSouls);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.status(201).json({ success: true, count: formattedSouls.length });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getPublicEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('ministry_events')
            .select('id, title, date, location, type')
            .eq('id', id)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const submitPublicEventSouls = async (req: Request, res: Response) => {
    const { eventId, souls } = req.body;
    
    if (!eventId || !Array.isArray(souls) || souls.length === 0) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
        const { data: event, error: eventError } = await supabase
                .from('ministry_events')
                .select('manifest_id, title')
                .eq('id', eventId)
                .single();
        
        if (eventError || !event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const manifestId = event.manifest_id;

        const formattedSouls = souls.map((s: any) => ({
            id: uuidv4(),
            manifest_id: manifestId,
            first_name: s.firstName,
            last_name: s.lastName,
            phone: s.phone,
            gender: s.gender,
            residence: s.residence,
            status: s.status || 'New',
            source_type: 'Event',
            source_id: eventId,
            event_id: eventId,
            captured_by: s.capturedBy || 'Public Link',
            notes: s.notes
        }));
        
        const { error } = await supabase.from('souls').insert(formattedSouls);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.status(201).json({ success: true, count: formattedSouls.length });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getPublicSchedule = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        
        let query = supabase.from('service_schedules').select(`*, departments(name)`);
        if (isUuid) {
            query = query.eq('id', id);
        } else {
            query = query.eq('public_slug', id);
        }

        // 1. Fetch schedule
        const { data: schedule, error: scheduleError } = await query.single();
            
        if (scheduleError || !schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const resolvedScheduleId = schedule.id;

        // 2. Fetch sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from('schedule_sessions')
            .select('*')
            .eq('schedule_id', resolvedScheduleId)
            .order('sequence', { ascending: true });

        if (sessionsError) {
            return res.status(500).json({ error: 'Failed to fetch sessions' });
        }

        // 3. Fetch departmental roles
        const { data: roles, error: rolesError } = await supabase
            .from('departmental_roles')
            .select('*')
            .eq('department_id', schedule.department_id)
            .order('role_name', { ascending: true });

        // 4. Fetch department members
        // Try with member join first
        let membersData = [];
        const { data: membersJoined, error: membersJoinError } = await supabase
            .from('dept_church_members')
            .select(`*, members(name, phone)`)
            .eq('department_id', schedule.department_id)
            .order('created_at', { ascending: false });

        if (membersJoinError) {
            const fallback = await supabase
                .from('dept_church_members')
                .select('*')
                .eq('department_id', schedule.department_id)
                .order('created_at', { ascending: false });
            membersData = fallback.data || [];
        } else {
            membersData = membersJoined || [];
        }

        res.json({
            schedule,
            sessions: sessions || [],
            roles: roles || [],
            members: membersData
        });
} catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};


export const submitPublicScheduleAvailability = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { selectedMemberId, selections } = req.body;
    
    if (!id || !selectedMemberId || !selections) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        
        let query = supabase.from('service_schedules').select('id, manifest_id, department_id, status');
        if (isUuid) {
            query = query.eq('id', id);
        } else {
            query = query.eq('public_slug', id);
        }

        const { data: schedule, error: scheduleError } = await query.single();
            
        if (scheduleError || !schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        const scheduleId = schedule.id;
        
        if (schedule.status !== 'Draft') {
            return res.status(403).json({ error: 'This schedule is no longer accepting submissions.' });
        }

        // 2. Fetch all sessions for this schedule
        const { data: scheduleSessions } = await supabase
            .from('schedule_sessions')
            .select('id')
            .eq('schedule_id', id);
            
        const sessionIds = scheduleSessions?.map(s => s.id) || [];
        
        // 3. Delete existing assignments for this member in this schedule
        if (sessionIds.length > 0 && selectedMemberId) {
            await supabase
                .from('schedule_assignments')
                .delete()
                .in('session_id', sessionIds)
                .eq('member_id', selectedMemberId);
        }

        // 4. Insert assignments
        // For each assignment, we need to find the max sequence of its session and increment it.
        // Since we might have multiple assignments for the same session in this batch, we should group them.
        
        const sessionsGrouped = selections.reduce((acc: any, curr: any) => {
            if (!acc[curr.sessionId]) acc[curr.sessionId] = [];
            acc[curr.sessionId].push(curr);
            return acc;
        }, {});

        const formattedAssignments = [];
        
        for (const sessionId of Object.keys(sessionsGrouped)) {
            const { data: existing } = await supabase
                .from('schedule_assignments')
                .select('sequence')
                .eq('session_id', sessionId)
                .order('sequence', { ascending: false })
                .limit(1);
                
            let nextSeq = ((existing?.[0]?.sequence ?? 0) as number) + 1;
            
            for (const assignment of sessionsGrouped[sessionId]) {
                formattedAssignments.push({
                    id: uuidv4(),
                    session_id: sessionId,
                    role_label: assignment.roleLabel,
                    minister_name: assignment.ministerName,
                    member_id: assignment.memberId || null,
                    sequence: nextSeq++,
                    arrival_time: assignment.arrivalTime || null
                });
            }
        }
        
        const { error: insertError } = await supabase.from('schedule_assignments').insert(formattedAssignments);
        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }
        
        res.status(201).json({ success: true, count: formattedAssignments.length });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const submitPublicEventPassengers = async (req: Request, res: Response) => {
    const { eventId, passengers } = req.body;
    
    if (!eventId || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
        const { data: event, error: eventError } = await supabase
                .from('ministry_events')
                .select('id')
                .eq('id', eventId)
                .single();
        
        if (eventError || !event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const formattedPassengers = passengers.map((p: any) => ({
            id: uuidv4(),
            event_id: eventId,
            name: p.name,
            contact: p.contact,
            residence: p.residence,
            is_first_time: p.isFirstTime,
            transport_means: p.transportMeans,
            category: p.category || 'Member'
        }));
        
        const { error } = await supabase.from('passengers').insert(formattedPassengers);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.status(201).json({ success: true, count: formattedPassengers.length });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
