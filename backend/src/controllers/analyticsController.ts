
import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getServiceAttendance = async (req: Request, res: Response) => {
    try {
        // Fetch all services
        const { data: events, error } = await supabase
            .from('ministry_events')
            .select('id, title, date, description, service_number')
            .eq('type', 'Service')
            .order('date', { ascending: true });

        if (error) throw error;

        if (!events || events.length === 0) {
            return res.json([]);
        }

        // Fetch highlights for each event to get accurate numbers
        const chartDataPromises = events.map(async (event: any) => {
            if (!event.date) return null;

            const { data: highlights, error: rpcError } = await supabase
                .rpc('get_event_highlights', { v_event_id: event.id });

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
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getSoulsWon = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const counts: Record<string, number> = {
            'Services': 0,
            'Events': 0,
            'Public Entry': 0,
            'Residency Outreach': 0,
            'Departments': 0
        };

        // Query unified ledger
        let allUnifiedSouls: any[] = [];
        let hasMore = true;
        let start = 0;
        let limit = 1000;
        
        while (hasMore) {
            const { data: pageSouls, error: soulsError } = await supabase
                .from('unified_souls_won')
                .select('source_category, soul_count')
                .eq('manifest_id', manifestId)
                .range(start, start + limit - 1);

            if (soulsError || !pageSouls || pageSouls.length === 0) {
                hasMore = false;
            } else {
                allUnifiedSouls = [...allUnifiedSouls, ...pageSouls];
                start += limit;
                if (pageSouls.length < limit) hasMore = false;
            }
        }

        allUnifiedSouls.forEach((s: any) => {
            const count = s.soul_count || 1;
            if (s.source_category === 'Service') counts['Services'] += count;
            else if (s.source_category === 'Event') counts['Events'] += count;
            else if (s.source_category === 'Residency Outreach') counts['Residency Outreach'] += count;
            else if (['School Outreach', 'Campus Activity', 'Healing'].includes(s.source_category)) {
                counts['Departments'] += count;
            } else if (s.source_category === 'Passenger') {
                // Historically passengers might be events or services, but for unified ledger let's map loosely or put under Events
                counts['Events'] += count; 
            } else {
                 // Public Entry, NextGen, etc
                counts['Public Entry'] += count;
            }
        });

        // Format for Recharts
        const chartData = Object.keys(counts).map(key => ({
            name: key,
            value: counts[key]
        }));

        res.json(chartData);
    } catch (error: any) {
        console.error('[ANALYTICS] Failed to fetch aggregate souls won:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getDashboardKPIs = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Pre-fetch events to classify Services vs Events
        const { data: allEvents } = await supabase
            .from('ministry_events')
            .select('id, type')
            .eq('manifest_id', manifestId);
        
        const validServiceIds = (allEvents || []).filter(e => e.type === 'Service').map(e => e.id);

        // 1. Active Members
        const p_active = supabase
            .from('members')
            .select('attended_service_ids')
            .eq('manifest_id', manifestId)
            .neq('category', 'First Timer')
            .neq('category', 'Guest')
            .not('attended_service_ids', 'is', null);

        // 2 & 4. Total First Timers
        const p_native = supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('category', 'First Timer')
            .is('first_timer_service_id', null);

        const p_native_with_service = validServiceIds.length > 0 ? supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .in('first_timer_service_id', validServiceIds) : Promise.resolve({ count: 0, data: null, error: null });

        const p_passengers = validServiceIds.length > 0 ? supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .in('is_first_time', ['Yes', 'true'])
            .in('event_id', validServiceIds) : Promise.resolve({ count: 0, data: null, error: null });

        // 3. Next Gen Active
        const p_nextGen = supabase
            .from('children')
            .select('attended_service_ids')
            .eq('manifest_id', manifestId)
            .not('attended_service_ids', 'is', null);

        // 5. Registered Residential Areas
        const p_residences = supabase
            .from('residences')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId);

        // Await all parallel execution
        const allResponses = await Promise.all([
            p_active, 
            p_native, 
            p_native_with_service, 
            p_passengers, 
            p_nextGen, 
            p_residences
        ]);

        const [
            res_active, res_native, res_native_svs, res_passengers, 
            res_nextGen, res_residences
        ] = allResponses;

        const activeMembersCount = (res_active.data || []).filter(m => m.attended_service_ids && m.attended_service_ids.length > 0).length;
        const nextGenActiveCount = (res_nextGen.data || []).filter(m => m.attended_service_ids && m.attended_service_ids.length > 0).length;
        const totalFirstTimers = (res_native.count || 0) + (res_native_svs.count || 0) + (res_passengers.count || 0);

        // 4. Souls Won (using unified ledger WITH pagination for exact sum)
        let totalSoulsWon = 0;
        let hasMoreSouls = true;
        let start = 0;
        const limit = 1000;
        
        while (hasMoreSouls) {
            const { data: pageSouls, error: soulsError } = await supabase
                .from('unified_souls_won')
                .select('soul_count')
                .eq('manifest_id', manifestId)
                .range(start, start + limit - 1);

            if (soulsError || !pageSouls || pageSouls.length === 0) {
                hasMoreSouls = false;
            } else {
                totalSoulsWon += pageSouls.reduce((sum: number, s: any) => sum + (s.soul_count || 1), 0);
                start += limit;
                if (pageSouls.length < limit) hasMoreSouls = false;
            }
        }

        return res.json({
            activeMembers: activeMembersCount,
            totalSoulsWon: totalSoulsWon,
            nextGenActive: nextGenActiveCount,
            totalFirstTimers: totalFirstTimers,
            registeredResidences: res_residences.count || 0
        });

    } catch (error: any) {
        console.error('[ANALYTICS] Failed to fetch KPI Dashboard Stats:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
export const getFollowUpAnalysis = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // 1. Get the last 3 services
        const { data: recentServices, error: eventsError } = await supabase
            .from('ministry_events')
            .select('id, date')
            .eq('manifest_id', manifestId)
            .eq('type', 'Service')
            .order('date', { ascending: false })
            .limit(3);

        if (eventsError) throw eventsError;
        if (!recentServices || recentServices.length === 0) {
            return res.json([]);
        }

        const recentServiceIds = recentServices.map(s => s.id);

        // 2. Build a map of all services to get their dates for "Last service attended"
        const { data: allServices } = await supabase
            .from('ministry_events')
            .select('id, date')
            .eq('manifest_id', manifestId)
            .eq('type', 'Service');
            
        const serviceDateMap = new Map<string, string>();
        if (allServices) {
            allServices.forEach(s => serviceDateMap.set(s.id, s.date));
        }

        // 3. Query Members
        // We fetch members and filter in JS to avoid complex array Postgres syntaxes that occasionally fail in JS clients
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id, name, phone, attended_service_ids, follow_up_status, follow_up_notes')
            .eq('manifest_id', manifestId);

        if (membersError) throw membersError;

        // 4. Client-side filter
        const followUpMembers = [];
        
        for (const member of (members || [])) {
            const attendedIds = member.attended_service_ids || [];
            
            // Condition 1: Must have attended > 0 services
            if (attendedIds.length === 0) continue;
            
            // Condition 2: Must NOT have attended ANY of the last 3 services
            const attendedAnyRecent = recentServiceIds.some(id => attendedIds.includes(id));
            if (attendedAnyRecent) continue;
            
            // If they passed both conditions, find their last service date
            let lastDate = 'Unknown';
            let maxTime = 0;
            
            attendedIds.forEach((id: string) => {
                const dateStr = serviceDateMap.get(id);
                if (dateStr) {
                    const time = new Date(dateStr).getTime();
                    if (time > maxTime) {
                        maxTime = time;
                        lastDate = new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                }
            });
            
            followUpMembers.push({
                id: member.id,
                name: member.name,
                phone: member.phone,
                lastServiceAttended: lastDate,
                lastServiceTime: maxTime,
                followUpStatus: member.follow_up_status || 'Pending',
                followUpNotes: member.follow_up_notes || ''
            });
        }
        
        // Sort by lastServiceTime descending so the most recently lost are at top
        followUpMembers.sort((a, b) => b.lastServiceTime - a.lastServiceTime);

        res.json(followUpMembers);
    } catch (error: any) {
        console.error('[GET FOLLOW UP ANALYSIS ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
