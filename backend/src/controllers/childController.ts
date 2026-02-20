import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export const getChildren = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const c = req.body;

        const rpcParams = {
            _manifest_id: manifestId, // INJECT TENANT ID
            _id: c.id || uuidv4(),
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
        if (error.message && (error.message.includes('idx_children_unique_identity') || error.message.includes('unique constraint') || error.message.includes('idx_children_name_contact_dedupe'))) {
            res.status(409).json({ error: 'This child is already registered in this Manifest.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

export const bulkAddChildren = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { children } = req.body;
        const injectedChildren = children.map((c: any) => ({
            ...c,
            manifest_id: manifestId // INJECT TENANT ID
        }));
        const { error } = await supabase.from('children').insert(injectedChildren);
        if (error) throw error;
        res.status(201).json({ message: 'Children added in bulk' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateChild = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const updates = req.body;
        delete updates.id;
        delete updates._meta;

        delete updates.id_uuid;
        delete updates.legacy_id;
        delete updates.id_legacy_deprecated;

        if (updates.status === 'Checked In' || updates.check_in_time || updates.checkInTime) {
            const { data: current } = await supabase
                .from('children')
                .select('category')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .or(`id.eq.${id},legacy_id.eq.${id}`)
                .single();

            if (current && current.category === 'First Timer') {
                updates.category = 'Member';
            }
        }

        const { error } = await supabase
            .from('children')
            .update(updates)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${id},legacy_id.eq.${id}`);

        if (error) throw error;
        res.json({ message: 'Child updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteChild = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('children')
            .delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${id},legacy_id.eq.${id}`);

        if (error) throw error;
        res.json({ message: 'Child deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkDeleteChildren = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { ids } = req.body;
    try {
        const { error } = await supabase.from('children').delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .in('id', ids);
        if (error) throw error;
        res.json({ message: 'Children deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getChildAttendance = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    try {
        const { count, error } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .contains('attended_service_ids', [serviceId]);

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
