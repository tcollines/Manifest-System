import { Request, Response } from 'express';
import { validateTenant, validateRole, handleApiError } from '../../../utils/supabaseHelper';
import * as procurementService from './procurement.service';

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

export const getSuppliers = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await procurementService.getSuppliers(manifestId);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch suppliers'); }
};

export const createSupplier = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.createSupplier(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to create supplier'); }
};

export const getProcurementRequests = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await procurementService.getProcurementRequests(manifestId);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch procurement requests'); }
};

export const getProcurementRequestItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await procurementService.getProcurementRequestItems(manifestId, req.params.id);
        res.status(200).json(data);
    } catch (err: any) { 
        if (err.message === 'Request not found') return res.status(404).json({ error: err.message });
        handleApiError(res, err, 'Failed to fetch items'); 
    }
};

export const createRequestWithItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.createRequestWithItems(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to create procurement request'); }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await procurementService.updateRequestStatus(manifestId, req.params.id, req.body.status, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to update status'); }
};

export const deleteRequest = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, ['ADMIN', 'HOD'])) return;
    try {
        const auditContext = buildAuditContext(req);
        await procurementService.deleteRequest(manifestId, req.params.id, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to delete request'); }
};

export const updateRequestWithItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await procurementService.updateRequestWithItems(manifestId, req.params.id, req.body, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to update request'); }
};

export const receiveProcurementItem = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await procurementService.receiveProcurementItem(manifestId, req.body, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to receive item'); }
};
