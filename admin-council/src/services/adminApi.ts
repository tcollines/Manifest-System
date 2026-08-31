/**
 * Admin Council API Client
 * 
 * All requests target /api/admin-council endpoints.
 * Uses the same base URL as the main app.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://manifest-system-lofy.onrender.com/api';
const ADMIN_BASE = `${API_URL}/admin-council`;

interface FetchOptions extends RequestInit {
    token?: string;
}

async function adminFetch(endpoint: string, options: FetchOptions = {}) {
    const token = options.token || sessionStorage.getItem('ac_token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(`${ADMIN_BASE}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${res.status} ${res.statusText}`);
        }

        if (res.status === 204) return null;
        return res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Request timed out');
        throw error;
    }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginAdmin(email: string, password: string) {
    return adminFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getOverview() {
    return adminFetch('/overview');
}

// ─── Manifests ────────────────────────────────────────────────────────────────

export async function getAllManifests() {
    return adminFetch('/manifests');
}

export async function getManifestById(id: string) {
    return adminFetch(`/manifests/${id}`);
}

export async function createManifest(data: {
    name: string;
    region?: string;
    contact?: string;
    address?: string;
    description?: string;
    currency?: string;
    teamLeaderName?: string;
    teamLeaderEmail?: string;
    teamLeaderContact?: string;
}) {
    return adminFetch('/manifests', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateManifest(id: string, data: Record<string, any>) {
    return adminFetch(`/manifests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function getManifestUsers(id: string) {
    return adminFetch(`/manifests/${id}/users`);
}
