import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
import { handleSalesError } from '../shared/salesErrors';
import * as paymentsService from './payments.service';

const buildAuditContext = (req: Request) => {
    const user = (req as any).user;
    return {
        manifestId: (req as any).manifestId,
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).requestId
    };
};

export const recordOrderPayment = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const paymentStatus = await paymentsService.recordOrderPayment(manifestId, req.body, auditContext);
        res.status(200).json({ success: true, paymentStatus });
    } catch (err) { handleApiError(res, err, 'Failed to record payment'); }
};

export const processRefund = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await paymentsService.processRefund(manifestId, req.body, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to process refund'); }
};

/**
 * POST /sales/orders/fulfill
 *
 * handleSalesError comes first so the RPC's refusals keep their meaning: not
 * fully paid and already completed are 422s the cashier can act on, a stock
 * shortfall is a 409, a closed month is a 409. All of them used to arrive as
 * 'Failed to fulfill order' with a 500.
 */
export const fulfillOrder = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await paymentsService.fulfillOrder(manifestId, req.body, auditContext);
        res.status(200).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to fulfill order');
    }
};

export const getProcurementPayments = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await paymentsService.getProcurementPayments(manifestId, req.params.id);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch payments'); }
};

// recordProcurementPayment and deleteProcurementPayment were removed with their
// routes — see the note in sales.routes.ts. Supplier payments are recorded by
// procurementController.recordSupplierPayment, which runs the migration-44 RPC.
