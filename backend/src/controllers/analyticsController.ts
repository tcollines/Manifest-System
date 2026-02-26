
import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getServiceAttendance = async (req: Request, res: Response) => {
    try {
        // Get start of current year
        const currentYear = new Date().getFullYear();
        const startDate = `${currentYear}-01-01`;

        // Fetch services since start of year
        const { data: events, error } = await supabase
            .from('ministry_events')
            .select('id, title, date, description, service_number')
            .eq('type', 'Service')
            .gte('date', startDate)
            .order('date', { ascending: true });

        if (error) throw error;

        if (!events || events.length === 0) {
            return res.json([]);
        }

        // Fetch highlights for each event to get accurate numbers
        const chartDataPromises = events.map(async (event: any) => {
            if (!event.date) return null;

            const { data: highlights, error: rpcError } = await supabase
                .rpc('get_event_highlights', { event_uuid: event.id });

            if (rpcError) {
                console.error(`RPC Error for event ${event.id}:`, rpcError);
                return null;
            }

            const date = new Date(event.date);
            // Format: "Jan 4"
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
                name: formattedDate, // "Jan 4" - Specific Date
                title: event.title,
                description: event.description,
                serviceNumber: event.service_number,
                value: highlights?.attendees || 0,
                fullDate: event.date
            };
        });

        const results = await Promise.all(chartDataPromises);
        const chartData = results.filter(item => item !== null);

        res.json(chartData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSoulsWon = async (req: Request, res: Response) => {
    try {
        // Fetch all souls to aggregate by source type
        const { data: souls, error } = await supabase
            .from('souls')
            .select('source_type');

        if (error) throw error;

        // Aggregate counts
        const counts: Record<string, number> = {};

        souls?.forEach((soul: any) => {
            const type = soul.source_type || 'Other';
            counts[type] = (counts[type] || 0) + 1;
        });

        const chartData = Object.keys(counts).map(key => ({
            name: key,
            value: counts[key]
        }));

        res.json(chartData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
