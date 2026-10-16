import { Request, Response } from 'express';
import { WORKPLAN_STATUS } from '../shared/constants';
import { supabase } from '../supabase';
import { randomUUID as uuidv4 } from 'crypto';

const guard = (req: Request, res: Response): string | null => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    return manifestId;
};

// Internal utility to check if a workplan is locked or verify department bounds
const getWorkplanLockStatus = async (manifestId: string, workplanId: string) => {
    const { data: wp, error } = await supabase
        .from('monthly_workplans')
        .select('is_locked, department_id, status')
        .eq('manifest_id', manifestId)
        .eq('id', workplanId)
        .single();
    if (error || !wp) return { error: 'Workplan not found' };
    return { wp };
};

// ─── Workplans ────────────────────────────────────────────────

export const getWorkplansByDepartment = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { departmentId } = req.params;
    try {
        const { data, error } = await supabase
            .from('monthly_workplans')
            .select(`
              *,
              departments(name, slug),
              workplan_items(*)
            `)
            .eq('manifest_id', manifestId)
            .eq('department_id', departmentId)
            .order('month', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch { res.status(500).json({ error: 'An internal server error occurred.' }); }
};

export const getGlobalQueue = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    try {
        const userRole = req.user?.role;
        let query = supabase
            .from('monthly_workplans')
            .select(`
              *,
              departments(name, slug),
              workplan_items(*)
            `)
            .eq('manifest_id', manifestId)
            .order('month', { ascending: false })
            .order('updated_at', { ascending: false });

        if (userRole === 'TeamLeader') {
            query = query.eq('status', WORKPLAN_STATUS.TL_REVIEW);
        } else if (userRole === 'Administrator' || userRole === 'Super Admin') {
            query = query.eq('status', WORKPLAN_STATUS.ADMIN_REVIEW);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error('[getGlobalQueue DB ERROR]', error);
            throw error;
        }
        res.json(data);
    } catch (e: any) { 
        console.error('[getGlobalQueue Exception]', e);
        res.status(500).json({ error: 'An internal server error occurred.' }); 
    }
};

export const generateGlobalWorkplans = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const userId = req.user?.id;
    const { title, month, objectives } = req.body;
    
    if (!title || !month) return res.status(400).json({ error: 'title and month are required' });
    
    const monthDate = month.length === 7 ? `${month}-01` : month;

    try {
        // Fetch all ACTIVE departments for the manifest
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('id')
            .eq('manifest_id', manifestId)
            .ilike('status', 'active');
            
        if (deptError) throw deptError;
        if (!departments || departments.length === 0) return res.status(400).json({ error: 'No active departments found to generate workplans for.' });

        // Fetch existing workplans for the same month to prevent duplicate generation (SYNC feature)
        const { data: existingWorkplans, error: existingError } = await supabase
            .from('monthly_workplans')
            .select('department_id')
            .eq('manifest_id', manifestId)
            .eq('month', monthDate);

        if (existingError) throw existingError;

        const existingDeptIds = new Set(existingWorkplans.map(wp => wp.department_id));

        const newWorkplans = departments
            .filter(dept => !existingDeptIds.has(dept.id))
            .map(dept => ({
                id: uuidv4(),
                manifest_id: manifestId,
                department_id: dept.id,
                title,
                month: monthDate,
                objectives,
                status: WORKPLAN_STATUS.DRAFT,
                created_by: null
            }));

        if (newWorkplans.length === 0) {
            return res.json({ message: 'All departments already have a workplan for this month.' });
        }

        const { error: insertError } = await supabase
            .from('monthly_workplans')
            .insert(newWorkplans);
            
        if (insertError) throw insertError;

        res.status(201).json({ message: `Successfully generated ${newWorkplans.length} draft workplans.` });
    } catch (err) { 
        console.error('[generateGlobalWorkplans]', err); 
        res.status(500).json({ error: 'An internal server error occurred.' }); 
    }
};

