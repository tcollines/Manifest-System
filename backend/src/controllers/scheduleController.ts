import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

const guard = (req: Request, res: Response): string | null => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    return manifestId;
};

// ─── Schedule ─────────────────────────────────────────────────

export const getAllSchedules = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    try {
        const { data, error } = await supabase
            .from('service_schedules')
            .select(`*, schedule_sessions(*, schedule_assignments(*)), departments(name)`)
            .eq('manifest_id', manifestId)
            .order('week_start', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const getSchedulesByDepartment = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    try {
        const { data, error } = await supabase
            .from('service_schedules')
            .select(`*, schedule_sessions(*, schedule_assignments(*))`)
            .eq('manifest_id', manifestId)
            .eq('department_id', departmentId)
            .order('week_start', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const createSchedule = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = (req as any).userId;
    const { departmentId, title, weekStart, notes } = req.body;
    if (!departmentId || !title || !weekStart) return res.status(400).json({ error: 'departmentId, title, weekStart are required' });
    try {
        const { data, error } = await supabase
            .from('service_schedules')
            .insert([{ id: uuidv4(), manifest_id: manifestId, department_id: departmentId, title, week_start: weekStart, notes, status: 'Draft', created_by: userId }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const updateSchedule = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { scheduleId } = req.params;
    const { title, week_start, notes, status } = req.body;
    if (status && !['Draft', 'Published'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const { data, error } = await supabase
            .from('service_schedules')
            .update({ title, week_start, notes, status, updated_at: new Date().toISOString() })
            .eq('manifest_id', manifestId)
            .eq('id', scheduleId)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const deleteSchedule = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { scheduleId } = req.params;
    try {
        const { error } = await supabase
            .from('service_schedules')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('id', scheduleId);
        if (error) throw error;
        res.json({ message: 'Schedule deleted' });
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

// ─── Sessions ─────────────────────────────────────────────────

export const addSession = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { scheduleId } = req.params;
    const { sessionLabel, sessionDate, arrivalTime, notes } = req.body;
    if (!sessionLabel || !sessionDate || !arrivalTime) return res.status(400).json({ error: 'sessionLabel, sessionDate, arrivalTime are required' });
    try {
        // Get current max sequence for this schedule
        const { data: existing } = await supabase.from('schedule_sessions').select('sequence').eq('schedule_id', scheduleId).order('sequence', { ascending: false }).limit(1);
        const nextSeq = ((existing?.[0]?.sequence ?? 0) as number) + 1;
        const { data, error } = await supabase
            .from('schedule_sessions')
            .insert([{ id: uuidv4(), schedule_id: scheduleId, session_label: sessionLabel, session_date: sessionDate, arrival_time: arrivalTime, notes, sequence: nextSeq }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const deleteSession = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { sessionId } = req.params;
    try {
        const { error } = await supabase.from('schedule_sessions').delete().eq('id', sessionId);
        if (error) throw error;
        res.json({ message: 'Session deleted' });
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const updateSession = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { sessionId } = req.params;
    const { sessionLabel, sessionDate, arrivalTime, notes } = req.body;
    try {
        const { data, error } = await supabase
            .from('schedule_sessions')
            .update({ session_label: sessionLabel, session_date: sessionDate, arrival_time: arrivalTime, notes })
            .eq('id', sessionId)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

// ─── Assignments ───────────────────────────────────────────────

export const addAssignment = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { sessionId } = req.params;
    const { roleLabel, ministerName, memberId } = req.body;
    if (!roleLabel || !ministerName) return res.status(400).json({ error: 'roleLabel and ministerName are required' });
    try {
        const { data: existing } = await supabase.from('schedule_assignments').select('sequence').eq('session_id', sessionId).order('sequence', { ascending: false }).limit(1);
        const nextSeq = ((existing?.[0]?.sequence ?? 0) as number) + 1;
        const { data, error } = await supabase
            .from('schedule_assignments')
            .insert([{ id: uuidv4(), session_id: sessionId, role_label: roleLabel, minister_name: ministerName, member_id: memberId ?? null, sequence: nextSeq }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const deleteAssignment = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { assignmentId } = req.params;
    try {
        const { error } = await supabase.from('schedule_assignments').delete().eq('id', assignmentId);
        if (error) throw error;
        res.json({ message: 'Assignment deleted' });
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

// ─── Member Serving History ────────────────────────────────────

export const getMemberServingHistory = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { memberId } = req.params;
    try {
        const { data, error } = await supabase
            .from('schedule_assignments')
            .select(`*, schedule_sessions(session_label, session_date, schedule_id, service_schedules(title, week_start, department_id, departments(name)))`)
            .eq('member_id', memberId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};
