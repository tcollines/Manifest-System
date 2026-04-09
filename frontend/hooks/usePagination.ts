import { useState, useMemo } from 'react';

interface UsePaginationOptions {
    pageSize?: number;
    initialPage?: number;
}

interface UsePaginationResult<T> {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    paginatedItems: T[];
    hasPrev: boolean;
    hasNext: boolean;
    goTo: (page: number) => void;
    next: () => void;
    prev: () => void;
    reset: () => void;
}

/**
 * usePagination — client-side pagination helper.
 * Slices a full array into pages. For server-side pagination use the store directly.
 *
 * @example
 * const { paginatedItems, page, totalPages, next, prev } = usePagination(members, { pageSize: 20 });
 */
export function usePagination<T>(
    items: T[],
    { pageSize = 20, initialPage = 1 }: UsePaginationOptions = {},
): UsePaginationResult<T> {
    const [page, setPage] = useState(initialPage);

    const totalItems  = items.length;
    const totalPages  = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage    = Math.min(Math.max(1, page), totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, safePage, pageSize]);

    return {
        page: safePage,
        pageSize,
        totalPages,
        totalItems,
        paginatedItems,
        hasPrev:  safePage > 1,
        hasNext:  safePage < totalPages,
        goTo:  (p) => setPage(Math.min(Math.max(1, p), totalPages)),
        next:  () => setPage(p => Math.min(p + 1, totalPages)),
        prev:  () => setPage(p => Math.max(p - 1, 1)),
        reset: () => setPage(initialPage),
    };
}