export const deleteWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot delete a locked workplan' });

        const { error } = await supabase
            .from('monthly_workplans')
            .delete()
            .eq('id', workplanId)
            .eq('manifest_id', manifestId);

        if (error) throw error;
        
        await import('../utils/logger').then(({ logAction }) => {
            logAction({
                userId: req.user.id,
                action: 'DELETED_WORKPLAN',
                itemId: workplanId,
                manifestId: manifestId
            });
        });

        res.json({ message: 'Workplan deleted successfully' });
    } catch (err) {
        console.error('[deleteWorkplan ERROR]', err);
        res.status(500).json({ error: 'Failed to delete workplan' });
    }
};

export const populateDraftWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;
    const { activities } = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
        return res.status(400).json({ error: 'activities must be a non-empty array' });
    }

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot populate a locked workplan' });

        const { data: existingItems } = await supabase.from('workplan_items').select('id, status').eq('workplan_id', workplanId);

        for (const act of activities) {
            if (act.id) {
                const existing = existingItems?.find(e => e.id === act.id);
                if (existing && ['ADMIN_APPROVED', 'TL_APPROVED'].includes(existing.status)) continue;
                
                await supabase.from('workplan_items').update({
                    activity: act.activity || act.name,
                    item: act.item || null,
                    objective: act.objective || null,
                    date_needed: act.date_needed || null,
                    duration: act.duration || 'Once',
                    unit_cost: act.unit_cost || 0,
                    dept_contribution: act.dept_contribution || 0,
                    quantity: act.quantity || 1,
                    amount: act.amount || 0,
                    status: 'PENDING',
                    updated_at: new Date().toISOString()
                }).eq('id', act.id);
            } else {
                await supabase.from('workplan_items').insert({
                    id: uuidv4(),
                    manifest_id: manifestId,
                    workplan_id: workplanId,
                    activity: act.activity || act.name,
                    item: act.item || null,
                    objective: act.objective || null,
                    date_needed: act.date_needed || null,
                    duration: act.duration || 'Once',
                    unit_cost: act.unit_cost || 0,
                    dept_contribution: act.dept_contribution || 0,
                    quantity: act.quantity || 1,
                    amount: act.amount || 0,
                    status: 'PENDING'
                });
            }
        }

        const incomingIds = activities.map((a: any) => a.id).filter(Boolean);
        const toDelete = (existingItems || [])
            .filter(e => !incomingIds.includes(e.id) && !['ADMIN_APPROVED', 'TL_APPROVED'].includes(e.status))
            .map(e => e.id);
            
        if (toDelete.length > 0) {
            await supabase.from('workplan_items').delete().in('id', toDelete);
        }

        res.status(201).json({ message: 'Workplan populated successfully' });
    } catch (err) { 
        console.error('[populateDraftWorkplan]', err); 
        res.status(500).json({ error: 'An internal server error occurred.' }); 
    }
};

