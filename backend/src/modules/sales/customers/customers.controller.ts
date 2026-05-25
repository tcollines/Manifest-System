import { Request, Response } from 'express';
import { validateTenant, validateRole, handleApiError } from '../../../utils/supabaseHelper';
import * as customersService from './customers.service';

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

export const getCustomers = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await customersService.getCustomers(manifestId);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch customers');
    }
};

export const searchCustomers = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    const query = req.query.q as string || '';

    try {
        const data = await customersService.searchCustomers(manifestId, query);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to search customers');
    }
};

export const createCustomer = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const auditContext = buildAuditContext(req);
        const data = await customersService.createCustomer(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to create customer');
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const auditContext = buildAuditContext(req);
        const data = await customersService.updateCustomer(manifestId, req.params.id, req.body, auditContext);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to update customer');
    }
};

export const getCustomerHistory = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    
    try {
        const data = await customersService.getCustomerHistory(manifestId, req.params.id);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch customer history');
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, ['ADMIN', 'HOD'])) return;

    try {
        const auditContext = buildAuditContext(req);
        await customersService.deleteCustomer(manifestId, req.params.id, auditContext);
        res.status(200).json({ success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to delete customer');
    }
};
