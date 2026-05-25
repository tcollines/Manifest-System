import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
import * as reportsService from './reports.service';

export const getCashPosition = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try { 
        res.status(200).json(await reportsService.fetchCashPosition(manifestId)); 
    } catch (err) { handleApiError(res, err, 'Failed to fetch cash position'); }
};

export const getInventoryValuation = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try { 
        res.status(200).json(await reportsService.fetchInventoryValuation(manifestId)); 
    } catch (err) { handleApiError(res, err, 'Failed to fetch valuation'); }
};

export const getAllTimeStats = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try { 
        res.status(200).json(await reportsService.fetchAllTimeStats(manifestId)); 
    } catch (err) { handleApiError(res, err, 'Failed to fetch stats'); }
};

export const getDailySales = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    const { date } = req.query;
    try {
        res.status(200).json(await reportsService.getDailySales(manifestId, date as string));
    } catch (err) { handleApiError(res, err, 'Failed to fetch daily sales'); }
};

export const getFinancialPosition = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try { 
        res.status(200).json(await reportsService.fetchFinancialPosition(manifestId)); 
    } catch (err) { handleApiError(res, err, 'Failed to fetch financial position'); }
};

export const getSalesSummary = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        res.status(200).json(await reportsService.getSalesSummary(manifestId));
    } catch (err) { handleApiError(res, err, 'Failed to fetch summary'); }
};
