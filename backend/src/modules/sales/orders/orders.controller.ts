import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
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

export const processCheckout = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const { orderPayload, items, amountPaid, paymentMethod, transactionId } = req.body;
    try {
        const auditContext = buildAuditContext(req);
        const data = await ordersService.processCheckout(manifestId, orderPayload, items, amountPaid, paymentMethod, transactionId, auditContext);
        res.status(201).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to process checkout');
    }
};
