import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('users').select('*');
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
        const { error } = await supabase.from('users').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'User created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('users').update(req.body).eq('id', id);
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
