import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
import { handleSalesError } from '../shared/salesErrors';
import * as ordersService from './orders.service';

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

export const getOrders = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await ordersService.getOrders(manifestId);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch orders');
    }
};

export const getOrderItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await ordersService.getOrderItems(manifestId, req.params.id);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch order items');
    }
};

export const createOrder = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const { payload, items } = req.body;
    try {
        const auditContext = buildAuditContext(req);
        const data = await ordersService.createOrder(manifestId, payload, items, auditContext);
        res.status(201).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to create order');
    }
};

/**
 * POST /sales/orders/checkout
 *
 * The payload is now camelCase and validated by ProcessCheckoutSchema, which
 * is `.strict()`: the old free-form `orderPayload` was merged straight into the
 * order row, so any column of sales_orders was writable from the browser.
 * Errors go through handleSalesError first so a refusal from the RPC — out of
 * stock, account not in this manifest, month already closed — reaches the
 * cashier as its own status and message instead of a blanket 500.
 */
export const processCheckout = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const auditContext = buildAuditContext(req);
        const data = await ordersService.processCheckout(manifestId, req.body, auditContext);
        res.status(201).json({ success: true, data });
    } catch (err) {
        if (handleSalesError(res, err)) return;
        handleApiError(res, err, 'Failed to process checkout');
    }
};
