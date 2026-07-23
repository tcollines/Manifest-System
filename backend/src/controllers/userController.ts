import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

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

const SAFE_USER_COLUMNS = 'id, name, role, department_id, department_uid, username, contact, email, station_id, event_id, status, created_at, manifest_id';

export const getProfile = async (req: Request, res: Response) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const manifestId = (req as any).manifestId;
    const user = (req as any).user;

    if (!manifestId || !user) {
        return res.status(401).json({
            error: 'Unauthorized',
            details: `Missing ${!user ? 'user context' : 'manifest association'}.`,
            requestId
        });
    }

    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        let profile: any = null;
        let queryError: any = null;

        // 1. Query by verified auth ID first (never pass undefined)
        const targetAuthId = user.profileId || user.authUserId || user.id;
        if (targetAuthId && typeof targetAuthId === 'string' && targetAuthId !== 'undefined') {
            const { data, error } = await supabase
                .from('users')
                .select(SAFE_USER_COLUMNS)
                .eq('id', targetAuthId)
                .eq('manifest_id', manifestId)
                .maybeSingle();

            if (error) {
                console.error(`[getProfile][ReqID: ${requestId}] Supabase error ${error.code}: ${error.message}`, error);
                queryError = error;
            } else if (data) {
                profile = data;
            }
        }

        // 2. Query by verified email for legacy accounts if not found by ID
        if (!profile && !queryError && user.email && typeof user.email === 'string') {
            const { data: emailRows, error: emailError } = await supabase
                .from('users')
                .select(SAFE_USER_COLUMNS)
                .eq('email', user.email)
                .eq('manifest_id', manifestId)
                .neq('status', 'Deleted');

            if (emailError) {
                console.error(`[getProfile][ReqID: ${requestId}] Supabase error ${emailError.code}: ${emailError.message}`, emailError);
                queryError = emailError;
            } else if (emailRows && emailRows.length === 1) {
                profile = emailRows[0];
            } else if (emailRows && emailRows.length > 1) {
                console.warn(`[getProfile][ReqID: ${requestId}] Ambiguous multiple profiles found for verified email: ${user.email}`);
            }
        }

        if (queryError) {
            return res.status(500).json({ error: 'Database error fetching user profile', requestId });
        }

        if (!profile) {
            return res.status(404).json({ error: 'User profile not found in database', requestId });
        }

        // 3. Verify returned profile belongs to req.manifestId
        if (String(profile.manifest_id) !== String(manifestId)) {
            console.error(`[getProfile][ReqID: ${requestId}] Manifest mismatch: Expected ${manifestId}, got ${profile.manifest_id}`);
            return res.status(403).json({ error: 'Forbidden: Manifest mismatch', requestId });
        }

        // 4. Ensure password, tokens, or other authentication fields are omitted (guaranteed by SAFE_USER_COLUMNS)
        delete (profile as any).password;
        delete (profile as any).token;
        delete (profile as any).tokens;
        delete (profile as any).invitation_token;

        return res.json(profile);
    } catch (error: any) {
        console.error(`[PROFILE ERROR][ReqID: ${requestId}]`, error);
        return res.status(500).json({ error: 'An internal server error occurred.', requestId });
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

        const isTempCoordinator = payload.role === 'Vehicle Coordinator' || payload.role === 'Stage Coordinator' || payload.role === 'Coordinator';

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

        // Prevent Duplicate Emails for system users
        if (payload.email && !isTempCoordinator) {
            const { data: emailMatches } = await supabase
                .from('users')
                .select('id, role')
                .eq('email', payload.email)
                .neq('status', 'Deleted');

            if (emailMatches && emailMatches.length > 0) {
                const otherSystemUser = emailMatches.find(u => 
                    !['Vehicle Coordinator', 'Stage Coordinator', 'Coordinator'].includes(u.role)
                );
                if (otherSystemUser) {
                    return res.status(400).json({ error: 'Email already exists for another system user' });
                }
            }
        }

        // --- NEW: Auto-Provision Auth Identity ---
        let authUserId = null;
        if (payload.password && (payload.email || payload.username)) {
            // Generate unique synthetic email if none provided to prevent collisions with soft-deleted users
            const synthSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            
            // Temporary coordinators ALWAYS use a synthetic email for Auth to avoid colliding with their permanent user accounts
            const baseName = payload.username || payload.name || 'user';
            const syntheticEmail = `${baseName.toLowerCase().replace(/\s+/g, '')}_${synthSuffix}@manifest.local`;
            
            const targetEmail = isTempCoordinator ? syntheticEmail : (payload.email || syntheticEmail);

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
                
                // If they are a temp coordinator, keep their real email in the payload so it saves to the users table
                // If they are a regular user without an email, assign them the synthetic email
                if (!isTempCoordinator && !payload.email) {
                    payload.email = targetEmail; 
                }
            }
        }

        // Insert public profile (allow password to be saved for admin reference)
        // delete payload.password;
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

        // Fetch current profile to get current role/email for uniqueness checks and role guards
        const { data: targetUser } = await supabase.from('users').select('role, email').eq('id', id).maybeSingle();
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentRole = payload.role || targetUser.role;
        const currentEmail = payload.email !== undefined ? payload.email : targetUser.email;
        const isTempCoordinator = currentRole === 'Vehicle Coordinator' || currentRole === 'Stage Coordinator' || currentRole === 'Coordinator';

        // Prevent Duplicate Emails for system users
        if (currentEmail && !isTempCoordinator) {
            const { data: emailMatches } = await supabase
                .from('users')
                .select('id, role')
                .eq('email', currentEmail)
                .neq('status', 'Deleted');

            if (emailMatches && emailMatches.length > 0) {
                const otherSystemUser = emailMatches.find(u => 
                    u.id !== id && 
                    !['Vehicle Coordinator', 'Stage Coordinator', 'Coordinator'].includes(u.role)
                );
                if (otherSystemUser) {
                    return res.status(400).json({ error: 'Email already exists for another system user' });
                }
            }
        }

        // Role Escalation & Invariant Protection
        let oldRole = null;
        if (payload.role) {
            oldRole = targetUser.role;
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

        // Extract password to sync with Auth, but keep it in payload for admin reference
        const rawPassword = payload.password;
        // delete payload.password;

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
        if (rawPassword && !rawPassword.startsWith('PENDING_')) {
            const userEmail = payload.email || data[0].email || (payload.username ? `${payload.username.toLowerCase().replace(/\s+/g, '')}@manifest.local` : null);
            if (userEmail) {
                try {
                    // Check if Auth User exists
                    const { data: authCheck } = await supabase.auth.admin.getUserById(id);
                    if (authCheck?.user) {
                        // Update existing Identity
                        await supabase.auth.admin.updateUserById(id, {
                            password: rawPassword,
                            email: userEmail,
                            email_confirm: true
                        });
                    } else {
                        // Dynamically create the missing Identity mimicking the DB UUID
                        const { error: createErr } = await supabase.auth.admin.createUser({
                            id: id,
                            email: userEmail,
                            password: rawPassword,
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

        if (dbError) {
            // Check if violation is due to a foreign key constraint (Postgres error code 23503)
            if (dbError.code === '23503' || dbError.message?.includes('foreign key constraint')) {
                console.log(`[deleteUser] Hard delete failed due to foreign key constraint for user ${id}. Falling back to soft-delete.`);
                const { error: softError } = await supabase.from('users')
                    .update({ status: 'Deleted', username: null, password: null })
                    .eq('manifest_id', manifestId)
                    .eq('id', id);
                if (softError) throw softError;
                console.log(`[deleteUser] Successfully soft-deleted user ${id}`);
                return res.json({ message: 'User soft-deleted due to existing database references' });
            }
            throw dbError;
        }

        console.log(`[deleteUser] Successfully hard-deleted user ${id}`);
        res.json({ message: 'User permanently deleted' });
    } catch (error: any) {
        console.error("[deleteUser] Error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
