import { Department, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

// ── In-memory cache ───────────────────────────────────────────────────────────
// Departments are stable data (rarely change during a session).
// Cache them here to avoid a network round-trip every time GenericDeptDashboard mounts.
const deptCache = new Map<string, Department>();
let allDeptsCached = false; // true once getAll() has populated the cache

const mapDept = (d: any): Department => ({
    id:             d.id ?? d.uuid ?? '',
    uuid:           d.id ?? d.uuid ?? '',
    code:           d.code ?? d.slug ?? '',
    slug:           d.slug ?? '',
    name:           d.name,
    head:           d.head_id,
    headId:         d.head_id,
    headName:       d.head_name,
    status:         d.status ?? 'Active',
    description:    d.description,
    icon:           d.icon ?? 'Users',
    isCustom:       d.is_custom ?? false,
    createdBy:      d.created_by,
    createdAt:      d.created_at,
    members:        d.members,
    dashboardRoute: d.is_custom ? `/departments/${d.id}/dashboard` : undefined,
});

export const DepartmentStore = {
    /** Fetch and cache all departments. Subsequent calls return the cache. */
    getAll: async (): Promise<ServiceResponse<Department[]>> => {
        if (allDeptsCached) {
            const cached = Array.from(deptCache.values());
            return { status: 'success', data: cached };
        }

        const result = await safeFetch(
            () => apiFetch('/departments'),
            'Failed to fetch departments',
            (data) => (Array.isArray(data) ? data : []).map(mapDept),
        );

        if (result.status === 'success') {
            result.data.forEach(d => deptCache.set(d.id, d));
            allDeptsCached = true;
        }

        return result;
    },

    /**
     * Fetch a single department by id.
     * Checks the in-memory cache first; only makes a network call on a cache miss.
     */
    getById: async (id: string): Promise<ServiceResponse<Department>> => {
        const cached = deptCache.get(id);
        if (cached) {
            return { status: 'success', data: cached };
        }

        const result = await safeFetch(
            () => apiFetch(`/departments/${id}`),
            'Failed to fetch department',
            mapDept,
        );

        if (result.status === 'success') {
            deptCache.set(id, result.data);
        }

        return result;
    },

    create: async (payload: {
        name: string;
        description?: string;
        icon?: string;
        headId?: string;
    }): Promise<ServiceResponse<Department>> => {
        const result = await safeFetch(
            () => apiFetch('/departments', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
            'Failed to create department',
            mapDept,
        );

        // Warm the cache with the newly created department
        if (result.status === 'success') {
            deptCache.set(result.data.id, result.data);
        }

        return result;
    },

    /** Invalidate the full cache (call after department mutations that affect all). */
    invalidateCache: () => {
        deptCache.clear();
        allDeptsCached = false;
    },
};
