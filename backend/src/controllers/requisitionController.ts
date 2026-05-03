import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { REQUISITION_STATUS } from '../shared/constants';

export const getAllRequisitions = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('requisitions')
            .select(`*, requisition_items (*)`)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const createBatch = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { requisitionIds, batchTitle } = req.body;

    try {
        // Enforce Batch Constraints: Must not be already batched.
        const { data: existingReqs, error: fetchErr } = await supabase
            .from('requisitions')
            .select('id, batch_id, status')
            .in('id', requisitionIds)
            .eq('manifest_id', manifestId);

        if (fetchErr) throw fetchErr;
        
        if (existingReqs.some(r => r.batch_id !== null)) {
             return res.status(400).json({ error: 'One or more items are already assigned to a batch' });
        }

        const statuses = new Set(existingReqs.map(r => r.status));
        if (statuses.size > 1) {
             return res.status(400).json({ error: 'All batched items must share the exact same status' });
        }

        const batchNumber = `BCH-${Date.now().toString().slice(-6)}`;

        // 1. Create the Batch record
        const { data: batchData, error: batchError } = await supabase
            .from('requisition_batches')
            .insert([{
                batch_number: batchNumber,
                status: 'PENDING'
                // Ideally add manifest_id here if added to schema later
            }])
            .select('id')
            .single();

        if (batchError) throw batchError;

        // 2. Link requisitions to the real UUID batch_id and update status
        const { error: updateErr } = await supabase
             .from('requisitions')
             .update({ 
                 batch_id: batchData.id, 
                 status: REQUISITION_STATUS.TL_APPROVAL,
                 updated_at: new Date().toISOString() 
             })
             .in('id', requisitionIds)
        if (updateErr) throw updateErr;

        const { data: reqsToNotify } = await supabase.from('requisitions').select('id, requester_id, department_id, title, requisition_number').in('id', requisitionIds);

        // Fire notifications
        import('../utils/notifications').then(({ notifyRole, createNotification }) => {
            notifyRole(manifestId, 'TeamLeader', 'REQUISITION_APPROVAL', `A new requisition batch (${batchNumber}) is pending your approval.`, batchData.id, '/approvals/requisitions');
            notifyRole(manifestId, 'Finance', 'FINANCE_ACTION', `A new requisition batch (${batchNumber}) has been submitted from a department.`, batchData.id, '/finance/processing');
            
            if (reqsToNotify) {
                reqsToNotify.forEach(req => {
                    if (req.requester_id) {
                        const reqUrl = req.department_id ? `/departments/${req.department_id}/dashboard?tab=requisitions` : '/dashboard';
                        const reqName = req.title || req.requisition_number || `Req ${req.id.slice(0, 6)}`;
                        createNotification(manifestId, req.requester_id, 'REQUISITION_ACTION', `Your requisition "${reqName}" has been grouped into batch ${batchNumber} and is pending Team Leader approval.`, req.id, reqUrl);
                    }
                });
            }
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json({ message: 'Batch generated successfully', batchId: batchNumber });
    } catch (err) {
        console.error("Batch Creation Error:", err);
        res.status(500).json({ error: 'Failed to create batch' });
    }
};

export const getRequisitionsByDepartment = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { deptId } = req.params;
    try {
        const { data, error } = await supabase
            .from('requisitions')
            .select(`*, requisition_items (*)`)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('department_id', deptId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const createRequisition = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { req: requisition, items } = req.body;
    
    // Strip protected fields from client payload
    delete requisition.status;
    delete requisition.batch_id;
    delete requisition.rejection_reason;

    try {
        const reqNumber = `REQ-${Date.now().toString().slice(-6)}`;

        const { data: reqData, error: reqError } = await supabase
            .from('requisitions')
            .insert([{
                manifest_id: manifestId, // INJECT TENANT ID
                title: requisition.title,
                department_id: requisition.departmentId,
                requester_id: requisition.requesterId,
                status: REQUISITION_STATUS.PENDING,
                total_amount: requisition.totalAmount,
                notes: requisition.notes,
                requisition_number: reqNumber,
                type: 'ADHOC' // Default to ADHOC if created manually
            }])
            .select()
            .single();

        if (reqError) throw reqError;
        if (!reqData) throw new Error("Failed to create requisition record.");

        const itemsToInsert = items.map((item: any) => ({
            manifest_id: manifestId, // INJECT TENANT ID
            requisition_id: reqData.id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total_cost: item.totalCost
        }));

        const { error: itemsError } = await supabase.from('requisition_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        import('../utils/notifications').then(({ notifyRole }) => {
            const reqName = requisition.title || reqNumber;
            notifyRole(manifestId, 'Administrator', 'REQUISITION_ACTION', `A new requisition "${reqName}" requires your approval.`, reqData.id, '/approvals/adhoc-requisitions');
        }).catch(err => console.error('Error importing notifyRole', err));

        res.status(201).json({ message: 'Requisition created' });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateRequisition = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { req: requisition, items } = req.body;

    // Strip protected fields from client payload
    delete requisition.status;
    delete requisition.batch_id;
    delete requisition.rejection_reason;

    try {
        const { error: reqError } = await supabase
            .from('requisitions')
            .update({
                title: requisition.title,
                total_amount: requisition.totalAmount,
                notes: requisition.notes,
                status: REQUISITION_STATUS.PENDING,
                rejection_reason: null,
                updated_at: new Date().toISOString()
            })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);

        if (reqError) throw reqError;

        const { error: deleteError } = await supabase.from('requisition_items').delete().eq('manifest_id', manifestId).eq('requisition_id', id);
        if (deleteError) throw deleteError;

        const itemsToInsert = items.map((item: any) => ({
            manifest_id: manifestId, // INJECT TENANT ID
            requisition_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total_cost: item.totalCost
        }));

        const { error: itemsError } = await supabase.from('requisition_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        import('../utils/notifications').then(({ notifyRole }) => {
            const reqName = requisition.title || requisition.requisition_number || `Req ${id.slice(0, 6)}`;
            notifyRole(manifestId, 'Administrator', 'REQUISITION_ACTION', `Requisition "${reqName}" has been resubmitted and requires your approval.`, id, '/approvals/adhoc-requisitions');
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json({ message: 'Requisition updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateStatus = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { status, reason } = req.body;

    try {
        const { data: reqCheck, error: reqErrorCheck } = await supabase.from('requisitions').select('status, requester_id, title, department_id, requisition_number').eq('id', id).single();
        if (reqErrorCheck || !reqCheck) return res.status(404).json({ error: 'Not found' });

        const updateData: any = { status, updated_at: new Date().toISOString() };
        if (reason) updateData.rejection_reason = reason;

        const { error } = await supabase
            .from('requisitions')
            .update(updateData)
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .neq('status', REQUISITION_STATUS.PAID); // Concurrency Control - cannot change status if already paid

        if (error) throw error;

        await supabase.from('requisition_logs').insert([{
            manifest_id: manifestId,
            requisition_id: id,
            user_id: req.user?.id,
            action: `UPDATE_STATUS_TO_${status}`,
            previous_status: reqCheck.status,
            new_status: status,
            details: { reason }
        }]);

        // Fire notifications
        import('../utils/notifications').then(({ notifyRole, createNotification }) => {
            const reqName = reqCheck.title || reqCheck.requisition_number || `Req ${id.slice(0, 6)}`;
            const reqUrl = reqCheck.department_id ? `/departments/${reqCheck.department_id}/dashboard?tab=requisitions` : '/dashboard';

            if (status === REQUISITION_STATUS.FINANCE_BATCH || status === REQUISITION_STATUS.APPROVED) {
                notifyRole(manifestId, 'Finance', 'FINANCE_ACTION', `Requisition "${reqName}" has been approved and is ready for payment.`);
                
                // Also notify the requester that their requisition was approved
                if (reqCheck.requester_id) {
                    createNotification(manifestId, reqCheck.requester_id, 'REQUISITION_ACTION', `Your requisition "${reqName}" has been approved by the Administrator.`, id, reqUrl);
                }
            } else if (status === REQUISITION_STATUS.REJECTED && reqCheck.requester_id) {
                createNotification(manifestId, reqCheck.requester_id, 'REQUISITION_ACTION', `Your requisition "${reqName}" has been rejected.`, id, reqUrl);
            } else if (status === REQUISITION_STATUS.PAID && reqCheck.requester_id) {
                createNotification(manifestId, reqCheck.requester_id, 'REQUISITION_ACTION', `Your requisition "${reqName}" has been paid!`, id, reqUrl);
            }
        }).catch(err => console.error('Error importing notifyRole', err));

        res.json({ message: 'Status updated' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const addPayment = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { payment, newTotalPaid, isFullPayment } = req.body;

    try {
        const { data: reqCheck, error: reqErrorCheck } = await supabase.from('requisitions').select('status, amount_paid, requester_id, title, department_id, requisition_number').eq('id', id).single();
        if (reqErrorCheck || !reqCheck) return res.status(404).json({ error: 'Not found' });

        if (reqCheck.status === REQUISITION_STATUS.PAID) {
            return res.status(409).json({ error: 'Conflict: Requisition is already paid in full.' });
        }

        const { error: payError } = await supabase.from('requisition_payments').insert([{
            manifest_id: manifestId, // INJECT TENANT ID
            requisition_id: id,
            amount: payment.amount,
            method: payment.method,
            transaction_id: payment.transactionId,
            payment_date: payment.paymentDate,
            notes: payment.notes
        }]);

        if (payError) throw payError;

        const updateData: any = {
            amount_paid: newTotalPaid,
            updated_at: new Date().toISOString()
        };

        if (isFullPayment) {
            updateData.status = REQUISITION_STATUS.PAID;
        }

        const { error: reqError } = await supabase
            .from('requisitions')
            .update(updateData)
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .neq('status', REQUISITION_STATUS.PAID); // Concurrency Control

        if (reqError) throw reqError;

        await supabase.from('requisition_logs').insert([{
            manifest_id: manifestId,
            requisition_id: id,
            user_id: req.user?.id,
            action: 'PAYMENT_ADDED',
            previous_status: reqCheck.status,
            new_status: updateData.status || reqCheck.status,
            details: { payment_amount: payment.amount, isFullPayment }
        }]);

        import('../utils/notifications').then(({ createNotification }) => {
            const reqName = reqCheck.title || reqCheck.requisition_number || `Req ${id.slice(0, 6)}`;
            const reqUrl = reqCheck.department_id ? `/departments/${reqCheck.department_id}/dashboard?tab=requisitions` : '/dashboard';

            if (isFullPayment && reqCheck.requester_id) {
                createNotification(manifestId, reqCheck.requester_id, 'PAYMENT', `Requisition "${reqName}" has been paid in full.`, id, reqUrl);
            } else if (reqCheck.requester_id) {
                createNotification(manifestId, reqCheck.requester_id, 'PAYMENT', `A partial payment of ${payment.amount} was recorded for requisition "${reqName}".`, id, reqUrl);
            }
        }).catch(err => console.error('Error importing createNotification', err));

        res.json({ message: 'Payment added' });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getBatches = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('requisition_batches')
            .select(`
                *,
                requisitions (*)
            `)
            // Usually filter by manifest_id here but it relies on requisitions table constraints right now or if added.
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error("[getBatches]", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getQueue = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Fetch all requisitions
        const { data: requisitions, error: reqError } = await supabase
            .from('requisitions')
            .select(`*, requisition_items (*)`)
            .eq('manifest_id', manifestId)
            .order('created_at', { ascending: false });

        if (reqError) throw reqError;

        // Fetch all batches
        const { data: batches, error: batchError } = await supabase
            .from('requisition_batches')
            .select(`*, requisitions (*)`)
            .order('created_at', { ascending: false });

        if (batchError) throw batchError;

        res.json({
            finance: {
                unbatched: requisitions.filter(r => r.status === REQUISITION_STATUS.APPROVED && !r.batch_id),
                batched_pending_tl: batches.filter(b => [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.TL_APPROVAL].includes(b.status as any)),
                approved_pending_payment: batches.filter(b => b.status === REQUISITION_STATUS.APPROVED && b.requisitions?.some((r: any) => r.status !== REQUISITION_STATUS.PAID)),
                history: requisitions.filter(r => [REQUISITION_STATUS.PAID, REQUISITION_STATUS.REJECTED].includes(r.status as any))
            },
            tl: {
                pending_approval: batches.filter(b => [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.TL_APPROVAL].includes(b.status as any))
            },
            admin: {
                pending_review: requisitions.filter(r => r.status === REQUISITION_STATUS.PENDING && r.type === 'ADHOC')
            }
        });
    } catch (error: any) {
        console.error("[getQueue]", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateBatchStatus = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { batchId } = req.params;
    const { status, reason } = req.body;

    try {
        const { data: batchReqs } = await supabase.from('requisitions').select('id, requester_id, department_id, title, requisition_number').eq('batch_id', batchId);

        if (status === REQUISITION_STATUS.REJECTED) {
            // First check the current batch status
            const { data: batch, error: batchCheck } = await supabase
                .from('requisition_batches')
                .select('status, batch_number')
                .eq('id', batchId)
                .single();

            if (batchCheck || !batch || batch.status === REQUISITION_STATUS.APPROVED) {
                return res.status(409).json({ error: 'Conflict: Batch is already approved or invalid.' });
            }

            // Use RPC for safe transaction deadlock fix
            const { error: rpcError } = await supabase.rpc('reject_requisition_batch', {
                target_batch_id: batchId,
                req_manifest_id: manifestId,
                reject_reason: reason || null
            });
            if (rpcError) throw rpcError;

            await supabase.from('requisition_logs').insert([{
                manifest_id: manifestId,
                batch_id: batchId,
                user_id: req.user?.id,
                action: 'REJECT_BATCH',
                previous_status: batch.status,
                new_status: REQUISITION_STATUS.REJECTED,
                details: { reason }
            }]);
            
            import('../utils/notifications').then(({ notifyRole, createNotification }) => {
                notifyRole(manifestId, 'Administrator', 'REQUISITION_ACTION', `Batch ${batch?.batch_number || batchId.slice(0,8)} has been rejected by the Team Leader.`);
                
                if (batchReqs) {
                    const uniqueRequesters = Array.from(new Set(batchReqs.filter(r => r.requester_id).map(r => r.requester_id)));
                    uniqueRequesters.forEach(requesterId => {
                        const userReqs = batchReqs.filter(r => r.requester_id === requesterId);
                        const deptId = userReqs[0]?.department_id;
                        const reqUrl = deptId ? `/departments/${deptId}/dashboard?tab=requisitions` : '/dashboard';
                        const reqNames = userReqs.map(r => r.title || r.requisition_number || `Req ${r.id.slice(0, 6)}`).join(', ');
                        createNotification(manifestId, requesterId, 'REQUISITION_ACTION', `Your requisition(s) [${reqNames}] in batch ${batch?.batch_number || batchId.slice(0,8)} have been rejected.`, batchId, reqUrl);
                    });
                }
            }).catch(err => console.error('Error importing notifyRole', err));
        } else {
            // Suppose TL is approving it to APPROVED
            const { data: batch, error: batchCheck } = await supabase
                .from('requisition_batches')
                .select('status, batch_number')
                .eq('id', batchId)
                .single();

            if (batchCheck || !batch) throw new Error('Batch not found');
            
            const expectedCurrentStatus = (status === REQUISITION_STATUS.APPROVED) ? [REQUISITION_STATUS.TL_APPROVAL, REQUISITION_STATUS.PENDING] : [REQUISITION_STATUS.PENDING];
            
            const updateData: any = { status };
            const { error: batchError } = await supabase
                .from('requisition_batches')
                .update(updateData)
                .eq('id', batchId)
                .in('status', expectedCurrentStatus as string[]); // Concurrency Control

            if (batchError) {
                if (batchError.code === 'PGRST116') return res.status(409).json({ error: 'Conflict: Batch state changed by another user.' });
                throw batchError;
            }

            const reqUpdateData: any = { status, updated_at: new Date().toISOString() };
            if (reason) reqUpdateData.rejection_reason = reason;

            const { error: reqError } = await supabase
                .from('requisitions')
                .update(reqUpdateData)
                .eq('manifest_id', manifestId)
                .eq('batch_id', batchId);

            if (reqError) throw reqError;

            await supabase.from('requisition_logs').insert([{
                manifest_id: manifestId,
                batch_id: batchId,
                user_id: req.user?.id,
                action: `UPDATE_BATCH_TO_${status}`,
                previous_status: batch.status,
                new_status: status,
                details: { reason }
            }]);
            
            import('../utils/notifications').then(({ notifyRole, createNotification }) => {
                if (status === REQUISITION_STATUS.APPROVED) {
                    notifyRole(manifestId, 'Finance', 'FINANCE_ACTION', `Batch ${batch.batch_number || batchId.slice(0,8)} has been approved and is ready for payment.`);
                }

                if (batchReqs) {
                    const uniqueRequesters = Array.from(new Set(batchReqs.filter(r => r.requester_id).map(r => r.requester_id)));
                    uniqueRequesters.forEach(requesterId => {
                        const userReqs = batchReqs.filter(r => r.requester_id === requesterId);
                        const deptId = userReqs[0]?.department_id;
                        const reqUrl = deptId ? `/departments/${deptId}/dashboard?tab=requisitions` : '/dashboard';
                        const reqNames = userReqs.map(r => r.title || r.requisition_number || `Req ${r.id.slice(0, 6)}`).join(', ');
                        createNotification(manifestId, requesterId, 'REQUISITION_ACTION', `Your requisition(s) [${reqNames}] in batch ${batch.batch_number || batchId.slice(0,8)} are now in status: ${status}.`, batchId, reqUrl);
                    });
                }
            }).catch(err => console.error('Error importing notifyRole', err));
        }

        res.json({ message: 'Batch status updated successfully' });
    } catch (error: any) {
        console.error("[updateBatchStatus]", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
