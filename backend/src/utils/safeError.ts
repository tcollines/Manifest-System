import { Response } from 'express';

/**
 * [SECURITY] Centralized safe error responder.
 *
 * NEVER return error.message directly to the client in production.
 * Raw Postgres/Supabase errors expose table names, column names,
 * constraint names, and type details - all useful to an attacker.
 *
 * Usage:
 *   catch (error: any) { safeError(res, error); }
 */
export const safeError = (
    res: Response,
    error: unknown,
    statusCode: number = 500
): void => {
    // Always log the full error server-side for debugging
    console.error('[API ERROR]', error);

    // Return a generic message to the client — never the raw DB error
    res.status(statusCode).json({
        error: 'An internal server error occurred. Please try again.'
    });
};

/**
 * Safe 404 helper.
 */
export const notFound = (res: Response, resource = 'Resource'): void => {
    res.status(404).json({ error: `${resource} not found.` });
};
