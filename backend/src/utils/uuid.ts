
/**
 * Safe UUID Casting Utility
 * 
 * Used during Stage 2A of UUID Migration to populate shadow _uuid columns.
 * Returns the string as a UUID if it matches the pattern, otherwise returns null.
 */
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function toUUID(val: any): string | null {
    if (!val || typeof val !== 'string') return null;
    if (UUID_REGEX.test(val)) {
        return val.toLowerCase();
    }
    return null;
}

const fallbackCache = new Map<string, number>();
const LOG_LIMIT_MS = 60000; // Log once per minute per distinct context

export function logLegacyFallback(table: string, id: string, context: string) {
    const key = `${table}:${context}`;
    const now = Date.now();
    const lastLog = fallbackCache.get(key) || 0;

    if (now - lastLog > LOG_LIMIT_MS) {
        console.warn(`[LEGACY_FALLBACK] Table: ${table}, Context: ${context}. Relying on legacy ID: ${id}`);
        fallbackCache.set(key, now);
    }
}
