import { Response } from 'express';

/**
 * Standardized success response format.
 * @param res Express Response object
 * @param data The payload to return
 * @param statusCode HTTP Status Code (default: 200)
 */
export const sendSuccess = <T>(res: Response, data: T, statusCode: number = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        error: null
    });
};

/**
 * Standardized error response format.
 * @param res Express Response object
 * @param error Error message or object
 * @param statusCode HTTP Status Code (default: 400)
 */
export const sendError = (res: Response, error: string | any, statusCode: number = 400) => {
    return res.status(statusCode).json({
        success: false,
        data: null,
        error: typeof error === 'string' ? error : error?.message || 'An unknown error occurred'
    });
};
