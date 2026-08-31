import { Request, Response } from 'express';
import { supabase, supabaseAnon } from '../supabase';

/**
 * Admin Council Controller
 * 
 * Cross-manifest oversight endpoints. All queries use the service-role client
 * to bypass RLS and read across all manifests.
 */

// ─── Login ────────────────────────────────────────────────────────────────────

export const adminLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase().trim();

        // 1. Verify the email is in admin_council_users
        const { data: councilUser, error: councilError } = await supabase
            .from('admin_council_users')
            .select('id, email, name, role')
            .eq('email', normalizedEmail)
            .single();

        if (councilError || !councilUser) {
            // Delay to mitigate timing attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 2. Authenticate via Supabase Auth (anon client for session generation)
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
            email: normalizedEmail,
            password
        });

        if (authError || !authData?.session) {
            console.log('[ADMIN-COUNCIL LOGIN] Auth failed:', authError?.message);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('[ADMIN-COUNCIL LOGIN SUCCESS]', normalizedEmail);

        res.json({
            session: authData.session,
            user: {
                id: councilUser.id,
                email: councilUser.email,
                name: councilUser.name,
                role: councilUser.role,
            }
        });
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL LOGIN ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── Overview KPIs ────────────────────────────────────────────────────────────

export const getOverview = async (_req: Request, res: Response) => {
    try {
        // Parallel count queries across all manifests
        const [
            manifestsRes,
            usersRes,
            membersRes,
            eventsRes,
        ] = await Promise.all([
            supabase.from('manifest_details').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }).neq('status', 'Deleted'),
            supabase.from('members').select('*', { count: 'exact', head: true }),
            supabase.from('ministry_events').select('*', { count: 'exact', head: true }),
        ]);

        res.json({
            totalManifests: manifestsRes.count || 0,
            totalUsers: usersRes.count || 0,
            totalMembers: membersRes.count || 0,
            totalEvents: eventsRes.count || 0,
        });
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL] Overview error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// ─── List All Manifests ───────────────────────────────────────────────────────

export const getAllManifests = async (_req: Request, res: Response) => {
    try {
        // 1. Fetch all manifests
        const { data: manifests, error: manifestError } = await supabase
            .from('manifest_details')
            .select('*')
            .order('created_at', { ascending: false });

        if (manifestError) throw manifestError;
        if (!manifests || manifests.length === 0) {
            return res.json([]);
        }

        // 2. For each manifest, compute stats
        const enrichedManifests = await Promise.all(
            manifests.map(async (manifest: any) => {
                const mid = manifest.id;

                const [usersRes, membersRes, eventsRes, soulsRes, childrenRes, passengersRes] = await Promise.all([
                    supabase.from('users').select('*', { count: 'exact', head: true })
                        .eq('manifest_id', mid).neq('status', 'Deleted'),
                    supabase.from('members').select('*', { count: 'exact', head: true })
                        .eq('manifest_id', mid),
                    supabase.from('ministry_events').select('*', { count: 'exact', head: true })
                        .eq('manifest_id', mid),
                    supabase.from('unified_souls_won').select('*', { count: 'exact', head: true })
                        .eq('manifest_id', mid),
                    supabase.from('children').select('*', { count: 'exact', head: true })
                        .eq('manifest_id', mid),
                    supabase.from('passengers').select('*', { count: 'exact', head: true })
                        .eq('manifest_id', mid),
                ]);

                const userCount = usersRes.count || 0;
                const memberCount = membersRes.count || 0;
                const eventCount = eventsRes.count || 0;
                const soulsCount = soulsRes.count || 0;
                const childrenCount = childrenRes.count || 0;
                const passengerCount = passengersRes.count || 0;
                const totalRecords = userCount + memberCount + eventCount + soulsCount + childrenCount + passengerCount;

                return {
                    id: manifest.id,
                    name: manifest.name,
                    region: manifest.region || 'Unassigned',
                    contact: manifest.contact,
                    address: manifest.address,
                    description: manifest.description,
                    logoUrl: manifest.logo_url,
                    currency: manifest.currency,
                    createdAt: manifest.created_at,
                    stats: {
                        users: userCount,
                        members: memberCount,
                        events: eventCount,
                        souls: soulsCount,
                        children: childrenCount,
                        passengers: passengerCount,
                        totalRecords,
                    }
                };
            })
        );

        res.json(enrichedManifests);
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL] List manifests error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// ─── Get Single Manifest ─────────────────────────────────────────────────────

export const getManifestById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const { data: manifest, error } = await supabase
            .from('manifest_details')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !manifest) {
            return res.status(404).json({ error: 'Manifest not found' });
        }

        // Compute detailed stats
        const [usersRes, membersRes, eventsRes, soulsRes, childrenRes, passengersRes] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true })
                .eq('manifest_id', id).neq('status', 'Deleted'),
            supabase.from('members').select('*', { count: 'exact', head: true })
                .eq('manifest_id', id),
            supabase.from('ministry_events').select('*', { count: 'exact', head: true })
                .eq('manifest_id', id),
            supabase.from('unified_souls_won').select('*', { count: 'exact', head: true })
                .eq('manifest_id', id),
            supabase.from('children').select('*', { count: 'exact', head: true })
                .eq('manifest_id', id),
            supabase.from('passengers').select('*', { count: 'exact', head: true })
                .eq('manifest_id', id),
        ]);

        res.json({
            id: manifest.id,
            name: manifest.name,
            region: manifest.region || 'Unassigned',
            contact: manifest.contact,
            address: manifest.address,
            description: manifest.description,
            logoUrl: manifest.logo_url,
            currency: manifest.currency,
            coordinates: manifest.coordinates,
            soulsTarget: manifest.souls_target,
            createdAt: manifest.created_at,
            stats: {
                users: usersRes.count || 0,
                members: membersRes.count || 0,
                events: eventsRes.count || 0,
                souls: soulsRes.count || 0,
                children: childrenRes.count || 0,
                passengers: passengersRes.count || 0,
                totalRecords: (usersRes.count || 0) + (membersRes.count || 0) + (eventsRes.count || 0) +
                              (soulsRes.count || 0) + (childrenRes.count || 0) + (passengersRes.count || 0),
            }
        });
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL] Get manifest error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// ─── Create Manifest ──────────────────────────────────────────────────────────

