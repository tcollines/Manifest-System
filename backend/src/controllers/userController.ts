import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllUsers = async (req: Request, res: Response) => {
    const role = req.query.role as string;
    const eventId = req.query.eventId as string;
    const departmentId = req.query.departmentId as string;
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        // STRICT SCOPING RULE: Coordinators must be fetched by Event
        // If searching for Coordinators globally, reject it.
        if (role === 'Coordinator' && !validEventId) {
            console.warn('[BACKEND] Blocked global coordinator fetch attempt. Missing eventId.');
            return res.json([]);
        }

        let query = supabase.from('users').select('*');
        if (role) query = query.eq('role', role);
        if (validEventId) query = query.eq('event_id', validEventId);
        if (departmentId) query = query.eq('department_id', departmentId);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Username: '${username}', Password: '${password}'`);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Trim inputs to match our sanitized DB
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', cleanUsername)
            .eq('password', cleanPassword) // In a real app, hash this!
            .maybeSingle(); // Returns null if not found, error if multiple

        if (error) {
            console.error('[LOGIN ERROR] DB Error:', error.message);
            return res.status(500).json({ error: 'Database error checking credentials' });
        }

        if (!data) {
            console.warn(`[LOGIN FAILED] No user found for '${cleanUsername}' with provided password.`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        console.log(`[LOGIN SUCCESS] User found: ${data.username} (${data.role})`);
        res.json(data);
    } catch (error: any) {
        console.error('[LOGIN EXCEPTION]', error);
        res.status(500).json({ error: error.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const payload = {
            ...req.body,
            department_id: req.body.departmentId || req.body.department_id, // Map camelCase to snake_case
            // departmentId is not removed but Supabase ignores extra fields if not strict? 
            // Actually, the error said "Could not find the 'departmentId' column", so we MUST remove it or map it clean.
        };
        delete payload.departmentId; // Remove invalid column

        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'User created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const payload = {
            ...req.body,
            department_id: req.body.departmentId || req.body.department_id,
        };
        delete payload.departmentId;

        const { error } = await supabase.from('users').update(payload).eq('id', id);
        if (error) throw error;
        res.json({ message: 'User updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'User deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
