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
        let query = supabase.from('souls').select('*').eq('manifest_id', manifestId).order('created_at', { ascending: false }); // Tenant Isolation
        if (sourceId) {
            const idUuid = toUUID(sourceId);
            if (idUuid) {
                query = query.or(`event_id.eq.${idUuid},source_id.eq.${sourceId}`);
            } else {
                query = query.eq('source_id', sourceId);
                logLegacyFallback('souls', String(sourceId), 'getSouls_Source');
            }
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


export const addSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        let eventUuid = toUUID(req.body.event_id || req.body.eventId);

        if (!eventUuid && (req.body.event_id || req.body.eventId)) {
            const inputId = req.body.event_id || req.body.eventId;
            const { data: eventData } = await supabase
                .from('ministry_events')
                .select('id')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .eq('legacy_id', inputId)
                .single();

            if (eventData) {
                eventUuid = eventData.id;
            } else if (inputId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                eventUuid = inputId;
            }
        }

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
            legacy_event_id: req.body.event_id || req.body.eventId,
            legacy_station_id: req.body.station_id || req.body.stationId,
            legacy_vehicle_id: req.body.vehicle_id || req.body.vehicleId,
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

        const { error } = await supabase.from('souls').upsert(payload, { onConflict: 'id' });
        if (error) {
            console.error("Soul Add DB Error:", error);
            throw error;
        }
        res.status(201).json({ message: 'Soul saved (upsert)' });
    } catch (error: any) {
        console.error("Soul Add Catch Error:", error);
        res.status(500).json({ error: error.message });
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
            payload.legacy_event_id = req.body.event_id;
        }
        if (req.body.station_id) {
            payload.station_id = toUUID(req.body.station_id);
            payload.legacy_station_id = req.body.station_id;
        }
        if (req.body.vehicle_id) {
            payload.vehicle_id = toUUID(req.body.vehicle_id);
            payload.legacy_vehicle_id = req.body.vehicle_id;
        }

        const { error } = await supabase.from('souls').update(payload).eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Soul updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase.from('souls').delete().eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Soul deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('source_type', 'Service');

        if (idUuid) {
            query = query.or(`event_id.eq.${idUuid},source_id.eq.${serviceId}`);
        } else {
            query = query.eq('source_id', serviceId);
            logLegacyFallback('souls', serviceId, 'getSoulServiceStats');
        }

        const { count: mainCount, error } = await query;

        if (error) throw error;

        const { count: nextGenCount, error: ngError } = await supabase
            .from('next_gen_souls')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('service_id', idUuid || serviceId);

        if (ngError) throw ngError;

        res.json({ count: (mainCount || 0) + (nextGenCount || 0) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// --- Next Gen Souls ---
export const getNextGenSouls = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceId } = req.query;
    try {
        let query = supabase.from('next_gen_souls').select('*').eq('manifest_id', manifestId).order('created_at', { ascending: false }); // Tenant Isolation
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
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addNextGenSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body, manifest_id: manifestId };
        const { error } = await supabase.from('next_gen_souls').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'NextGen Soul added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteNextGenSoul = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase.from('next_gen_souls').delete().eq('manifest_id', manifestId).eq('id', id);
        if (error) throw error;
        res.json({ message: 'NextGen Soul deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
            .eq('service_id', uuid || serviceId);
        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
