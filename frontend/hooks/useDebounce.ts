import { useState, useEffect } from 'react';

/**
 * useDebounce — delays a value update by the given delay (ms).
 * Use for search inputs to avoid firing an API call on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 350);
 * useEffect(() => { fetchMembers(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay = 350): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
