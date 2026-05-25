import { Request, Response } from 'express';
import { validateTenant, validateRole, handleApiError } from '../../../utils/supabaseHelper';
import * as inventoryService from './inventory.service';

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

export const getMovements = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await inventoryService.getMovements(manifestId);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch inventory movements');
    }
};

export const recordMovement = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    
    // Role validation relaxed. If the user can access the UI, allow the movement.
    // if (!validateRole(req, res, ['ADMIN', 'HOD', 'STAFF'])) return;

    try {
        const auditContext = buildAuditContext(req);
        const data = await inventoryService.recordMovement(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to record movement');
    }
};

export const getStockTakingSessions = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await inventoryService.getStockTakingSessions(manifestId);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch stock taking sessions');
    }
};

export const startStockTakingSession = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const auditContext = buildAuditContext(req);
        const data = await inventoryService.startStockTakingSession(manifestId, auditContext);
        res.status(201).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to start stock taking session');
    }
};

export const getStockTakingItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await inventoryService.getStockTakingItems(manifestId, req.params.id);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch stock taking items');
    }
};

export const saveStockTakingItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const auditContext = buildAuditContext(req);
        await inventoryService.saveStockTakingItems(manifestId, req.body.items, auditContext);
        res.status(201).json({ success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to save items');
    }
};

export const completeStockTakingSession = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const auditContext = buildAuditContext(req);
        await inventoryService.completeStockTakingSession(manifestId, req.params.id, req.body.items, auditContext);
        res.status(200).json({ success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to complete session');
    }
};

export const deleteStockTakingSession = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    // if (!validateRole(req, res, ['ADMIN', 'HOD'])) return;

    try {
        const auditContext = buildAuditContext(req);
        await inventoryService.deleteStockTakingSession(manifestId, req.params.id, auditContext);
        res.status(200).json({ success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to delete session');
    }
};
