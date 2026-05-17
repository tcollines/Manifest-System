
import { User } from './types';
// import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input';

export const validateContact = (value: string): string => {
    if (!value) return '';

    // Remove all non-numeric characters (allow leading +)
    let cleaned = value.trim();

    // Check if it starts with +
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\D/g, '');

    if (cleaned.length === 0) return '';

    // Ugandan Number Logic (Most common use case)
    // 1. If starts with 256 (9 digits after), perfect.
    // 2. If starts with 07... or 03... (10 digits), strip 0 adds 256.
    // 3. If 9 digits, add 256.

    // Case: 07XX XXX XXX (10 digits)
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        return '+256' + cleaned.substring(1);
    }

    // Case: 256 7XX XXX XXX (12 digits)
    if (cleaned.startsWith('256') && cleaned.length === 12) {
        return '+' + cleaned;
    }

    // Case: 7XX XXX XXX (9 digits)
    if (cleaned.length === 9) {
        return '+256' + cleaned;
    }

    // Fallback: If generic international (starts with + originally or reasonable length)
    if (hasPlus && cleaned.length > 7 && cleaned.length < 16) {
        return '+' + cleaned;
    }

    // If strict formatting fails but we have digits, return them with + if originally present
    // or just assume local if it looks like it. 
    // For safety, let's return reasonable guesses for UG, else raw.
    return hasPlus ? '+' + cleaned : cleaned;
};

export const isEventLocked = (eventDate: string): boolean => {
    // Event locks 48 hours after the event date (midnight)
    const event = new Date(eventDate);
    const now = new Date();

    // Add 48 hours to event date
    const lockTime = new Date(event);
    lockTime.setHours(lockTime.getHours() + 48);

    return now > lockTime;
};

export const isServiceClosed = (serviceDate: string): boolean => {
    // Service closes 24 hours after the service date (midnight)
    const service = new Date(serviceDate);
    service.setHours(0, 0, 0, 0); // Ensure we start from midnight of that day
    const now = new Date();

    // Add 24 hours to service date
    const closeTime = new Date(service);
    closeTime.setHours(closeTime.getHours() + 24);

    return now > closeTime;
};

// Helper for plate validation
export const validatePlate = (val: string) => {
    // 1. Clean input: Remove all spaces and non-alphanumeric chars (just in case)
    const raw = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // 2. Initial Length Check for raw input (should be 6 or 7 chars: e.g. UAA123, UAA123A, UA123A)
    // Most Ugandan plates are: 3 letters + 3 digits + 0-1 letter. Or 2 letters?
    // User examples: UAA123A (7 chars), UA123AA (7 chars).
    // Let's assume valid RAW length is 6 or 7.
    // Actually, user said "restricted to 7 characters without space".

    // Regex for RAW string (no spaces):
    // ^U[A-Z]{1,2}\d{3}[A-Z]{1,2}$
    // U + 1-2 letters + 3 digits + 1-2 letters.
    // This allows:
    // UAA 123 A -> UAA123A (7 chars)
    // UA 123 AA -> UA123AA (7 chars)
    // UAA 123 -> UAA123 (6 chars) - Old format? Maybe allow.
    // Let's check regex against the stripped string.

    const regex = /^U[A-Z]{1,2}\d{3}[A-Z]{1,2}$/;

    if (!regex.test(raw)) {
        return { valid: false, formatted: val.toUpperCase() }; // Return as uppercase at least
    }

    // 3. Format Insertion
    // We need to insert space before the 3 digits.
    // The digits are always 3 chars \d{3}.
    // Find the digits.
    const digitMatch = raw.match(/\d{3}/);
    if (digitMatch && digitMatch.index) {
        const prefix = raw.substring(0, digitMatch.index);
        const rest = raw.substring(digitMatch.index);
        // Result: PREFIX + SPACE + REST
        // e.g. UAA + " " + 123A
        // e.g. UA + " " + 123AA
        const formatted = `${prefix} ${rest}`;
        return { valid: true, formatted };
    }

    return { valid: false, formatted: val };
};

// Helper for Driver Identity (NIN or Permit) Validation
export const validateDriverIdentity = (val: string) => {
    // 1. Clean input: Remove spaces and special chars
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (!clean) return { valid: false, formatted: '', error: 'ID is required' };

    // 2. Logic: "If detected that the NIN or permit number is Ugandan..."
    // Most Ugandan NINs start with 'C' (e.g. CM, CF).
    // If it looks like a NIN (starts with C), enforce strict 14 characters.
    if (clean.startsWith('C')) {
        if (clean.length !== 14) {
            return {
                valid: false,
                formatted: clean,
                error: `Invalid Ugandan NIN format. Expected 14 characters (e.g. CM...), got ${clean.length}.`
            };
        }
        return { valid: true, formatted: clean, type: 'Ugandan NIN' };
    }

    // 3. Ugandan Driving Permits (Old & New)
    // For non-NIN (doesn't start with C), we strictly enforce a sensible minimum length (5).
    if (clean.length < 5) {
        return { valid: false, formatted: clean, error: 'ID Number is too short.' };
    }

    return { valid: true, formatted: clean, type: 'Permit/Foreign' };
};


import { DEPARTMENTS } from './constants';

export const getDashboardForUser = (user: User): string => {
    if (user.role === 'Super Admin' || user.role === 'Administrator') return '/dashboard';

    if (user.role === 'TeamLeader' || user.role === 'Team Leader') return '/dashboard';
    if (user.role === 'Logistics') return '/departments/d1/events';
    if (user.role === 'Vehicle Coordinator') return '/transportation';
    if (user.role === 'Stage Coordinator') return '/departments/4630e48a-f97e-48fd-a901-864b591c282f/stage-dashboard';
    if (user.role === 'Resident Coordinator') return '/departments/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/my-residency';
    if (user.role === 'Coordinator') {
        if (user.stationId) return '/departments/4630e48a-f97e-48fd-a901-864b591c282f/stage-dashboard';
        return '/transportation';
    }

    // Dynamic Department Routing (Supports UUID, Slug, and Legacy Code)
    const normalizedDeptId = user.departmentId?.toLowerCase();
    const dept = DEPARTMENTS.find(d =>
        d.id === user.departmentId ||
        d.uuid === user.departmentId ||
        d.slug === normalizedDeptId ||
        d.code === normalizedDeptId // Legacy 'd1' support
    );

    if (dept) {
        switch (dept.slug) {
            case 'registration': return '/registration';
            case 'next-gen': return '/next-gen';
            case 'parking': return '/parking';
            case 'finance': return '/finance';
            case 'transportation': return '/transportation';
            case 'follow-up': return '/follow-up';
            case 'schools': return '/schools';
            case 'healing': return '/healing';
            case 'campus': return '/campus';
            case 'administration': return '/dashboard'; // Admin backup
        }
    }

    // [FIX 5] Changed from /dashboard → /setup-account.
    // /dashboard is protected (Admin only) — unknown dept users were caught in an infinite loop.
    // [FIX 6] Custom department UUIDs now route to GenericDeptDashboard.
    // A UUID is 36 chars with dashes — if it matches that pattern it's a custom dept.
    const id = user.departmentId;
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return `/departments/${id}/dashboard`;
    }
    // Truly unknown — send to root to re-evaluate
    return '/';
};

