
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
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const counts: Record<string, number> = {
            'Public Entry': 0,
            'Events & Services': 0,
            'Residency Outreach': 0
        };

        // 1. Fetch individual souls from public.souls
        const { data: individualSouls, error: soulsError } = await supabase
            .from('souls')
            .select('id')
            .eq('manifest_id', manifestId);

        if (!soulsError && individualSouls) {
            counts['Public Entry'] += individualSouls.length;
        }

        // 2. Fetch souls_won from passengers (representing souls won during services/events)
        const { data: passengers, error: passengersError } = await supabase
            .from('passengers')
            .select('id')
            .eq('manifest_id', manifestId)
            .eq('soul_won', true);

        if (!passengersError && passengers) {
            counts['Events & Services'] = passengers.length;
        }

        // 3. Fetch souls_won from residence_outreach_reports
        const { data: reports, error: reportsError } = await supabase
            .from('residence_outreach_reports')
            .select('souls_won')
            .eq('manifest_id', manifestId);

        if (!reportsError && reports) {
            counts['Residency Outreach'] = reports.reduce((sum: number, report: any) => sum + (report.souls_won || 0), 0);
        }

        // Format for Recharts
        const chartData = Object.keys(counts).map(key => ({
            name: key,
            value: counts[key]
        }));

        res.json(chartData);
    } catch (error: any) {
        console.error('[ANALYTICS] Failed to fetch aggregate souls won:', error);
        res.status(500).json({ error: error.message });
    }
};
