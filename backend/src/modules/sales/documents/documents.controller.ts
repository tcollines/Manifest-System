import { Request, Response } from 'express';
import { validateTenant, handleApiError } from '../../../utils/supabaseHelper';
import * as documentsService from './documents.service';

export const getDocuments = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const data = await documentsService.getDocuments(manifestId);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch business documents');
    }
};

export const generateDocument = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const { documentName, reportType, dateRange } = req.body;
    const user = (req as any).user;

    try {
        const data = await documentsService.generateDocument(
            manifestId, 
            documentName, 
            reportType, 
            dateRange, 
            user?.name, 
            user?.id
        );
        res.status(201).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to generate business document');
    }
};

export const updateDocumentStatus = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const { id } = req.params;
    const { status } = req.body;

    try {
        const data = await documentsService.updateDocumentStatus(manifestId, id, status);
        res.status(200).json(data);
    } catch (err) {
        handleApiError(res, err, 'Failed to update document status');
    }
};
