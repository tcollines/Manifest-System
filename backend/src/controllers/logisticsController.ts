import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toUUID, logLegacyFallback } from '../utils/uuid';

export const getStations = async (req: Request, res: Response) => {
    const eventId = req.query.eventId as string;
    try {
        let query = supabase.from('pickup_stations').select('*');
        if (eventId) {
            const idUuid = toUUID(eventId);
            if (idUuid) {
                // event_id is now UUID, legacy_event_id is original TEXT
                query = query.or(`event_id.eq.${idUuid},legacy_event_id.eq.${eventId}`);
            } else {
                query = query.eq('legacy_event_id', eventId);
                logLegacyFallback('pickup_stations', eventId, 'getStations_Event');
            }
        }
        const { data: stations, error } = await query;
        if (error) throw error;

        // Fetch Data Entrants (Users with role 'Logistics' and a station_id)
        const { data: entrants, error: userError } = await supabase
            .from('users')
            .select('id, name, contact, station_id')
            .eq('role', 'Logistics')
            .not('station_id', 'is', null);

        if (userError) console.error("Error fetching entrants:", userError);

        // Map entrants to stations
        const enrichedStations = stations.map(station => {
            // Find entrant for this station (assuming 1 per station for now, or take first)
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
    try {
        const payload = {
            ...req.body,
            id: req.body.id ? toUUID(req.body.id) : uuidv4(),
            legacy_id: req.body.id || null,
            event_id: toUUID(req.body.event_id),
            legacy_event_id: req.body.event_id
        };
        const { error } = await supabase.from('pickup_stations').insert([payload]);
        if (error) throw error;
        res.status(201).json({ message: 'Station added' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateStation = async (req: Request, res: Response) => {
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

        const { error } = await supabase.from('pickup_stations').update(payload).or(`id.eq.${idUuid},legacy_id.eq.${id}`);
        if (error) throw error;
        res.json({ message: 'Station updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteStation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Get all vehicles in station
        const { data: vehicles } = await supabase.from('vehicles').select('id').eq('station_id', id);

        if (vehicles && vehicles.length > 0) {
            const vehicleIds = vehicles.map(v => v.id);

            // 2. Delete all passengers in these vehicles
            const { error: pError } = await supabase.from('passengers').delete().in('vehicle_id', vehicleIds);
            if (pError) throw pError;

            // 3. Delete the vehicles
            const { error: vError } = await supabase.from('vehicles').delete().in('id', vehicleIds);
            if (vError) throw vError;
        }

        // 4. Delete associated Data Entrants (Users)
        const { error: uError } = await supabase.from('users').delete().eq('station_id', id);
        if (uError) throw uError;

        // 5. Delete the station
        const { error } = await supabase.from('pickup_stations').delete().or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`);
        if (error) throw error;

        res.json({ message: 'Station and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