export const createManifest = async (req: Request, res: Response) => {
    const { name, region, contact, address, description, currency, teamLeaderName, teamLeaderEmail, teamLeaderContact } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Manifest name is required' });
    }

    try {
        const payload = {
            name,
            region: region || 'Unassigned',
            contact: contact || '',
            address: address || '',
            description: description || '',
            currency: currency || 'UGX',
        };

        const { data, error } = await supabase
            .from('manifest_details')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        // Create Team Leader if provided
        if (teamLeaderEmail && teamLeaderName) {
            console.log(`[ADMIN-COUNCIL] Creating Team Leader: ${teamLeaderEmail}`);
            const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(teamLeaderEmail, {
                data: {
                    name: teamLeaderName,
                    role: 'Team Leader'
                }
            });

            if (authError) {
                console.error('[ADMIN-COUNCIL] Failed to invite team leader:', authError);
                // Non-fatal error, the manifest is already created.
            } else if (authData?.user) {
                const { error: userError } = await supabase.from('users').insert({
                    id: authData.user.id,
                    name: teamLeaderName,
                    email: teamLeaderEmail,
                    contact: teamLeaderContact || '',
                    role: 'Team Leader',
                    manifest_id: data.id,
                    status: 'Active',
                    created_at: new Date().toISOString()
                });

                if (userError) {
                    console.error('[ADMIN-COUNCIL] Failed to insert team leader into users table:', userError);
                }
            }
        }

        console.log('[ADMIN-COUNCIL] Created manifest:', data.id, data.name);
        res.status(201).json(data);
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL] Create manifest error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// ─── Update Manifest ──────────────────────────────────────────────────────────

export const updateManifest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const payload: Record<string, any> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.region !== undefined) payload.region = updates.region;
        if (updates.contact !== undefined) payload.contact = updates.contact;
        if (updates.address !== undefined) payload.address = updates.address;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.currency !== undefined) payload.currency = updates.currency;
        if (updates.logoUrl !== undefined) payload.logo_url = updates.logoUrl;
        if (updates.coordinates !== undefined) payload.coordinates = updates.coordinates;
        if (updates.soulsTarget !== undefined) payload.souls_target = updates.soulsTarget;

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const { data, error } = await supabase
            .from('manifest_details')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Manifest not found' });

        console.log('[ADMIN-COUNCIL] Updated manifest:', id);
        res.json(data);
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL] Update manifest error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// ─── Get Users for a Manifest ─────────────────────────────────────────────────

export const getManifestUsers = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, role, email, username, contact, department_id, station_id, status, created_at')
            .eq('manifest_id', id)
            .neq('status', 'Deleted')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('[ADMIN-COUNCIL] Get manifest users error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
