import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
import * as catalogService from './catalog.service';

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

export const getCategories = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await catalogService.getCategories(manifestId);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch categories'); }
};

export const createCategory = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await catalogService.createCategory(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err: any) { 
        if (err.message?.includes('already exists')) {
            return res.status(400).json({ error: err.message });
        }
        handleApiError(res, err, 'Failed to create category'); 
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await catalogService.updateCategory(manifestId, req.params.id, req.body, auditContext);
        res.status(200).json(data);
    } catch (err: any) {
        if (err.message?.includes('already exists')) return res.status(400).json({ error: err.message });
        handleApiError(res, err, 'Failed to update category');
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await catalogService.deleteCategory(manifestId, req.params.id, auditContext);
        res.status(200).json({ success: true });
    } catch (err: any) {
        handleApiError(res, err, 'Failed to delete category');
    }
};

export const getProducts = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const data = await catalogService.getProducts(manifestId);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch products'); }
};

export const createProduct = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    const { categoryId, name, description } = req.body;
    try {
        const auditContext = buildAuditContext(req);
        const data = await catalogService.createProduct(manifestId, { category_id: categoryId, name, description }, auditContext);
        res.status(201).json(data);
    } catch (err: any) { 
        if (err.message?.includes('already exists')) {
            return res.status(400).json({ error: err.message });
        }
        handleApiError(res, err, 'Failed to create product'); 
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    const { categoryId, name, description } = req.body;
    try {
        const auditContext = buildAuditContext(req);
        const data = await catalogService.updateProduct(manifestId, req.params.id, { category_id: categoryId, name, description }, auditContext);
        res.status(200).json(data);
    } catch (err: any) {
        if (err.message?.includes('already exists')) return res.status(400).json({ error: err.message });
        handleApiError(res, err, 'Failed to update product');
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await catalogService.deleteProduct(manifestId, req.params.id, auditContext);
        res.status(200).json({ success: true });
    } catch (err: any) {
        handleApiError(res, err, 'Failed to delete product');
    }
};

export const getVariants = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const data = await catalogService.getVariants(manifestId, page, limit);
        res.status(200).json(data);
    } catch (err) { handleApiError(res, err, 'Failed to fetch variants'); }
};

export const createVariant = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await catalogService.createVariant(manifestId, req.body, auditContext);
        res.status(201).json(data);
    } catch (err: any) { 
        if (err.message?.includes('in use')) {
            return res.status(400).json({ error: err.message });
        }
        handleApiError(res, err, 'Failed to create variant'); 
    }
};

export const updateVariant = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        const data = await catalogService.updateVariant(manifestId, req.params.id, req.body, auditContext);
        res.status(200).json(data);
    } catch (err: any) {
        if (err.message?.includes('in use')) return res.status(400).json({ error: err.message });
        handleApiError(res, err, 'Failed to update variant');
    }
};

export const deleteVariant = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const auditContext = buildAuditContext(req);
        await catalogService.deleteVariant(manifestId, req.params.id, auditContext);
        res.status(200).json({ success: true });
    } catch (err: any) {
        handleApiError(res, err, 'Failed to delete variant');
    }
};

export const updateVariantStock = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    const { newStock } = req.body;
    try {
        const auditContext = buildAuditContext(req);
        await catalogService.updateVariantStock(manifestId, req.params.id, newStock, auditContext);
        res.status(200).json({ success: true });
    } catch (err) { handleApiError(res, err, 'Failed to update variant stock'); }
};
