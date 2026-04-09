import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TableColumn<T> {
    key: keyof T | string;
    header: string;
    /** Custom render function — receives the row item */
    render?: (item: T) => React.ReactNode;
    /** If true, column is sortable */
    sortable?: boolean;
    /** Tailwind width class e.g. 'w-32' */
    width?: string;
    /** Alignment: 'left' (default) | 'center' | 'right' */
    align?: 'left' | 'center' | 'right';
    /** Hide on mobile */
    hideOnMobile?: boolean;
}

interface DataTableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    loading?: boolean;
    emptyMessage?: string;
    emptyVariant?: 'default' | 'search' | 'members' | 'schedule' | 'finance';
    /** Rows per page (default 20, 0 = no pagination) */
    pageSize?: number;
    /** Optional row click handler */
    onRowClick?: (item: T) => void;
    className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DataTable — generic sortable, paginated table.
 * All data list views should use this component.
 */
function DataTable<T>({
    columns,
    data,
    keyExtractor,
    loading = false,
    emptyMessage,
    emptyVariant = 'default',
    pageSize = 20,
    onRowClick,
    className = '',
}: DataTableProps<T>) {
    const [sortKey, setSortKey]       = useState<string | null>(null);
    const [sortDir, setSortDir]       = useState<SortDirection>(null);
    const [page, setPage]             = useState(1);

    // ── Sort ─────────────────────────────────────────────────────────────────
    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
            if (sortDir === 'desc') setSortKey(null);
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };

    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return data;
        return [...data].sort((a, b) => {
            const av = (a as any)[sortKey];
            const bv = (b as any)[sortKey];
            const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
    const safePage   = Math.min(Math.max(1, page), totalPages);
    const visible    = pageSize > 0
        ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
        : sorted;

    // ─── Render ───────────────────────────────────────────────────────────────
    const alignClass = (align?: string) =>
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    const SortIcon = ({ col }: { col: TableColumn<T> }) => {
        if (!col.sortable) return null;
        const k = String(col.key);
        if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-1 inline" />;
        if (sortDir === 'asc')  return <ChevronUp   className="w-3 h-3 text-ministry-orange ml-1 inline" />;
        if (sortDir === 'desc') return <ChevronDown  className="w-3 h-3 text-ministry-orange ml-1 inline" />;
        return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-1 inline" />;
    };

    if (loading) return <LoadingSpinner fullPage message="Loading data…" />;

    return (
        <div className={`flex flex-col gap-0 ${className}`}>
            {/* Table (scroll on mobile) */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={String(col.key)}
                                    className={[
                                        'px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide',
                                        alignClass(col.align),
                                        col.width ?? '',
                                        col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : '',
                                        col.hideOnMobile ? 'hidden md:table-cell' : '',
                                    ].join(' ')}
                                    onClick={() => col.sortable && handleSort(String(col.key))}
                                >
                                    {col.header}
                                    <SortIcon col={col} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {visible.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length}>
                                    <EmptyState variant={emptyVariant} message={emptyMessage} />
                                </td>
                            </tr>
                        ) : (
                            visible.map(item => (
                                <tr
                                    key={keyExtractor(item)}
                                    onClick={() => onRowClick?.(item)}
                                    className={[
                                        'bg-white hover:bg-gray-50/70 transition-colors',
                                        onRowClick ? 'cursor-pointer' : '',
                                    ].join(' ')}
                                >
                                    {columns.map(col => (
                                        <td
                                            key={String(col.key)}
                                            className={[
                                                'px-4 py-3 text-gray-700',
                                                alignClass(col.align),
                                                col.hideOnMobile ? 'hidden md:table-cell' : '',
                                            ].join(' ')}
                                        >
                                            {col.render
                                                ? col.render(item)
                                                : String((item as any)[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-3 text-sm text-gray-500">
                    <span>
                        {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-medium text-gray-700">
                            {safePage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;
