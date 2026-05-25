import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
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

export const fulfillOrder = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await paymentsService.fulfillOrder(manifestId, req.body.orderId, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to fulfill order'); }
};

export const getProcurementPayments = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await paymentsService.getProcurementPayments(manifestId, req.params.id);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch payments'); }
};

export const recordProcurementPayment = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await paymentsService.recordProcurementPayment(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to record payment'); }
};

export const deleteProcurementPayment = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await paymentsService.deleteProcurementPayment(manifestId, req.params.paymentId, req.params.requestId, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to delete payment'); }
};
