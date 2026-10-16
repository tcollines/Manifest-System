import { z, ZodError, ZodType } from 'zod';
import { SalesRequestError } from '../../modules/sales/shared/salesErrors';

/**
 * Shared schema primitives, per VALIDATION_RULES.md section 2: payload
 * validation goes through a schema wrapper kept in /shared/validators/, not
 * through hand-rolled `if` chains repeated in each service.
 *
 * The messages here are the ones the caller sees, because section 3 requires a
 * failure to name its own field and say what was wrong — never "Failed to save".
 */

/** VALIDATION_RULES section 1.1. */
export const UUID_V4_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uuidV4 = z.string().regex(UUID_V4_PATTERN, 'Must be a valid v4 UUID');

/**
 * Money.
 *
 * Section 1.3 is explicit that amounts cross the wire as integers, so a
 * formatted string like "10,000" is rejected rather than coerced. z.number()
 * already refuses a string; .int() refuses 1000.5.
 */
export const shillings = z
    .number({ message: 'Must be a whole number of shillings, not a formatted string' })
    .int('Must be a whole number of shillings, not a fractional amount')
    .positive('Must be greater than zero');

export const nonNegativeShillings = z
    .number({ message: 'Must be a whole number of shillings, not a formatted string' })
    .int('Must be a whole number of shillings, not a fractional amount')
    .min(0, 'Must be zero or more');

export const positiveCount = z
    .number({ message: 'Must be a whole number' })
    .int('Must be a whole number')
    .positive('Must be greater than zero');

/**
 * A calendar date, YYYY-MM-DD.
 *
 * Deliberately not a timestamp. CLAUDE.md requires a date derived from a
 * timestamp to be converted to Africa/Kampala before truncating, so callers
 * pass a date that is already a Kampala day rather than leaving the server to
 * guess which day a 01:30 instant belongs to.
 */
export const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a calendar date as YYYY-MM-DD')
    .refine(v => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Must be a real calendar date');

/** Renders a Zod path as the dotted/indexed field name the caller sent. */
export const formatPath = (path: ReadonlyArray<PropertyKey>): string =>
    path.reduce<string>((acc, segment) => {
        if (typeof segment === 'number') return `${acc}[${segment}]`;
        return acc ? `${acc}.${String(segment)}` : String(segment);
    }, '');

/**
 * Turns the first Zod issue into the error shape the rest of the sales module
 * already throws, so a schema failure and a hand-written rejection reach the
 * client identically: `Validation failed -> field: "message"`.
 *
 * Only the first issue is surfaced. The endpoints are small and a caller fixes
 * one field at a time; reporting a list would change the message format that
 * section 3 pins down.
 */
export const toSalesValidationError = (error: ZodError): SalesRequestError => {
    const issue = error.issues[0];
    const field = formatPath(issue.path) || 'payload';

    // An unrecognised key is reported by Zod against the object, not the key,
    // so name the offending key instead of blaming the whole payload. This is
    // the case that matters most: a misspelt field used to be dropped in
    // silence, which reads as "the system ignored what I typed".
    if (issue.code === 'unrecognized_keys') {
        const keys = (issue as any).keys as string[];
        return SalesRequestError.validation(
            keys.join(', '),
            'Unknown field. Check the spelling — it would otherwise be ignored in silence'
        );
    }

    return SalesRequestError.validation(field, issue.message);
};

/**
 * Validates a payload and returns it typed, or throws the 422 the controller
 * already knows how to send.
 */
export const parseOrThrow = <T extends ZodType>(schema: T, payload: unknown): z.infer<T> => {
    const result = schema.safeParse(payload ?? {});
    if (!result.success) throw toSalesValidationError(result.error);
    return result.data;
};
