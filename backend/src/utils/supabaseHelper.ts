import { Request, Response } from 'express';
import { sendError } from '../shared/responses';

/**
 * Validates that the request has a manifestId (tenant ID) and returns it.
 * If missing, sends a 401 response and returns null.
 */
export const validateTenant = (req: Request, res: Response): string | null => {
    if (!req.manifestId) {
        sendError(res, 'Unauthorized: Missing tenant manifest ID. Data isolation failed.', 401);
        return null;
    }
    return req.manifestId;
};

/**
 * Validates that the requesting user has one of the allowed roles.
 * If not, sends a 403 response and returns false.
 */
export const validateRole = (req: Request, res: Response, allowedRoles: string[]): boolean => {
    const rawRole = req.user?.role;
    if (!rawRole) {
        sendError(res, 'Forbidden: Insufficient permissions to perform this action.', 403);
        return false;
    }

    let role = rawRole.toUpperCase();
    
    // Comprehensive Normalization
    if (role.includes('ADMIN')) role = 'ADMIN';
    else if (role.includes('HEAD OF DEPT') || role.includes('DEPARTMENT')) role = 'HOD';
    else if (role.includes('COORD') || role === 'STAGE COORDINATOR' || role === 'VEHICLE COORDINATOR') role = 'COORDINATOR';
    else if (role === 'STAFF') role = 'STAFF';
    else if (role === 'DATA ENTRANT') role = 'DATA_ENTRANT';

    // In case the allowedRoles uses the raw unnormalized versions, we also check the raw one
    if (!allowedRoles.includes(role) && !allowedRoles.includes(rawRole)) {
        sendError(res, 'Forbidden: Insufficient permissions to perform this action.', 403);
        return false;
    }
    return true;
};

/**
 * Standardized error handler for Supabase or general API errors.
 */
export const handleApiError = (res: Response, error: any, defaultMessage = 'An internal server error occurred') => {
    console.error(`[API ERROR] ${defaultMessage}:`, error);
    const message = error?.message || defaultMessage;
    sendError(res, message, 500);
};