export const submitWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot submit a locked workplan' });

        // Retrieve dept slug for bypass logic
        const { data: dept } = await supabase.from('departments').select('slug').eq('id', wp.department_id).single();
        
        // Ensure Admin sees ADMIN_REVIEW, TL sees TL_REVIEW
        const nextStatus = (dept?.slug === 'administration') ? WORKPLAN_STATUS.TL_REVIEW : WORKPLAN_STATUS.ADMIN_REVIEW;

        const { data, error } = await supabase
            .from('monthly_workplans')
            .update({ 
                status: nextStatus, 
                created_by: req.user?.id,
                updated_at: new Date().toISOString() 
            })
            .eq('id', workplanId)
            .in('status', [WORKPLAN_STATUS.DRAFT, WORKPLAN_STATUS.ADMIN_REVIEW, WORKPLAN_STATUS.TL_REVIEW]) // Concurrency control
            .select()
            .single();

        if (error) {
            // Check if concurrency error (0 rows matched)
            if (error.code === 'PGRST116') return res.status(409).json({ error: 'Conflict: Workplan state changed by another user.' });
            throw error;
        }

        if (nextStatus === WORKPLAN_STATUS.TL_REVIEW) {
            // If bypassing Admin Review, we must advance pending items to ADMIN_APPROVED so TL can see and act on them.
            await supabase
                .from('workplan_items')
                .update({ status: 'ADMIN_APPROVED' })
                .eq('workplan_id', workplanId)
                .in('status', ['PENDING', 'RESUBMITTED']);
        }

        // Fire notifications
        import('../utils/notifications').then(({ notifyRole }) => {
            if (nextStatus === WORKPLAN_STATUS.ADMIN_REVIEW) {
                notifyRole(manifestId, 'Administrator', 'WORKPLAN_REVIEW', `A workplan has been submitted for Admin Review.`, workplanId, '/approvals/workplans');
                notifyRole(manifestId, 'Super Admin', 'WORKPLAN_REVIEW', `A workplan has been submitted for Admin Review.`, workplanId, '/approvals/workplans');
            } else if (nextStatus === WORKPLAN_STATUS.TL_REVIEW) {
                notifyRole(manifestId, 'TeamLeader', 'WORKPLAN_REVIEW', `A workplan is pending your Team Leader Review.`, workplanId, '/approvals/workplans');
            }
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Failed to submit workplan.' }); }
};

// ─── Workplan Items (Transition Actions) ──────────────────────

export const processAdminItemDecision = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { itemId } = req.params;
    const { workplanId, decision, comment } = req.body; // PENDING -> ADMIN_APPROVED or ADMIN_REJECTED

    if (!['ADMIN_APPROVED', 'ADMIN_REJECTED'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot evaluate items on a locked workplan' });

        const { data, error } = await supabase
            .from('workplan_items')
            .update({ 
                status: decision, 
                admin_comment: comment || null,
                updated_at: new Date().toISOString() 
            })
            .eq('id', itemId)
            .in('status', ['PENDING', 'RESUBMITTED']) // Concurrency Control
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(409).json({ error: 'Conflict: Item state changed by another user.' });
            throw error;
        }

        await supabase.from('workplan_item_logs').insert([{
            manifest_id: manifestId,
            item_id: itemId,
            user_id: req.user?.id,
            action: decision,
            previous_status: 'PENDING',
            new_status: decision,
            details: { comment }
        }]);

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Action failed' }); }
};

export const processTLItemDecision = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { itemId } = req.params;
    // TL_APPROVED, TL_ADJUSTED, TL_REJECTED
    const { workplanId, decision, comment, adjusted_quantity, adjusted_amount, quantity, amount, activity, item, objective, dateNeeded, date_needed, duration, unitCost, unit_cost } = req.body; 

    if (!['TL_APPROVED', 'TL_ADJUSTED', 'TL_REJECTED'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot evaluate items on a locked workplan' });

        const updatePayload: any = { 
            status: decision, 
            tl_comment: comment || null,
            updated_at: new Date().toISOString() 
        };

        if (decision === 'TL_ADJUSTED') {
            if (adjusted_quantity !== undefined) updatePayload.approved_quantity = adjusted_quantity;
            else if (quantity !== undefined) updatePayload.approved_quantity = quantity;

            if (adjusted_amount !== undefined) updatePayload.approved_amount = adjusted_amount;
            else if (amount !== undefined) updatePayload.approved_amount = amount;

            if (activity !== undefined) updatePayload.activity = activity;
            if (item !== undefined) updatePayload.item = item;
            if (objective !== undefined) updatePayload.objective = objective;
            if (dateNeeded !== undefined || date_needed !== undefined) updatePayload.date_needed = dateNeeded || date_needed;
            if (duration !== undefined) updatePayload.duration = duration;
            if (unitCost !== undefined || unit_cost !== undefined) updatePayload.unit_cost = unitCost || unit_cost;
        }

        const { data, error } = await supabase
            .from('workplan_items')
            .update(updatePayload)
            .eq('id', itemId)
            .in('status', ['ADMIN_APPROVED']) // Concurrency Control
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(409).json({ error: 'Conflict: Item state changed by another user.' });
            throw error;
        }

        await supabase.from('workplan_item_logs').insert([{
            manifest_id: manifestId,
            item_id: itemId,
            user_id: req.user?.id,
            action: decision,
            previous_status: 'ADMIN_APPROVED',
            new_status: decision,
            details: { comment, adjusted_quantity, adjusted_amount }
        }]);

        // Auto-finalize the workplan if all items have been evaluated by TL
        const { count, error: countError } = await supabase
            .from('workplan_items')
            .select('*', { count: 'exact', head: true })
            .eq('workplan_id', workplanId)
            .eq('status', 'ADMIN_APPROVED');
            
        if (!countError && count === 0) {
            const { data: updatedWp, error: finalizeError } = await supabase
                .from('monthly_workplans')
                .update({ 
                    status: WORKPLAN_STATUS.FINALIZED, 
                    is_locked: true,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', workplanId)
                .eq('status', WORKPLAN_STATUS.TL_REVIEW)
                .select()
                .single();
                
            if (updatedWp) {
                import('../utils/notifications').then(({ notifyRole, createNotification }) => {
                    if (updatedWp.created_by) {
                        createNotification(manifestId, updatedWp.created_by, 'WORKPLAN_REVIEW', `Your workplan has been completely finalized.`, workplanId, `/departments/${updatedWp.department_id}/dashboard?tab=workplans`);
                    }
                    notifyRole(manifestId, 'Finance', 'WORKPLAN_REVIEW', `A workplan has been finalized. Budgets can now be executed.`, workplanId, '/finance/dashboard');
                }).catch(err => console.error('Error importing notifyRole', err));
            }
        }

        await import('../utils/logger').then(({ logAction }) => {
            logAction({
                userId: req.user.id,
                action: decision,
                itemId: itemId,
                manifestId: manifestId,
                details: { comment, adjusted_quantity, adjusted_amount }
            });
        });

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Action failed' }); }
};

export const finalizeWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;

    try {
        // Triggering lock down and forcing RPC trigger on DB side (handled later)
        const { data, error } = await supabase
            .from('monthly_workplans')
            .update({ 
                status: 'Finalized', 
                is_locked: true,
                updated_at: new Date().toISOString() 
            })
            .eq('id', workplanId)
            .eq('manifest_id', manifestId)
            .select()
            .single();

        if (error) throw error;

        await import('../utils/logger').then(({ logAction }) => {
            logAction({
                userId: req.user.id,
                action: 'WORKPLAN_FINALIZED',
                itemId: workplanId,
                manifestId: manifestId
            });
        });

        import('../utils/notifications').then(({ notifyRole, createNotification }) => {
            if (data?.created_by) {
                createNotification(manifestId, data.created_by, 'WORKPLAN_REVIEW', `Your workplan has been completely finalized.`, workplanId, `/departments/${data.department_id}/dashboard?tab=workplans`);
            }
            notifyRole(manifestId, 'Finance', 'WORKPLAN_REVIEW', `A workplan has been finalized. Budgets can now be executed.`, workplanId, '/finance/dashboard');
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Failed to finalize workplan' }); }
};

// ─── Resubmission Flow ─────────────────────────────────────────

export const editWorkplanItem = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId, itemId } = req.params;
    const { quantity, amount, item: itemName, objective, activity, dateNeeded, duration, unitCost } = req.body;

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot edit items on a locked workplan' });

        // Ensure the item exists and is in a rejected state
        const { data: itemData, error: itemErr } = await supabase
            .from('workplan_items')
            .select('status')
            .eq('id', itemId)
            .eq('workplan_id', workplanId)
            .single();

        if (itemErr || !itemData) return res.status(404).json({ error: 'Item not found' });
        
        if (!['ADMIN_REJECTED', 'TL_REJECTED', 'PENDING'].includes(itemData.status)) {
             return res.status(403).json({ error: 'Can only edit PENDING or REJECTED items' });
        }

        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (quantity !== undefined) updatePayload.quantity = quantity;
        if (amount !== undefined) updatePayload.amount = amount;
        if (itemName !== undefined) updatePayload.item = itemName;
        if (objective !== undefined) updatePayload.objective = objective;
        if (activity !== undefined) updatePayload.activity = activity;
        if (dateNeeded !== undefined) updatePayload.date_needed = dateNeeded;
        if (duration !== undefined) updatePayload.duration = duration;
        if (unitCost !== undefined) updatePayload.unit_cost = unitCost;

        const { data, error } = await supabase
            .from('workplan_items')
            .update(updatePayload)
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;

        await import('../utils/logger').then(({ logAction }) => {
            logAction({
                userId: req.user.id,
                action: 'DEPT_EDIT_REJECTED_ITEM',
                itemId: itemId,
                manifestId: manifestId,
                details: { new_quantity: quantity, new_amount: amount }
            });
        });

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Failed to edit rejected item' }); }
};

export const resubmitWorkplan = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot resubmit locked workplan' });

        // Retrieve items to determine where it goes next based on origin rejection type
        const { data: items } = await supabase
            .from('workplan_items')
            .select('id, status')
            .eq('workplan_id', workplanId);
            
        let nextStatus = 'Admin_Review'; 
        // If there are ANY TL Rejections, it goes back to TL directly 
        // Admin_Review catches ADMIN_REJECTED. A mix normally wouldn't happen sequentially, but prioritizing TL ensures Admin doesn't double-do it.
        const hasAdminRejects = items?.some(i => i.status === 'ADMIN_REJECTED');
        const hasTlRejects = items?.some(i => i.status === 'TL_REJECTED');

        if (hasTlRejects && !hasAdminRejects) {
            nextStatus = 'TL_Review';
        } else if (hasAdminRejects) {
            nextStatus = 'Admin_Review';
        } else {
            // No rejected states detected. Could just be Draft returning.
            nextStatus = 'Admin_Review'; // Default pathing
        }

        // B. Update Workplan
        const { data, error } = await supabase
            .from('monthly_workplans')
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq('id', workplanId)
            .select()
            .single();

        if (error) throw error;

        // C. Clean all Rejects -> Resubmitted
        const itemIdsToPatch = items?.filter(i => ['ADMIN_REJECTED', 'TL_REJECTED'].includes(i.status)).map(i => i.id) || [];
        if (itemIdsToPatch.length > 0) {
            await supabase
                .from('workplan_items')
                .update({ status: 'RESUBMITTED' })
                .in('id', itemIdsToPatch);
        }

        await import('../utils/logger').then(({ logAction }) => {
            logAction({
                userId: req.user.id,
                action: 'WORKPLAN_RESUBMITTED',
                itemId: workplanId,
                manifestId: manifestId,
                details: { previousStatus: wp.status, nextStatus, patchedItems: itemIdsToPatch.length }
            });
        });

        // Fire notifications
        import('../utils/notifications').then(({ notifyRole }) => {
            if (nextStatus === 'Admin_Review' || nextStatus === 'ADMIN_REVIEW') {
                notifyRole(manifestId, 'Administrator', 'WORKPLAN_REVIEW', `A workplan has been resubmitted for Admin Review.`, workplanId, '/approvals/workplans');
                notifyRole(manifestId, 'Super Admin', 'WORKPLAN_REVIEW', `A workplan has been resubmitted for Admin Review.`, workplanId, '/approvals/workplans');
            } else if (nextStatus === 'TL_Review' || nextStatus === 'TL_REVIEW') {
                notifyRole(manifestId, 'TeamLeader', 'WORKPLAN_REVIEW', `A workplan is pending your Team Leader Review after resubmission.`, workplanId, '/approvals/workplans');
            }
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Failed to resubmit workplan.' }); }
};

export const addWorkplanItem = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;
    const { activity, item, objective, dateNeeded, duration, unitCost, deptContribution, quantity, amount } = req.body;

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot add items to a locked workplan' });

        let initialStatus = 'PENDING';
        if (req.user.role === 'TeamLeader') {
            initialStatus = 'TL_APPROVED';
        } else if (req.user.role === 'Administrator' || req.user.role === 'Super Admin') {
            initialStatus = 'ADMIN_APPROVED';
        }

        const { data, error } = await supabase
            .from('workplan_items')
            .insert([{
                workplan_id: workplanId,
                manifest_id: manifestId,
                activity,
                item: item || null,
                objective: objective || null,
                date_needed: dateNeeded || null,
                duration: duration || 'Once',
                unit_cost: unitCost || 0,
                dept_contribution: deptContribution || 0,
                quantity: quantity || 1,
                amount: amount || 0,
                status: initialStatus
            }])
            .select()
            .single();

        if (error) throw error;
        
        await import('../utils/logger').then(({ logAction }) => {
            logAction({
                userId: req.user.id,
                action: 'WORKPLAN_ITEM_ADDED_AD_HOC',
                itemId: data.id,
                manifestId: manifestId,
                details: { workplanId }
            });
        });

        res.status(201).json(data);
    } catch (err) { res.status(500).json({ error: 'Failed to add workplan item' }); }
};

export const processAdminReviewCompletion = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { workplanId } = req.params;

    try {
        const { wp, error: lockError } = await getWorkplanLockStatus(manifestId, workplanId);
        if (lockError || !wp) return res.status(404).json({ error: lockError || 'Not found' });
        if (wp.is_locked) return res.status(403).json({ error: 'Cannot complete review on a locked workplan' });

        const { data: items, error: itemsError } = await supabase
            .from('workplan_items')
            .select('status')
            .eq('workplan_id', workplanId);

        if (itemsError) throw itemsError;

        const hasPending = items?.some(i => i.status === 'PENDING' || i.status === 'RESUBMITTED');
        if (hasPending) {
            return res.status(400).json({ error: 'Cannot complete review. Please evaluate all pending items first.' });
        }

        const hasAdminRejects = items?.some(i => i.status === 'ADMIN_REJECTED');
        const nextStatus = hasAdminRejects ? WORKPLAN_STATUS.DRAFT : WORKPLAN_STATUS.TL_REVIEW;

        const { data, error } = await supabase
            .from('monthly_workplans')
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq('id', workplanId)
            .eq('status', WORKPLAN_STATUS.ADMIN_REVIEW) // Concurrency check
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(409).json({ error: 'Conflict: Workplan state changed by another user.' });
            throw error;
        }

        import('../utils/notifications').then(({ notifyRole, createNotification }) => {
            if (nextStatus === WORKPLAN_STATUS.TL_REVIEW) {
                notifyRole(manifestId, 'TeamLeader', 'WORKPLAN_REVIEW', `A workplan has completed Admin Review and is pending your Team Leader Review.`, workplanId, '/approvals/workplans');
            } else if (nextStatus === WORKPLAN_STATUS.DRAFT && data?.created_by) {
                createNotification(manifestId, data.created_by, 'WORKPLAN_REVIEW', `Your workplan has been returned to DRAFT due to rejected items.`, workplanId, `/departments/${data.department_id}/dashboard?tab=workplans`);
            }
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json(data);
    } catch (err) { res.status(500).json({ error: 'Failed to complete evaluation.' }); }
};

export const getGlobalStatus = async (req: Request, res: Response) => {
    const manifestId = guard(req, res); if (!manifestId) return;
    const { month } = req.params;
    
    // In workplans, 'month' might be passed as 'YYYY-MM' but stored as 'YYYY-MM-01'. 
    // workplanController handles it in generateGlobalWorkplans: 
    const monthDate = month.length === 7 ? `${month}-01` : month;

    try {
        const { data: activeDepts, error: deptError } = await supabase
            .from('departments')
            .select('id, name')
            .eq('manifest_id', manifestId)
            .ilike('status', 'active')
            .order('name');
        
        if (deptError) throw deptError;

        const { data: workplans, error: wpError } = await supabase
            .from('monthly_workplans')
            .select('department_id, status')
            .eq('manifest_id', manifestId)
            .eq('month', monthDate);

        if (wpError) throw wpError;

        const submittedDepts = new Set(workplans.filter(wp => wp.status !== WORKPLAN_STATUS.DRAFT).map(wp => wp.department_id));
        const hasDraftDepts = new Set(workplans.filter(wp => wp.status === WORKPLAN_STATUS.DRAFT).map(wp => wp.department_id));

        const result = {
            total: activeDepts.length,
            submitted: activeDepts.filter(d => submittedDepts.has(d.id)),
            draft: activeDepts.filter(d => hasDraftDepts.has(d.id) && !submittedDepts.has(d.id)),
            missing: activeDepts.filter(d => !submittedDepts.has(d.id) && !hasDraftDepts.has(d.id))
        };

        res.json(result);
    } catch (err) {
        console.error('[getGlobalWorkplanStatus]', err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

