import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getChildren = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }
        console.log('Fetched Children:', data?.length);
        res.json(data);
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const addChild = async (req: Request, res: Response) => {
    try {
        // console.log('[ADD CHILD RPC] Payload:', JSON.stringify(req.body));
        const c = req.body;

        // Map payload to RPC parameters (snake_case)
        // CRITICAL: All arguments must be present (or have defaults in SQL). 
        // We default all optional/nullable fields to null to ensure signature match.
        const rpcParams = {
            _id: c.id || null,
            _name: c.name || null,
            _parent_name: c.parentName || c.parent_name || null,
            _parent_contact: c.parentContact || c.parent_contact || null,
            _age: c.age || null,
            _gender: c.gender || null,
            _residence: c.residence || null,
            _allergies: c.allergies || null,
            _status: c.status || null,
            _check_in_time: c.checkInTime || c.check_in_time || null,
            _joined_date: c.joinedDate || c.joined_date || new Date().toISOString(),
            _attended_service_ids: c.attendedServiceIds || c.attended_service_ids || [],
            _category: c.category || null,
            // Ensure frontend passes currentServiceId if available
            _current_service_id: c.currentServiceId || null
        };

        const { data, error } = await supabase.rpc('submit_child_entry', rpcParams);

        if (error) {
            console.error('[ADD CHILD RPC ERROR]', error);
            throw error;
        }

        console.log('[ADD CHILD RPC SUCCESS] Result:', data);
        res.status(201).json(data);
    } catch (error: any) {
        console.error('[ADD CHILD CONTROLLER ERROR]', error);
        res.status(500).json({ error: error.message });
    }
};

export const bulkAddChildren = async (req: Request, res: Response) => {
    try {
        const { children } = req.body;
        const { error } = await supabase.from('children').insert(children);
        if (error) throw error;
        res.status(201).json({ message: 'Children added in bulk' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateChild = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const updates = req.body;
        delete updates.id;     // Cannot update PK
        delete updates._meta;  // Remove RPC metadata

        // AUTO-PROMOTE LOGIC:
        // If updating status to 'Checked In', check if they are currently 'First Timer'
        if (updates.status === 'Checked In' || updates.check_in_time || updates.checkInTime) {
            const { data: current } = await supabase.from('children').select('category').eq('id', id).single();
            if (current && current.category === 'First Timer') {
                updates.category = 'Member';
            }
        }

        const { error } = await supabase.from('children').update(updates).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Child updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteChild = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('children').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Child deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkDeleteChildren = async (req: Request, res: Response) => {
    const { ids } = req.body;
    try {
        const { error } = await supabase.from('children').delete().in('id', ids);
        if (error) throw error;
        res.json({ message: 'Children deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getChildAttendance = async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    try {
        const { count, error } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true })
            .contains('attended_service_ids', [serviceId]);

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
