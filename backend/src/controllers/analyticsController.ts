
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
        res.status(500).json({ error: error.message });
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

        // Pre-fetch events to classify Services vs Events
        const { data: allEvents, error: eventsError } = await supabase
            .from('ministry_events')
            .select('id, type')
            .eq('manifest_id', manifestId);

        const eventTypeMap = new Map<string, string>();
        if (!eventsError && allEvents) {
            allEvents.forEach((e: any) => eventTypeMap.set(e.id, e.type));
        }

        // 1. Fetch individual souls from public.souls
        const { data: individualSouls, error: soulsError } = await supabase
            .from('souls')
            .select('id, event_id')
            .eq('manifest_id', manifestId);

        if (!soulsError && individualSouls) {
            individualSouls.forEach((s: any) => {
                if (s.event_id) {
                    const type = eventTypeMap.get(s.event_id);
                    if (type === 'Service') counts['Services']++;
                    else if (type === 'Event') counts['Events']++;
                    else counts['Public Entry']++;
                } else {
                    counts['Public Entry']++;
                }
            });
        }

        // 2. Fetch souls_won from passengers (representing souls won during services/events)
        const { data: passengers, error: passengersError } = await supabase
            .from('passengers')
            .select('id, event_id')
            .eq('manifest_id', manifestId)
            .eq('soul_won', true);

        if (!passengersError && passengers) {
            passengers.forEach((p: any) => {
                if (p.event_id) {
                    const type = eventTypeMap.get(p.event_id);
                    if (type === 'Service') counts['Services']++;
                    else if (type === 'Event') counts['Events']++;
                }
            });
        }

        // 3. Fetch souls_won from residence_outreach_reports
        const { data: reports, error: reportsError } = await supabase
            .from('residence_outreach_reports')
            .select('souls_won')
            .eq('manifest_id', manifestId);

        if (!reportsError && reports) {
            counts['Residency Outreach'] = reports.reduce((sum: number, report: any) => sum + (report.souls_won || 0), 0);
        }

        // 4. Fetch souls won from school_outreach_reports
        const { data: schoolReports, error: schoolReportsError } = await supabase
            .from('school_outreach_reports')
            .select('souls_won')
            .eq('manifest_id', manifestId);

        if (!schoolReportsError && schoolReports) {
            counts['Departments'] += schoolReports.reduce((sum: number, report: any) => sum + (report.souls_won || 0), 0);
        }

        // 5. Fetch souls won from campus_activities
        const { data: campusReports, error: campusReportsError } = await supabase
            .from('campus_activities')
            .select('souls_won')
            .eq('manifest_id', manifestId);

        if (!campusReportsError && campusReports) {
            counts['Departments'] += campusReports.reduce((sum: number, report: any) => sum + (report.souls_won || 0), 0);
        }

        // 6. Fetch souls won from healing_reports
        const { data: healingReports, error: healingReportsError } = await supabase
            .from('healing_reports')
            .select('souls_count')
            .eq('manifest_id', manifestId);

        if (!healingReportsError && healingReports) {
            counts['Departments'] += healingReports.reduce((sum: number, report: any) => sum + (report.souls_count || 0), 0);
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
        const validServiceSet = new Set(validServiceIds);

        let activeMembersCount = 0;
        let totalFirstTimers = 0;

        // 1 & 4. Active Members + First Timers via Paginated Fetch to prevent OOM
        let page = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('members')
                .select('category, attended_service_ids, first_timer_service_id')
                .eq('manifest_id', manifestId)
                .range(page * limit, (page + 1) * limit - 1);
            
            if (error) throw error;
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                activeMembersCount += data.filter(m => 
                    m.category !== 'First Timer' && 
                    m.category !== 'Guest' && 
                    m.attended_service_ids && 
                    m.attended_service_ids.length > 0
                ).length;

                totalFirstTimers += data.filter(m => {
                    if (m.first_timer_service_id) {
                        return validServiceSet.has(m.first_timer_service_id);
                    }
                    return m.category === 'First Timer';
                }).length;

                if (data.length < limit) hasMore = false;
                else page++;
            }
        }

        // Include Passengers for First Timers calculation ONLY for Services natively
        let firstTimersPassengers = 0;
        let passPage = 0;
        let passHasMore = true;
        while (passHasMore) {
            const { data, error } = await supabase
                .from('passengers')
                .select('event_id, is_first_time')
                .eq('manifest_id', manifestId)
                .eq('is_first_time', 'Yes')
                .range(passPage * limit, (passPage + 1) * limit - 1);
            
            if (error) throw error;
            if (!data || data.length === 0) {
                 passHasMore = false;
            } else {
                 firstTimersPassengers += data.filter(p => validServiceSet.has(p.event_id)).length;
                 if (data.length < limit) passHasMore = false;
                 else passPage++;
            }
        }
        totalFirstTimers += firstTimersPassengers;

        // 2. Souls Won (Simple fast count)
        const { count: soulsCount } = await supabase
            .from('souls')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId);
        
        const { count: soulsPassengersCount } = await supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId)
            .eq('soul_won', true);

        // We could aggregate department souls here, but since the user requested to strictly mirror the dashboard KPI which likely just wanted core souls table + passenger souls (or simply all of them).
        // Let's grab the departments just in case
        let departmentalSouls = 0;
        const tables = ['residence_outreach_reports', 'school_outreach_reports', 'campus_activities'];
        for (const table of tables) {
            const { data } = await supabase.from(table).select('souls_won').eq('manifest_id', manifestId);
            departmentalSouls += (data || []).reduce((sum: number, rep: any) => sum + (rep.souls_won || 0), 0);
        }

        const { data: healingData } = await supabase.from('healing_reports').select('souls_count').eq('manifest_id', manifestId);
        departmentalSouls += (healingData || []).reduce((sum: number, rep: any) => sum + (rep.souls_count || 0), 0);

        const totalSoulsWon = (soulsCount || 0) + (soulsPassengersCount || 0) + departmentalSouls;

        // 3. Next Gen Active
        let nextGenActiveCount = 0;
        let cPage = 0;
        let cHasMore = true;
        while (cHasMore) {
            const { data, error } = await supabase
                .from('children')
                .select('category, attended_service_ids')
                .eq('manifest_id', manifestId)
                .range(cPage * limit, (cPage + 1) * limit - 1);
            if (error) throw error;
            if (!data || data.length === 0) {
                cHasMore = false;
            } else {
                nextGenActiveCount += data.filter(c => 
                    c.attended_service_ids && 
                    c.attended_service_ids.length > 0
                ).length;
                if (data.length < limit) cHasMore = false;
                else cPage++;
            }
        }

        // 5. Registered Residential Areas
        const { count: residentialCount } = await supabase
            .from('residences')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId);

        return res.json({
            activeMembers: activeMembersCount,
            totalSoulsWon: totalSoulsWon,
            nextGenActive: nextGenActiveCount,
            totalFirstTimers: totalFirstTimers,
            registeredResidences: residentialCount || 0
        });

    } catch (error: any) {
        console.error('[ANALYTICS] Failed to fetch KPI Dashboard Stats:', error);
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
};
