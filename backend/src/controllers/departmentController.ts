import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

// ─── Helper ────────────────────────────────────────────────────
const guard = (req: Request, res: Response): string | null => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    return manifestId;
};

// ─── Departments ───────────────────────────────────────────────

export const getDepartments = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('name', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const getDepartmentById = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    try {
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUUID  = UUID_RE.test(departmentId);

        let query = supabase
            .from('departments')
            .select('*')
            .eq('manifest_id', manifestId);

        // If the param looks like a UUID, query by id; otherwise fall back to slug
        const { data, error } = isUUID
            ? await query.eq('id', departmentId).single()
            : await query.eq('slug', departmentId).single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Department not found' });
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};
export const createDepartment = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = (req as any).userId ?? (req as any).user?.id ?? null;
    try {
        const { name, description, icon, headId } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
        const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const { data, error } = await supabase
            .from('departments')
            .insert([{
                id: uuidv4(),
                manifest_id: manifestId,
                name: name.trim(),
                slug,
                description,
                icon: icon ?? 'Users',
                head_id: headId ?? null,
                is_custom: true,
                created_by: userId,
            }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

// ─── Department Church Members ─────────────────────────────────

export const getChurchMembers = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    try {
        // Try with member join first — columns: name, phone (not full_name / phone_number)
        let { data, error } = await supabase
            .from('dept_church_members')
            .select(`*, members(name, phone), users(id, name, email, role, status)`)
            .eq('department_id', departmentId)
            .order('created_at', { ascending: false });

        // If join fails (e.g. FK name mismatch), fall back to base table only
        if (error) {
            console.error('[getChurchMembers] join failed, falling back:', error.message);
            const fallback = await supabase
                .from('dept_church_members')
                .select('*')
                .eq('department_id', departmentId)
                .order('created_at', { ascending: false });
            if (fallback.error) throw fallback.error;
            data = fallback.data;
        }

        res.json(data);
    } catch (err: any) {
        console.error('[getChurchMembers] error:', err?.message ?? err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addChurchMember = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    const { memberId, servingRole, joinedDate, userId } = req.body;
    if (!memberId || !servingRole) {
        return res.status(400).json({ error: 'memberId and servingRole are required' });
    }
    try {
        const newId = uuidv4();

        // Step 1: plain insert — no join select, cannot fail due to column name issues
        const { error: insertError } = await supabase
            .from('dept_church_members')
            .insert([{
                id:            newId,
                department_id: departmentId,
                member_id:     memberId,
                serving_role:  servingRole,
                joined_date:   joinedDate ?? new Date().toISOString().split('T')[0],
                user_id:       userId ?? null,
            }]);

        if (insertError) {
            console.error('[addChurchMember] insert error:', insertError.message, insertError.details ?? '');
            throw insertError;
        }

        // Step 2: fetch the newly created row, try with join, fall back to plain if join fails
        let { data, error: fetchError } = await supabase
            .from('dept_church_members')
            .select('*, members(name, phone), users(id, name, email, role, status)')
            .eq('id', newId)
            .single();

        if (fetchError) {
            console.warn('[addChurchMember] join fetch failed, using plain fetch:', fetchError.message);
            const plain = await supabase
                .from('dept_church_members')
                .select('*')
                .eq('id', newId)
                .single();
            if (plain.error) throw plain.error;
            data = plain.data;
        }

        res.status(201).json(data);
    } catch (err: any) {
        console.error('[addChurchMember] error:', err?.message ?? err);
        res.status(500).json({ error: err?.message ?? 'An internal server error occurred.' });
    }
};


export const removeChurchMember = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId, memberId } = req.params;
    try {
        const { error } = await supabase
            .from('dept_church_members')
            .delete()
            .eq('department_id', departmentId)
            .eq('member_id', memberId);
        if (error) throw error;
        res.json({ message: 'Member removed' });
    } catch (err: any) {
        console.error('[removeChurchMember] error:', err?.message ?? err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const linkMemberToUser = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId, memberId } = req.params;
    const { userId } = req.body;
    try {
        const { error } = await supabase
            .from('dept_church_members')
            .update({ user_id: userId })
            .eq('id', memberId)
            .eq('department_id', departmentId);

        if (error) throw error;
        res.json({ message: 'Member linked successfully.' });
    } catch (error: any) {
        console.error('[linkMemberToUser] error:', error?.message ?? error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getLinkableUsers = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const query = req.query.q as string || '';
    try {
        // Find active users in the manifest matching query
        let queryBuilder = supabase
            .from('users')
            .select('id, name, email, role')
            .eq('manifest_id', manifestId)
            .neq('status', 'Deleted')
            .neq('status', 'Inactive');
            
        if (query.trim()) {
            queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
        }

        const { data, error } = await queryBuilder.order('name', { ascending: true }).limit(20);
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('[getLinkableUsers] error:', error?.message ?? error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// ─── Department Finances ─────────────────────────────────────────────

export const getDeptFinances = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    const { month } = req.query; // e.g. '2026-04'
    try {
        let query = supabase
            .from('dept_finances')
            .select('*')
            .eq('manifest_id', manifestId)
            .eq('department_id', departmentId)
            .order('date', { ascending: false });
        if (month) {
            const start = `${month}-01`;
            const end   = new Date(start); end.setMonth(end.getMonth() + 1);
            query = query.gte('date', start).lt('date', end.toISOString().split('T')[0]);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const addDeptFinanceEntry = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = (req as any).userId;
    const { departmentId } = req.params;
    const { type, category, amount, description, date } = req.body;
    if (!type || !category || !amount || !date) return res.status(400).json({ error: 'type, category, amount, date are required' });
    if (!['Income', 'Expense'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    try {
        const { data, error } = await supabase
            .from('dept_finances')
            .insert([{ id: uuidv4(), manifest_id: manifestId, department_id: departmentId, type, category, amount: parseInt(amount, 10), description, date, recorded_by: userId }])
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const deleteDeptFinanceEntry = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId, entryId } = req.params;
    try {
        const { error } = await supabase
            .from('dept_finances')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('department_id', departmentId)
            .eq('id', entryId);
        if (error) throw error;
        res.json({ message: 'Entry deleted' });
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};
