import { Request, Response } from 'express';
import { validateTenant, validateRole, handleApiError } from '../../../utils/supabaseHelper';
import { handleSalesError } from '../shared/salesErrors';
import { ACCOUNT_ADMIN_ROLES } from '../shared/salesConstants';
import * as accountsService from './accounts.service';

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

export const getAccounts = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await accountsService.getAccounts(manifestId, {
            asOf: req.query.asOf as string | undefined,
            includeInactive: req.query.includeInactive === 'true'
        });
        res.status(200).json(data);
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to fetch accounts');
    }
};

export const getAccountBalances = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await accountsService.getAccountBalances(manifestId, req.query.asOf as string | undefined);
        res.status(200).json(data);
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to fetch account balances');
    }
};

export const getAccountCashbook = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await accountsService.getAccountCashbook(manifestId, req.params.id, {
            from: req.query.from as string | undefined,
            to: req.query.to as string | undefined
        });
        res.status(200).json(data);
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to fetch cashbook');
    }
};

/**
 * Creating an account is gated to Admin/HOD. The plan names those roles for
 * editing an account but is silent on creating one; a new till that money can
 * be booked against is at least as structural as renaming an existing one, so
 * it carries the same gate. Flagged as a deliberate addition to the plan.
 */
export const createAccount = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, ACCOUNT_ADMIN_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await accountsService.createAccount(manifestId, req.body, auditContext);
        res.status(201).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to create account');
    }
};

/** Admin/HOD only — restating an opening balance rewrites every reported balance. */
export const updateAccount = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    if (!validateRole(req, res, ACCOUNT_ADMIN_ROLES)) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await accountsService.updateAccount(manifestId, req.params.id, req.body, auditContext);
        res.status(200).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to update account');
    }
};
