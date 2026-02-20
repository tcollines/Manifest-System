import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

export const getStations = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const eventId = req.query.eventId as string;
    try {
        let query = supabase.from('pickup_stations').select('*').eq('manifest_id', manifestId); // Tenant Isolation
        if (eventId) {
            const idUuid = toUUID(eventId);
            if (idUuid) {
                query = query.or(`event_id.eq.${idUuid},legacy_event_id.eq.${eventId}`);
            } else {
                query = query.eq('legacy_event_id', eventId);
                logLegacyFallback('pickup_stations', eventId, 'getStations_Event');
            }
        }
        const { data: stations, error } = await query;
        if (error) throw error;

        const { data: entrants, error: userError } = await supabase
            .from('users')
            .select('id, name, contact, station_id')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('role', 'Logistics')
            .not('station_id', 'is', null);

        if (userError) console.error("Error fetching entrants:", userError);

        const enrichedStations = (stations || []).map(station => {
            const entrant = entrants?.find(u => u.station_id === station.id || u.station_id === station.legacy_id);
            return {
                ...station,
                data_entrant_id: entrant?.id || null,
                data_entrant_name: entrant?.name || null,
                data_entrant_contact: entrant?.contact || null
            };
        });

        res.json(enrichedStations);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addStation = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = {
            ...req.body,
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            legacy_id: req.body.id || null,
            event_id: toUUID(req.body.event_id),
            legacy_event_id: req.body.event_id,
            manifest_id: manifestId // INJECT TENANT ID
        };
        const { error } = await supabase.from('pickup_stations').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Station added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateStation = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const payload = { ...req.body };
        const idUuid = toUUID(id);
        if (idUuid) {
            payload.id = idUuid;
            payload.legacy_id = id;
        }
        if (payload.event_id) {
            payload.legacy_event_id = payload.event_id;
            payload.event_id = toUUID(payload.event_id);
        }

        const { error } = await supabase.from('pickup_stations')
            .update(payload)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Station updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteStation = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { data: vehicles } = await supabase.from('vehicles').select('id')
            .eq('manifest_id', manifestId).eq('station_id', id);

        if (vehicles && vehicles.length > 0) {
            const vehicleIds = vehicles.map(v => v.id);

            const { error: pError } = await supabase.from('passengers').delete()
                .eq('manifest_id', manifestId).in('vehicle_id', vehicleIds);
            if (pError) throw pError;

            const { error: vError } = await supabase.from('vehicles').delete()
                .eq('manifest_id', manifestId).in('id', vehicleIds);
            if (vError) throw vError;
        }

        const { error: uError } = await supabase.from('users').delete()
            .eq('manifest_id', manifestId).eq('station_id', id);
        if (uError) throw uError;

        const { error } = await supabase.from('pickup_stations').delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`);
        if (error) throw error;

        res.json({ message: 'Station and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
