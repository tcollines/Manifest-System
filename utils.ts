
export const validateContact = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    if (digits.length === 0) return '';

    // If it already starts with 256, just truncate to 12
    if (digits.startsWith('256')) {
        return digits.slice(0, 12);
    }

    // If it starts with 0 (e.g. 077...), replace 0 with 256
    if (digits.startsWith('0')) {
        return ('256' + digits.slice(1)).slice(0, 12);
    }

    // Otherwise, prepend 256
    return ('256' + digits).slice(0, 12);
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
