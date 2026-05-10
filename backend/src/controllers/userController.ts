import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const getAllUsers = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const role = req.query.role as string;
    const eventId = req.query.eventId as string;
    const departmentId = req.query.departmentId as string;
    const stationId = req.query.stationId as string;
    const validEventId = (eventId && eventId !== 'undefined' && eventId !== 'null') ? eventId : null;

    try {
        if (role === 'Coordinator' && !validEventId) {
            console.warn('[BACKEND] Blocked global coordinator fetch attempt. Missing eventId.');
            return res.json([]);
        }

        let query = supabase.from('users').select('*')
            .eq('manifest_id', manifestId)
            .neq('status', 'Deleted')
            .neq('status', 'Inactive'); // Filter out event-ended inactive users
        if (role) query = query.eq('role', role);
        if (validEventId) query = query.eq('event_id', validEventId);
        if (departmentId) query = query.eq('department_id', departmentId);
        if (stationId) query = query.eq('station_id', stationId);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    const user = (req as any).user;

    if (!manifestId || !user) {
        return res.status(401).json({
            error: 'Unauthorized',
            details: `Missing ${!user ? 'user context' : 'manifest association'}.`
        });
    }

    try {
        // Prevent stale browser caching on profile authentications
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .eq('manifest_id', manifestId)
            .maybeSingle();

        // Fallback by email if ID lookup fails
        if (!data && !error && user.email) {
            console.warn(`[PROFILE FALLBACK] Row not found by ID (${user.id}). Trying email: ${user.email}`);
            const { data: emailData, error: emailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', user.email)
                .eq('manifest_id', manifestId)
                .order('name', { ascending: false, nullsFirst: false }) // Prioritize profiles with a name
                .limit(1)
                .maybeSingle();

            if (emailData) {
                data = emailData;
                console.log(`[PROFILE SUCCESS] Found via email fallback for ${user.email}`);
            }
        }

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'User profile not found in database' });

        res.json(data);
    } catch (error: any) {
        console.error('[PROFILE ERROR]', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};


export const createUser = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = {
            ...req.body,
            manifest_id: manifestId, // INJECT TENANT ID
            department_id: req.body.departmentId || req.body.department_id || null,
            station_id: req.body.stationId || req.body.station_id || null,
            event_id: req.body.eventId || req.body.event_id || null,
        };
        delete payload.departmentId;
        delete payload.stationId;
        delete payload.eventId;

        if (payload.username) {
            payload.username = payload.username.replace(/\s+/g, '');
        }

        // Prevent Duplicate Usernames natively at the API level
        if (payload.username) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', payload.username)
                .neq('status', 'Deleted')
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }

        // --- NEW: Auto-Provision Auth Identity ---
        let authUserId = null;
        if (payload.password && (payload.email || payload.username)) {
            // Generate unique synthetic email if none provided to prevent collisions with soft-deleted users
            const synthSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            const targetEmail = payload.email || `${payload.username.toLowerCase().replace(/\s+/g, '')}_${synthSuffix}@manifest.local`;

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: targetEmail,
                password: payload.password,
                email_confirm: true, // Auto-confirm to allow immediate login
                user_metadata: { manifest_id: manifestId }
            });

            if (authError) {
                console.error("[createUser] Auth Provisioning Error:", authError);
                return res.status(400).json({ error: 'Failed to provision authentication credentials: ' + authError.message });
            }

            if (authData.user) {
                authUserId = authData.user.id;

                // 🚨 CRITICAL FIX: Bake manifest_id into app_metadata immediately so the first login JWT contains the tenant claim
                await supabase.auth.admin.updateUserById(authUserId, {
                    app_metadata: { manifest_id: manifestId }
                }).catch(e => console.error("[createUser] Failed to bake app_metadata:", e));

                payload.id = authUserId; // Bind the public profile exactly to the new Auth ID
                payload.email = targetEmail; // Save the synthetic or real email to profile
            }
        }

        // Insert public profile
        const { error: dbError } = await supabase.from('users').insert([payload]);

        // Rollback Auth if DB fails (e.g., constraint violation)
        if (dbError) {
            if (authUserId) {
                console.log(`[createUser] DB Insert failed, rolling back newly created Auth identity ${authUserId}`);
                await supabase.auth.admin.deleteUser(authUserId);
            }
            throw dbError;
        }

        res.status(201).json({ message: 'User created securely with Auth Identity' });
    } catch (error: any) {
        console.error("[createUser] Catch Error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

const ROLE_RANK: Record<string, number> = {
    'Member':       1,
    'Dept Finance': 2,
    'Dept Admin':   3,
    'HOD':          4,
    'Head of Dept': 4,
    'Logistics':    2,
    'Coordinator':  3,
    'TeamLeader':   5,
    'Administrator':6,
    'Super Admin':  7
};

export const updateUser = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    const authUser = (req as any).user;
    if (!manifestId || !authUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    try {
        const payload = {
            ...req.body,
            department_id: req.body.departmentId || req.body.department_id || null,
            station_id:    req.body.stationId    || req.body.station_id    || null,
            event_id:      req.body.eventId      || req.body.event_id      || null,
        };
        // Strip fields that must NEVER be mutated via this endpoint
        delete payload.id;
        delete payload.manifest_id;
        delete payload.created_by;
        delete payload.departmentId;
        delete payload.stationId;
        delete payload.eventId;

        if (payload.username) {
            payload.username = payload.username.replace(/\s+/g, '');
        }

        // Role Escalation & Invariant Protection
        let oldRole = null;
        if (payload.role) {
            // 1. Fetch current target state to determine original role
            const { data: targetUser } = await supabase.from('users').select('role').eq('id', id).maybeSingle();
            oldRole = targetUser?.role;
            const targetRole = payload.role;

            if (oldRole !== targetRole) {
                // Determine Actor Role (Supabase JS middleware sets `authUser.role` out of metadata, 
                // but we should natively fetch actor role to remain purely DB-backed as part of Phase 3)
                const { data: actor } = await supabase.from('users').select('role').eq('id', authUser.id).maybeSingle();
                const actorRole = actor?.role;

                if (!actorRole) throw new Error('Unauthorized role escalation. Actor role unresolved.');

                if (process.env.ENFORCE_ROLE_GUARDS === 'true') {
                    // A) Prevent Self-Escalation
                    if (authUser.id === id) {
                        console.warn('[SECURITY] Blocked role mutation attempt', {
                            actor: authUser.id,
                            target: id,
                            attemptedRole: targetRole,
                            reason: 'Self-Escalation'
                        });
                        throw new Error('Unauthorized: You cannot alter your own role.');
                    }

                    // B) Prevent Escalation Beyond Authority
                    if ((ROLE_RANK[targetRole] || 0) >= (ROLE_RANK[actorRole] || 0) && actorRole !== 'Super Admin') {
                        console.warn('[SECURITY] Blocked role mutation attempt', {
                            actor: authUser.id,
                            target: id,
                            attemptedRole: targetRole,
                            reason: 'Escalation Beyond Authority'
                        });
                        throw new Error('Unauthorized role escalation attempt. Target role exceeds your rank.');
                    }

                    // C) Protect Against "Last Super Admin" Deletion/Demotion
                    if (oldRole === 'Super Admin' && targetRole !== 'Super Admin') {
                        const { count: saCount } = await supabase
                            .from('users')
                            .select('*', { count: 'exact', head: true })
                            .eq('role', 'Super Admin')
                            .eq('manifest_id', manifestId);

                        if (saCount && saCount <= 1) {
                            console.warn('[SECURITY] Blocked role mutation attempt', {
                                actor: authUser.id,
                                target: id,
                                attemptedRole: targetRole,
                                reason: 'Last Super Admin Demotion'
                            });
                            throw new Error('Invariant Violation: Cannot demote the last Super Admin.');
                        }
                    }
                }
            }
        }

        // Execute Update
        const { data, error } = await supabase.from('users')
            .update(payload)
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            console.error('[CRITICAL] User update failed: 0 rows affected', { payloadId: id, authUser: authUser.id });
            throw new Error('User update failed: 0 rows affected. Possible UUID mismatch or RLS block.');
        }

        // --- NEW: Auth Clean-up for Soft Deletes ---
        if (payload.status === 'Deleted') {
            await supabase.auth.admin.deleteUser(id).catch(e => {
                console.warn(`[updateUser] Failed to delete Auth Identity for soft-deleted user ${id}:`, e.message);
            });
        }

        // ==========================================
        // GoTrue Identity Synchronization (Setup Fix)
        // If updating a password, seamlessly provision or sync the auth identity
        // ==========================================
        if (payload.password && !payload.password.startsWith('PENDING_')) {
            const userEmail = payload.email || data[0].email || (payload.username ? `${payload.username.toLowerCase().replace(/\s+/g, '')}@manifest.local` : null);
            if (userEmail) {
                try {
                    // Check if Auth User exists
                    const { data: authCheck } = await supabase.auth.admin.getUserById(id);
                    if (authCheck?.user) {
                        // Update existing Identity
                        await supabase.auth.admin.updateUserById(id, {
                            password: payload.password,
                            email: userEmail,
                            email_confirm: true
                        });
                    } else {
                        // Dynamically create the missing Identity mimicking the DB UUID
                        const { error: createErr } = await supabase.auth.admin.createUser({
                            id: id,
                            email: userEmail,
                            password: payload.password,
                            email_confirm: true
                        });

                        // Handle race conditions where email is taken by a ghost account
                        if (createErr && createErr.message.includes('already registered')) {
                            console.warn(`[SYNC] Auth email collision mapping ${userEmail}`);
                        }
                    }
                } catch (syncErr) {
                    console.error('[SYNC WARNING] Failed to mirror password to Auth:', syncErr);
                }
            }
        }

        // D) Log Successful Role Mutation (non-critical — never block the update)
        if (payload.role && oldRole !== payload.role) {
            supabase.from('role_change_log').insert([{
                user_id: id,
                old_role: oldRole,
                new_role: payload.role,
                changed_by: authUser.id
            }]).then(({ error: logErr }) => {
                if (logErr) console.warn('[updateUser] role_change_log insert failed (non-fatal):', logErr.message);
            });
        }

        res.json({ message: 'User updated' });
    } catch (error: any) {
        console.error('[USER UPDATE BLOCKED]', error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        // C) Protect Against "Last Super Admin" Deletion
        if (process.env.ENFORCE_ROLE_GUARDS === 'true') {
            const { data: targetUser } = await supabase.from('users').select('role').eq('id', id).maybeSingle();
            if (targetUser?.role === 'Super Admin') {
                const { count: saCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'Super Admin')
                    .eq('manifest_id', manifestId);

                if (saCount && saCount <= 1) {
                    console.warn('[SECURITY] Blocked role mutation attempt', {
                        actor: (req as any).user?.id,
                        target: id,
                        reason: 'Last Super Admin Deletion'
                    });
                    throw new Error('Invariant Violation: Cannot delete the last Super Admin.');
                }
            }
        }

        // --- NEW: Hard Delete User ---
        // 1. Delete from Supabase Auth (gotrue) to completely eradicate their login identity
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError && authError.message !== 'User not found') {
            console.warn(`[deleteUser] Failed to delete Auth Identity for ${id}:`, authError.message);
            // We log the warning but might still want to proceed with DB deletion to clear the UI ghost if Auth was out of sync
        }

        // 2. Delete strictly from the database (Hard Delete)
        const { error: dbError } = await supabase.from('users')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('id', id);

        if (dbError) throw dbError;

        console.log(`[deleteUser] Successfully hard-deleted user ${id}`);
        res.json({ message: 'User permanently deleted' });
    } catch (error: any) {
        console.error("[deleteUser] Error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
