import { Response } from 'express';
import { sendError } from '../../../shared/responses';

/**
 * Maps the SALES_* errors raised by the Phase 1 and Phase 2 Postgres RPCs onto
 * HTTP status codes.
 *
 * The RPCs raise with an explicit SQLSTATE and a `SALES_<REASON>: <detail>`
 * message. supabase-js surfaces that as `{ code, message, details, hint }`,
 * where `code` is the SQLSTATE. Without this mapper every one of them reaches
 * the client as a 500 via `handleApiError`, so a caller cannot tell "you are
 * out of money" from "the database fell over".
 *
 * Map is defined once here and reused by every sales module.
 */

/** SQLSTATEs the sales RPCs raise. */
export const SALES_SQLSTATE = {
    PERIOD_CLOSED: 'P0001',
    NOT_FOUND: 'P0002',
    INSUFFICIENT_FUNDS: 'P0003',
    INVALID_INPUT: 'P0004',
    FORBIDDEN: 'P0005',
    INSUFFICIENT_STOCK: 'P0006'
} as const;

export type SalesSqlState = typeof SALES_SQLSTATE[keyof typeof SALES_SQLSTATE];

const HTTP_STATUS_BY_SQLSTATE: Record<string, number> = {
    [SALES_SQLSTATE.PERIOD_CLOSED]: 409,
    [SALES_SQLSTATE.NOT_FOUND]: 404,
    [SALES_SQLSTATE.INSUFFICIENT_FUNDS]: 422,
    [SALES_SQLSTATE.INVALID_INPUT]: 422,
    [SALES_SQLSTATE.FORBIDDEN]: 403,
    [SALES_SQLSTATE.INSUFFICIENT_STOCK]: 409
};

export interface ParsedSalesError {
    /** HTTP status this maps onto. */
    httpStatus: number;
    /** The SQLSTATE the RPC raised, e.g. 'P0003'. */
    sqlState: string;
    /** The SALES_* sentinel, e.g. 'SALES_INSUFFICIENT_FUNDS'. Null if absent. */
    reason: string | null;
    /** The detail after the sentinel, or the whole message if there is none. */
    message: string;
    /**
     * What the client should actually be shown.
     *
     * The RPCs put the description in the sentinel and only the offending value
     * in the detail — `SALES_ACCOUNT_NOT_FOUND: <uuid>`. Sending `message`
     * alone therefore hands the caller a bare uuid and no statement of what
     * went wrong, so the sentinel is turned back into words and prefixed.
     */
    clientMessage: string;
}

// [\s\S] rather than the `s` flag: the build targets a pre-ES2018 lib.
const SENTINEL_PATTERN = /^(SALES_[A-Z_]+):\s*([\s\S]*)$/;

/**
 * Turns a sentinel into the phrase it stands for: SALES_ACCOUNT_NOT_FOUND
 * becomes "Account not found".
 */
const describeReason = (reason: string): string => {
    const words = reason.replace(/^SALES_/, '').replace(/_/g, ' ').toLowerCase().trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
};

/**
 * Builds the message the caller sees.
 *
 * The detail on its own is frequently just the id that was not found, so the
 * sentinel's own words are put in front of it. A detail that already opens with
 * that phrase is left alone rather than stuttering.
 */
const buildClientMessage = (reason: string | null, detail: string): string => {
    if (!reason) return detail;
    const phrase = describeReason(reason);
    if (!phrase) return detail;
    if (!detail) return phrase;
    if (detail.toLowerCase().startsWith(phrase.toLowerCase())) return detail;
    return `${phrase}: ${detail}`;
};

/**
 * Recognises an error thrown by a sales RPC.
 *
 * Returns null for anything else — a network failure, a constraint violation,
 * a bug — so the caller falls through to its normal 500 handling rather than
 * dressing an unknown fault up as a clean business rejection.
 */
export const parseSalesRpcError = (error: any): ParsedSalesError | null => {
    const sqlState: unknown = error?.code;
    if (typeof sqlState !== 'string') return null;

    const httpStatus = HTTP_STATUS_BY_SQLSTATE[sqlState];
    if (!httpStatus) return null;

    const rawMessage = typeof error?.message === 'string' ? error.message : '';
    const match = SENTINEL_PATTERN.exec(rawMessage);
    const reason = match ? match[1] : null;
    const detail = match ? match[2].trim() : rawMessage;

    return {
        httpStatus,
        sqlState,
        reason,
        message: detail,
        clientMessage: buildClientMessage(reason, detail)
    };
};

/**
 * A rejection raised by a sales service before it ever reaches Postgres —
 * a malformed payload, a missing record, a business rule checked in the
 * service layer.
 *
 * Carries its own HTTP status so the controller does not have to string-match
 * on messages, and a `field` so validation failures can name the offending
 * input as VALIDATION_RULES requires.
 */
export class SalesRequestError extends Error {
    constructor(
        public readonly httpStatus: number,
        message: string,
        public readonly field?: string
    ) {
        super(message);
        this.name = 'SalesRequestError';
    }

    /** Validation failure. Names the field, per VALIDATION_RULES section 3. */
    static validation(field: string, message: string): SalesRequestError {
        return new SalesRequestError(422, `Validation failed -> ${field}: "${message}"`, field);
    }

    static notFound(message: string): SalesRequestError {
        return new SalesRequestError(404, message);
    }

    static conflict(message: string): SalesRequestError {
        return new SalesRequestError(409, message);
    }
}

/**
 * Sends a sales error as its mapped HTTP status, or returns false if the error
 * is not one this module recognises.
 *
 * Handles both a SalesRequestError raised by a service and a SALES_* error
 * raised by an RPC. Use it as a guard so unknown failures keep their existing
 * handling and are not disguised as clean business rejections:
 *
 *   } catch (err) {
 *       if (handleSalesError(res, err)) return;
 *       handleApiError(res, err, 'Failed to receive stock');
 *   }
 */
export const handleSalesError = (res: Response, error: any): boolean => {
    if (error instanceof SalesRequestError) {
        console.info(`[SALES] ${error.httpStatus}: ${error.message}`);
        sendError(res, error.message, error.httpStatus);
        return true;
    }

    const parsed = parseSalesRpcError(error);
    if (!parsed) return false;

    // Business rejections are expected traffic, not incidents. Log at info so
    // they stay visible without polluting the error stream.
    console.info(
        `[SALES RPC] ${parsed.reason ?? parsed.sqlState} -> ${parsed.httpStatus}: ${parsed.message}`
    );

    sendError(res, parsed.clientMessage, parsed.httpStatus);
    return true;
};
