import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

// Residences

export const getResidences = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('residences')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addResidence = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body, manifest_id: manifestId };

        // --- NEW: Auto-Create User for Residence Coordinator ---
        const { coordinator_email, coordinator_name, coordinator_contact } = payload;

        if (coordinator_email && coordinator_name) {
            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', coordinator_email)
                .eq('manifest_id', manifestId)
                .maybeSingle();

            if (!existingUser) {
                // --- NEW: Auto-Provision Auth Identity for SSO only (no password) ---
                let authUserId = null;

                // Create GoTrue user without a password (forces SSO/Magic Link)
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: coordinator_email,
                    email_confirm: true, // Auto-confirm to allow immediate login via Google
                    user_metadata: { manifest_id: manifestId }
                });

                if (authError) {
                    console.error("[addResidence] Auth Provisioning Error:", authError);
                    // Do not fail the whole residence creation if auth fails, but log it.
                    // If the user already exists in auth but not public.users, we can still link them.
                    if (authError.message.includes('already been registered')) {
                         console.log("User already exists in GoTrue auth, attempting to find existing profile for ID.");
                         const { data: globalMatch } = await supabase
                            .from('users')
                            .select('id')
                            .eq('email', coordinator_email)
                            .order('created_at', { ascending: true })
                            .limit(1)
                            .maybeSingle();
                         
                         if (globalMatch) {
                             authUserId = globalMatch.id;
                         } else {
                             authUserId = uuidv4(); // Fallback if absolutely no record exists to satisfy not-null
                         }
                    } else {
                         throw new Error('Failed to provision authentication credentials: ' + authError.message);
                    }
                } else if (authData.user) {
                    authUserId = authData.user.id;
                     // Bake manifest_id into app_metadata immediately
                    await supabase.auth.admin.updateUserById(authUserId, {
                        app_metadata: { manifest_id: manifestId }
                    }).catch(e => console.error("[addResidence] Failed to bake app_metadata:", e));
                }

                // Insert public profile, linking ID if Auth was created
                const newProfile: any = {
                    manifest_id: manifestId,
                    name: coordinator_name,
                    email: coordinator_email,
                    username: coordinator_email.split('@')[0],
                    contact: coordinator_contact || null,
                    role: 'Resident Coordinator',
                    status: 'Active'
                };
                
                if (authUserId) {
                    newProfile.id = authUserId;
                } else {
                    newProfile.id = uuidv4();
                }

                const { error: dbError } = await supabase.from('users').insert([newProfile]);

                if (dbError) {
                    console.error("[addResidence] DB Insert failed for coordinator", dbError);
                    // Rollback Auth if DB fails and we created it
                    if (authUserId && !authError) {
                        await supabase.auth.admin.deleteUser(authUserId);
                    }
                    throw dbError;
                }
            }
        }

        // Insert the Residence
        const { data, error } = await supabase
            .from('residences')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('[addResidence Error]:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteResidence = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    try {
        // 1. Get the Residence Details so we know the coordinator's email and residence name
        const { data: residence, error: fetchError } = await supabase
            .from('residences')
            .select('name, coordinator_email')
            .eq('id', id)
            .eq('manifest_id', manifestId)
            .single();

        if (fetchError || !residence) throw new Error('Could not fetch residence details for deletion');

        // 2. Clear out the residency from all assigned members
        const { error: memberError } = await supabase
            .from('members')
            .update({ residency: null })
            .eq('residency', residence.name)
            .eq('manifest_id', manifestId);

        if (memberError) console.error("[deleteResidence] Member Reset Error:", memberError);

        // 3. Delete the specific Resident Coordinator from the users table
        if (residence.coordinator_email) {
            const { error: userError } = await supabase
                .from('users')
                .delete()
                .eq('email', residence.coordinator_email)
                .eq('role', 'Resident Coordinator')
                .eq('manifest_id', manifestId);

            if (userError) console.error("[deleteResidence] User Deletion Error:", userError);
        }

        // 4. Finally, delete the Residence from the DB (outreach reports will cascade delete automatically)
        const { error } = await supabase
            .from('residences')
            .delete()
            .eq('id', id)
            .eq('manifest_id', manifestId);

        if (error) throw error;
        res.json({ message: 'Residence and all associated info deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getResidenceMembers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    try {
        // First get the residence name
        const { data: residence, error: resError } = await supabase
            .from('residences')
            .select('name')
            .eq('id', id)
            .eq('manifest_id', manifestId)
            .single();

        if (resError) throw resError;
        if (!residence) return res.status(404).json({ error: 'Residence not found' });

        // Now find exact members
        const { data: members, error: memError } = await supabase
            .from('members')
            .select('*')
            .eq('manifest_id', manifestId)
            .eq('residency', residence.name);

        if (memError) throw memError;
        res.json(members);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// Outreach Reports

export const getResidentReports = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('residence_outreach_reports')
            .select('*, residences(name)')
            .eq('manifest_id', manifestId)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addResidentReport = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = { ...req.body, manifest_id: manifestId };
        const { data, error } = await supabase
            .from('residence_outreach_reports')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        // Unified Ledger Sync
        if (data && data.souls_won > 0) {
            const unifiedPayload = {
                id: data.id,
                manifest_id: manifestId,
                source_category: 'Residency Outreach',
                source_id: data.id,
                soul_count: data.souls_won,
                notes: data.notes || '',
                captured_by: data.submitted_by || ''
            };
            await supabase.from('unified_souls_won').insert([unifiedPayload]);
        }

        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
