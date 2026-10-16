/**
 * SHARED FORMATTERS — Manifest Management System
 * All data formatting utilities live here.
 * STANDARDS.md §3: Centralised utilities enforced.
 */

// ─── Phone ───────────────────────────────────────────────────────────────────

/**
 * Formats a Ugandan phone number to E.164 standard (+256...).
 * Returns empty string if input is empty/invalid beyond repair.
 */
export const formatPhoneNumber = (value: string): string => {
    if (!value) return '';
    const hasPlus = value.trim().startsWith('+');
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0') && cleaned.length === 10)  return '+256' + cleaned.substring(1);
    if (cleaned.startsWith('256') && cleaned.length === 12) return '+' + cleaned;
    if (cleaned.length === 9)                               return '+256' + cleaned;
    if (hasPlus && cleaned.length > 7 && cleaned.length < 16) return '+' + cleaned;
    return hasPlus ? '+' + cleaned : cleaned;
};

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Formats an integer amount in UGX for display.
 * e.g. 150000 → "UGX 150,000"
 */
export const formatCurrency = (amount: number, currencyCode = 'UGX'): string => {
    if (isNaN(amount)) return `${currencyCode} 0`;
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Formats an integer amount in UGX for display (compact).
 * e.g. 1500000 → "UGX 1.5M"
 */
export const formatCompactCurrency = (amount: number, currencyCode = 'UGX'): string => {
    if (isNaN(amount)) return `${currencyCode} 0`;
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Formats a number compactly.
 * e.g. 1500000 → "1.5M"
 */
export const formatCompactNumber = (amount: number): string => {
    if (isNaN(amount)) return `0`;
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Strips commas and converts a display string to integer cents.
 * "10,000" → 10000
 */
export const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/,/g, '').trim();
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
};

// ─── Usernames ────────────────────────────────────────────────────────────────

/**
 * Normalises a username: lowercase, trimmed, spaces → underscores.
 */
export const normalizeUsername = (value: string): string =>
    value.trim().toLowerCase().replace(/\s+/g, '_');

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Today's date in Africa/Kampala as YYYY-MM-DD.
 *
 * The organisation operates in EAT, so "today" must be the local day, not the
 * browser's. A device set to UTC would otherwise post a 01:30 EAT entry to the
 * previous date. Kampala has no DST, so a fixed +03:00 shift is exact.
 */
export const getKampalaToday = (): string =>
    new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Renders a timestamp as the calendar date it fell on in Africa/Kampala.
 *
 * Use this for anything derived from a timestamp. A plain YYYY-MM-DD value
 * coming from the backend is already a Kampala date and needs no shift, so it
 * is passed through untouched.
 */
export const formatKampalaDate = (value: string | null | undefined): string => {
    if (!value) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return formatDate(new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10));
};

export const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Formats an ISO date string to a human-readable date with an ordinal suffix.
 * e.g. "2026-04-03" → "3rd Apr 2026"
 */
export const formatDateOrdinal = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    
    const day = d.getDate();
    const ordinal = (day % 10 === 1 && day !== 11) ? 'st' :
                    (day % 10 === 2 && day !== 12) ? 'nd' :
                    (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
                    
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    
    return `${day}${ordinal} ${month} ${year}`;
};

/**
 * Formats an ISO datetime to a short time string.
 * e.g. "2026-04-03T14:30:00Z" → "2:30 PM"
 */
export const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Returns "Mon 7 Apr 2026" style label from a Date or ISO string.
 */
export const formatDayLabel = (value: Date | string): string => {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Returns the Monday of the week for a given date (ISO string).
 */
export const getWeekStart = (date: Date = new Date()): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Capitalise first letter of each word. */
export const titleCase = (str: string): string =>
    str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/** Truncate long strings with an ellipsis. */
export const truncate = (str: string, maxLen = 50): string =>
    str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;

/** Generate initials from a full name. e.g. "Sarah Naiga" → "SN" */
export const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(n => n[0]?.toUpperCase() ?? '')
        .join('');
