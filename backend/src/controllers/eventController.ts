import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllEvents = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('ministry_events').select('*').order('date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.from('ministry_events').insert([req.body]);
        if (error) throw error;
        res.status(201).json({ message: 'Event created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('ministry_events').update(req.body).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Event updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Delete Logistics (Stations -> Vehicles -> Passengers)
        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', id);

        if (stations && stations.length > 0) {
            for (const station of stations) {
                // 1.1 Detach Users
                await supabase.from('users').update({ station_id: null }).eq('station_id', station.id);

                // 1.2 Get Vehicles
                const { data: vehicles } = await supabase.from('vehicles').select('id').eq('station_id', station.id);
                if (vehicles && vehicles.length > 0) {
                    const vIds = vehicles.map(v => v.id);
                    // 1.3 Delete Passengers
                    await supabase.from('passengers').delete().in('vehicle_id', vIds);
                    // 1.4 Delete Vehicles
                    await supabase.from('vehicles').delete().in('id', vIds);
                }
                // 1.5 Delete Station
                await supabase.from('pickup_stations').delete().eq('id', station.id);
            }
        }

        // 2. Remove Attendance from Members
        const { data: members } = await supabase.from('members').select('id, attended_service_ids').contains('attended_service_ids', [id]);
        if (members && members.length > 0) {
            for (const m of members) {
                const newIds = (m.attended_service_ids || []).filter((i: string) => i !== id);
                await supabase.from('members').update({ attended_service_ids: newIds }).eq('id', m.id);
            }
        }

        // 3. Remove Attendance from Children
        const { data: children } = await supabase.from('children').select('id, attended_service_ids').contains('attended_service_ids', [id]);
        if (children && children.length > 0) {
            for (const c of children) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== id);
                await supabase.from('children').update({ attended_service_ids: newIds }).eq('id', c.id);
            }
        }

        // 4. Remove Attendance from Personal Vehicles
        const { data: pCars } = await supabase.from('personal_vehicles').select('id, attended_service_ids').contains('attended_service_ids', [id]);
        if (pCars && pCars.length > 0) {
            for (const c of pCars) {
                const newIds = (c.attended_service_ids || []).filter((i: string) => i !== id);
                await supabase.from('personal_vehicles').update({ attended_service_ids: newIds }).eq('id', c.id);
            }
        }

        // 5. Delete Related Incidents (FK Constraint fix)
        await supabase.from('incidents').delete().eq('service_id', id);

        // 6. Delete Related Souls (Cleanup)
        await supabase.from('souls').delete().eq('source_id', id).eq('source_type', 'Service');

        // 7. Delete Volunteer Attendance (FK Constraint fix)
        await supabase.from('volunteer_attendance').delete().eq('service_id', id);

        // 8. Unlink Personal Vehicles (FK Constraint fix)
        await supabase.from('personal_vehicles').update({ current_service_id: null }).eq('current_service_id', id);

        // 9. Delete Related Finance Transactions (FK Constraint fix)
        await supabase.from('transactions').delete().eq('event_id', id);

        // 10. Delete Next Gen Souls (FK Constraint fix - revealed by error)
        await supabase.from('next_gen_souls').delete().eq('service_id', id);

        // 11. Delete the Event itself
        const { error } = await supabase.from('ministry_events').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: 'Event and related data deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
