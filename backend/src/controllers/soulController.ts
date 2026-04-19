import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { toUUID, logLegacyFallback } from '../utils/uuid';
import * as fs from 'fs';
import * as path from 'path';

// --- General Souls ---
export const getSouls = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { sourceId } = req.query;
    try {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        
        while (true) {
            let query = supabase.from('souls')
                .select('*')
                .eq('manifest_id', manifestId)
                .order('created_at', { ascending: false })
                .range(from, from + step - 1);
                
            if (sourceId) {
                const idUuid = toUUID(sourceId as string);
                if (idUuid) {
                    query = query.eq('event_id', idUuid);
                }
            }
            const { data, error } = await query;
            if (error) throw error;
            
            if (data && data.length > 0) {
                allData = allData.concat(data);
            }
            if (!data || data.length < step) {
                break;
            }
            from += step;
        }
        res.json(allData);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};


export const addSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        let eventUuid = toUUID(req.body.event_id);

        if (!eventUuid) {
            return res.status(400).json({ error: "Invalid Event ID. Soul must be linked to a valid event." });
        }

        const payload: any = {
            manifest_id: manifestId, // INJECT TENANT ID
            first_name: req.body.first_name || req.body.firstName,
            last_name: req.body.last_name || req.body.lastName || '',
            phone: req.body.phone,
            email: req.body.email,
            gender: req.body.gender || 'Male',
            residence: req.body.residence || req.body.residency || '',
            status: req.body.status || 'New',
            source_type: req.body.source_type || req.body.sourceType || 'Service',
            source_id: req.body.source_id || req.body.sourceId || eventUuid,
            captured_by: toUUID(req.body.captured_by || req.body.capturedBy) || '00000000-0000-0000-0000-000000000000',
            notes: req.body.notes,
            event_id: eventUuid,
            station_id: toUUID(req.body.station_id || req.body.stationId),
            vehicle_id: toUUID(req.body.vehicle_id || req.body.vehicleId),
            student_status: req.body.student_status || req.body.studentStatus,
            age: req.body.age,
            occupation: req.body.occupation,
            preferred_call_time: req.body.preferred_call_time || req.body.preferredCallTime,
            invited_by: req.body.invited_by || req.body.invitedBy,
            ministry: req.body.ministry
        };

        const idToUse = toUUID(req.body.id);
        if (idToUse) {
            payload.id = idToUse;
        }

        const { data: savedSoul, error } = await supabase.from('souls').upsert(payload, { onConflict: 'id' }).select().single();
        if (error || !savedSoul) {
            console.error("Soul Add DB Error:", error);
            throw error;
        }

        // Unified Ledger Sync
        const unifiedPayload = {
            id: savedSoul.id, // Guarantee identical ID
            manifest_id: manifestId,
            source_category: payload.source_type,
            source_id: payload.source_id,
            soul_count: 1,
            first_name: payload.first_name,
            last_name: payload.last_name,
            phone: payload.phone,
            email: payload.email,
            gender: payload.gender,
            residence: payload.residence,
            status: payload.status,
            notes: payload.notes,
            captured_by: payload.captured_by
        };
        await supabase.from('unified_souls_won').upsert(unifiedPayload, { onConflict: 'id' });

        res.status(201).json({ message: 'Soul saved (upsert)' });
    } catch (error: any) {
        console.error("Soul Add Catch Error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const payload = { ...req.body };
        if (req.body.event_id) {
            payload.event_id = toUUID(req.body.event_id);
        }
        if (req.body.station_id) {
            payload.station_id = toUUID(req.body.station_id);
        }
        if (req.body.vehicle_id) {
            payload.vehicle_id = toUUID(req.body.vehicle_id);
        }

        const { error } = await supabase.from('souls').update(payload).eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;

        // Unified Ledger Sync (Partial Update)
        const unifiedPayload: any = {};
        if (payload.first_name) unifiedPayload.first_name = payload.first_name;
        if (payload.last_name) unifiedPayload.last_name = payload.last_name;
        if (payload.phone) unifiedPayload.phone = payload.phone;
        if (payload.email) unifiedPayload.email = payload.email;
        if (payload.gender) unifiedPayload.gender = payload.gender;
        if (payload.residence) unifiedPayload.residence = payload.residence;
        if (payload.status) unifiedPayload.status = payload.status;
        if (payload.notes) unifiedPayload.notes = payload.notes;
        
        if (Object.keys(unifiedPayload).length > 0) {
            await supabase.from('unified_souls_won').update(unifiedPayload).eq('manifest_id', manifestId).eq('id', id);
        }

        res.json({ message: 'Soul updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase.from('souls').delete().eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;

        // Unified Ledger Cleanup
        await supabase.from('unified_souls_won').delete().eq('manifest_id', manifestId).eq('id', id);

        res.json({ message: 'Soul deleted' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getSoulServiceStats = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    try {
        const idUuid = toUUID(serviceId);
        let query = supabase
            .from('souls')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId); // Tenant Isolation

        if (idUuid) {
            query = query.eq('event_id', idUuid);
        } else {
            // Fallback for extreme cases where event_id is absent but we still want to count Service souls globally? 
            // Usually this endpoint is strictly tied to a service ID.
            query = query.eq('source_type', 'Service');
        }

        const { count: mainCount, error } = await query;

        if (error) throw error;

        const { count: nextGenCount, error: ngError } = await supabase
            .from('next_gen_souls')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('service_id', idUuid);

        if (ngError) throw ngError;

        res.json({ count: (mainCount || 0) + (nextGenCount || 0) });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};


export const getSoulDetails = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { data: soul, error: soulError } = await supabase
            .from('souls')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', toUUID(id))
            .single();

        if (soulError || !soul) throw new Error("Soul not found");

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

        const joinedDate = soul.created_at || new Date().toISOString();
        const dateOnly = joinedDate.substring(0, 10);
        const { count: totalServices } = await supabase
            .from('ministry_events')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('type', 'Service')
            .gte('date', dateOnly)
            .lte('date', new Date().toISOString().substring(0, 10));

        res.json({
            member: {
                id: soul.id,
                name: `${soul.first_name} ${soul.last_name}`,
                phone: soul.phone,
                residency: soul.residence,
                gender: soul.gender,
                category: soul.source_type,
                status: soul.status,
                joinedDate: soul.created_at,
                occupation: soul.occupation
            },
            attendedCount: serviceCount,
            totalServices: totalServices || 0,
            history: history
        });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// --- Next Gen Souls ---
export const getNextGenSouls = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.query;
    try {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        
        while (true) {
            let query = supabase.from('next_gen_souls')
                .select('*')
                .eq('manifest_id', manifestId)
                .order('created_at', { ascending: false })
                .range(from, from + step - 1);
                
            if (serviceId) {
                const uuid = toUUID(serviceId as string);
                if (uuid) {
                    query = query.eq('service_id', uuid);
                } else {
                    query = query.eq('service_id', serviceId); // Let it fail cleanly or match if we ever roll back
                }
            }
            const { data, error } = await query;
            if (error) throw error;
            
            if (data && data.length > 0) {
                allData = allData.concat(data);
            }
            if (!data || data.length < step) {
                break;
            }
            from += step;
        }
        res.json(allData);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addNextGenSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body, manifest_id: manifestId };
        const idToUse = payload.id || crypto.randomUUID();
        payload.id = idToUse;
        
        const { error } = await supabase.from('next_gen_souls').insert([payload]);
        if (error) throw error;

        // Unified Ledger Sync
        const unifiedPayload = {
            id: idToUse,
            manifest_id: manifestId,
            source_category: 'NextGen',
            source_id: payload.service_id,
            soul_count: 1,
            first_name: (payload.child_name || '').trim().split(' ')[0],
            last_name: (payload.child_name || '').trim().split(' ').slice(1).join(' '),
            phone: payload.guardian_contact,
            status: payload.status || 'New',
            notes: payload.notes || payload.follow_up_notes || '',
            captured_by: payload.captured_by
        };
        await supabase.from('unified_souls_won').upsert(unifiedPayload, { onConflict: 'id' });

        res.status(201).json({ message: 'NextGen Soul added' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteNextGenSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase.from('next_gen_souls').delete().eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;

        // Unified Ledger Sync
        await supabase.from('unified_souls_won').delete().eq('manifest_id', manifestId).eq('id', id);

        res.json({ message: 'NextGen Soul deleted' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getNextGenSoulCount = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.params;
    try {
        const uuid = toUUID(serviceId as string);
        const { count, error } = await supabase
            .from('next_gen_souls')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('service_id', uuid);
        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
