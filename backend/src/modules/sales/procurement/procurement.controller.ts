import { Request, Response } from 'express';
import { validateTenant, validateRole, handleApiError } from '../../../utils/supabaseHelper';
import { handleSalesError } from '../shared/salesErrors';
import {
    GOODS_RECEIPT_ROLES,
    SUPPLIER_PAYMENT_ROLES,
    SUPPLIER_LEDGER_READ_ROLES
} from '../shared/salesConstants';
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
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const data = await procurementService.getProcurementRequests(manifestId, page, limit);
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

export const getGoodsReceipts = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, SUPPLIER_LEDGER_READ_ROLES)) return;
    try {
        const data = await procurementService.getGoodsReceipts(manifestId, {
            supplierId: req.query.supplierId as string | undefined,
            from: req.query.from as string | undefined,
            to: req.query.to as string | undefined,
            page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
        });
        res.status(200).json(data);
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to fetch goods receipts');
    }
};

export const createGoodsReceipt = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, GOODS_RECEIPT_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.createGoodsReceipt(manifestId, req.body, auditContext);
        res.status(201).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to record goods receipt');
    }
};

export const getSupplierStatement = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, SUPPLIER_LEDGER_READ_ROLES)) return;
    try {
        const data = await procurementService.getSupplierStatement(manifestId, req.params.id, {
            from: req.query.from as string | undefined,
            to: req.query.to as string | undefined
        });
        res.status(200).json(data);
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to fetch supplier statement');
    }
};

export const recordSupplierPayment = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, SUPPLIER_PAYMENT_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.recordSupplierPayment(
            manifestId, req.params.id, req.body, auditContext
        );
        res.status(201).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to record supplier payment');
    }
};

export const updateSupplierPayment = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, SUPPLIER_PAYMENT_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.updateSupplierPayment(
            manifestId, req.params.paymentId, req.body, auditContext
        );
        res.status(200).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to update supplier payment');
    }
};

export const deleteSupplierPayment = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, SUPPLIER_PAYMENT_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.deleteSupplierPayment(
            manifestId, req.params.paymentId, auditContext
        );
        res.status(200).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to delete supplier payment');
    }
};

export const receiveProcurementItem = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, GOODS_RECEIPT_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await procurementService.receiveProcurementItem(manifestId, req.body, auditContext);
        res.status(200).json({ success: true, data });
    } catch (err) {
        // Business rejections carry their own status: a closed period is a 409,
        // not fully paid is a 422, a bad id is a 404. Only genuine faults fall
        // through to the 500 handler.
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to receive item');
    }
};
