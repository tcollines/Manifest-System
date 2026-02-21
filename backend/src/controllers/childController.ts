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
        const targetId = c.id || uuidv4();

        // 1. DEDUPLICATION (Manual Logic mimicking RPC)
        const nameNorm = (c.name || '').trim().toLowerCase();
        const contactNorm = (c.parentContact || c.parent_contact || '').replace(/[^0-9]/g, '');

        const { data: existing, error: findError } = await supabase
            .from('children')
            .select('*')
            .eq('manifest_id', manifestId);

        if (findError) throw findError;

        // Filter in JS for precision (Postgres TRIM/LOWER equivalent)
        const match = (existing || []).find(e => {
            const eNameNorm = (e.name || '').trim().toLowerCase();
            const eContactNorm = (e.parent_contact || '').replace(/[^0-9]/g, '');
            return eNameNorm === nameNorm && eContactNorm === contactNorm;
        });

        let result: any;
        if (match) {
            // MERGE Logic
            const updates: any = {
                status: c.status || match.status,
                check_in_time: c.checkInTime || c.check_in_time || match.check_in_time,
                age: c.age || match.age,
                residence: c.residence || match.residence
            };

            if (match.category === 'First Timer') {
                updates.category = 'Member';
            }

            const { data: updated, error: updateError } = await supabase
                .from('children')
                .update(updates)
                .eq('id', match.id)
                .select()
                .single();

            if (updateError) throw updateError;
            result = updated;
            result._meta = { action: 'MERGE', match_reason: 'ON_CONFLICT_MATCH' };
        } else {
            // INSERT Logic
            const isFirstTimer = c.category === 'First Timer';

            const insertData: any = {
                manifest_id: manifestId,
                id: targetId,
                id_legacy_deprecated: targetId,
                name: c.name,
                parent_name: c.parentName || c.parent_name,
                parent_contact: c.parentContact || c.parent_contact,
                age: c.age,
                gender: c.gender,
                residence: c.residence,
                allergies: c.allergies,
                status: c.status,
                check_in_time: c.checkInTime || c.check_in_time,
                joined_date: c.joinedDate || c.joined_date || new Date().toISOString(),
                category: c.category,
                is_first_timer: isFirstTimer,
                first_timer_date: isFirstTimer ? (c.checkInTime ? c.checkInTime.split('T')[0] : new Date().toISOString().split('T')[0]) : null,
                first_timer_service_id: isFirstTimer ? (c.currentServiceId || null) : null
            };

            const { data: inserted, error: insertError } = await supabase
                .from('children')
                .insert(insertData)
                .select()
                .single();

            if (insertError) throw insertError;
            result = inserted;
            result._meta = { action: 'INSERT', match_reason: 'NEW_RECORD' };
        }

        // 2. ATTENDANCE SYNC
        const rawAttendance = c.attendedServiceIds || c.attended_service_ids || [];
        const incomingServiceIds = Array.isArray(rawAttendance) ? rawAttendance : [];

        if (incomingServiceIds.length > 0) {
            const existingIds = result.attended_service_ids || [];
            const combinedIds = Array.from(new Set([...existingIds, ...incomingServiceIds]));

            const { error: syncError } = await supabase
                .from('children')
                .update({ attended_service_ids: combinedIds })
                .eq('id', result.id);

            if (!syncError) {
                result.attended_service_ids = combinedIds;
            }
        }

        res.status(201).json(result);
    } catch (error: any) {
        console.error('[ADD CHILD CONTROLLER ERROR]', error);
        if (error.message && (error.message.includes('unique constraint') || error.message.includes('dedupe'))) {
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
