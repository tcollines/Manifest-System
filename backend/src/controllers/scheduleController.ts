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
        // Enforce 1 schedule per week per department
        const { data: existing, error: existingError } = await supabase
            .from('service_schedules')
            .select('id')
            .eq('manifest_id', manifestId)
            .eq('department_id', departmentId)
            .eq('week_start', weekStart)
            .maybeSingle();
            
        if (existingError) throw existingError;
        if (existing) {
            return res.status(400).json({ error: 'A schedule has already been generated for this week.' });
        }

        // Get department name for the slug
        const { data: dept, error: deptError } = await supabase
            .from('departments')
            .select('name')
            .eq('id', departmentId)
            .single();
            
        if (deptError || !dept) throw new Error('Department not found');

        // Generate slug
        const cleanDeptName = dept.name.replace(/[^a-zA-Z0-9]/g, '');
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '');
        let publicSlug = `${cleanDeptName}${cleanTitle}`;

        const { data: slugCheck } = await supabase
            .from('service_schedules')
            .select('id')
            .eq('public_slug', publicSlug)
            .maybeSingle();

        if (slugCheck) {
            publicSlug = `${publicSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        const { data, error } = await supabase
            .from('service_schedules')
            .insert([{ 
                id: uuidv4(), 
                manifest_id: manifestId, 
                department_id: departmentId, 
                title, 
                week_start: weekStart, 
                notes, 
                status: 'Draft', 
                created_by: userId,
                public_slug: publicSlug
            }])
            .select()
            .single();
            
        if (error) throw error;
        res.status(201).json(data);
    } catch (e: any) { 
        console.error(e);
        res.status(500).json({ error: 'An internal server error occurred.' }); 
    }
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

export const generateGlobalSchedules = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = (req as any).userId;
    const { title, weekStart } = req.body;
    
    if (!title || !weekStart) return res.status(400).json({ error: 'title and weekStart are required' });

    try {
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('id, name')
            .eq('manifest_id', manifestId)
            .ilike('status', 'active');
            
        if (deptError) throw deptError;
        if (!departments || departments.length === 0) return res.status(400).json({ error: 'No active departments found.' });

        const { data: existingSchedules, error: existingError } = await supabase
            .from('service_schedules')
            .select('department_id')
            .eq('manifest_id', manifestId)
            .eq('week_start', weekStart);

        if (existingError) throw existingError;

        const existingDeptIds = new Set(existingSchedules.map(s => s.department_id));
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '');

        const baseSchedules = departments
            .filter(dept => !existingDeptIds.has(dept.id))
            .map(dept => {
                const cleanDeptName = dept.name.replace(/[^a-zA-Z0-9]/g, '');
                const publicSlug = `${cleanDeptName}${cleanTitle}`;
                return {
                    id: uuidv4(),
                    manifest_id: manifestId,
                    department_id: dept.id,
                    title,
                    week_start: weekStart,
                    status: 'Draft',
                    created_by: userId,
                    public_slug: publicSlug
                };
            });

        if (baseSchedules.length === 0) {
            return res.status(200).json({ message: 'Schedules already exist for all active departments this week.' });
        }

        const proposedSlugs = baseSchedules.map(s => s.public_slug);
        const { data: collidingSlugs } = await supabase
            .from('service_schedules')
            .select('public_slug')
            .in('public_slug', proposedSlugs);
            
        const collisionSet = new Set(collidingSlugs?.map(s => s.public_slug) || []);
        
        const newSchedules = baseSchedules.map(s => {
            if (collisionSet.has(s.public_slug)) {
                s.public_slug = `${s.public_slug}-${Math.random().toString(36).substring(2, 6)}`;
            }
            return s;
        });

        if (newSchedules.length === 0) {
            return res.status(200).json({ message: 'All departments already have a schedule for this week.' });
        }

        const { error: insertError } = await supabase
            .from('service_schedules')
            .insert(newSchedules);
            
        if (insertError) throw insertError;

        res.status(201).json({ message: `Successfully generated ${newSchedules.length} draft schedules.` });
    } catch (err) { 
        console.error('[generateGlobalSchedules]', err); 
        res.status(500).json({ error: 'An internal server error occurred.' }); 
    }
};

export const getGlobalStatus = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { weekStart } = req.params;
    try {
        const { data: activeDepts, error: deptError } = await supabase
            .from('departments')
            .select('id, name')
            .eq('manifest_id', manifestId)
            .ilike('status', 'active')
            .order('name');
        
        if (deptError) throw deptError;

        const { data: schedules, error: schedError } = await supabase
            .from('service_schedules')
            .select('department_id, status')
            .eq('manifest_id', manifestId)
            .eq('week_start', weekStart);

        if (schedError) throw schedError;

        const submittedDepts = new Set(schedules.filter(s => s.status !== 'Draft').map(s => s.department_id));
        const hasDraftDepts = new Set(schedules.filter(s => s.status === 'Draft').map(s => s.department_id));

        const result = {
            total: activeDepts.length,
            submitted: activeDepts.filter(d => submittedDepts.has(d.id)),
            draft: activeDepts.filter(d => hasDraftDepts.has(d.id) && !submittedDepts.has(d.id)),
            missing: activeDepts.filter(d => !submittedDepts.has(d.id) && !hasDraftDepts.has(d.id))
        };

        res.json(result);
    } catch (err) {
        console.error('[getGlobalScheduleStatus]', err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
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
