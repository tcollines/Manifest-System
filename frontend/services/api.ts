import { supabase } from './supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || 'https://manifest-system-lofy.onrender.com/api';

export const apiFetch = async (endpoint: string, options: RequestInit & { token?: string, _retry?: boolean, _silent?: boolean } = {}) => {
    // Dynamically retrieve the latest session token if not explicitly provided
    let token = options.token;
    if (!token) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            token = session?.access_token;
        } catch (e) {}

        if (!token) {
            try {
                const sessionStr = localStorage.getItem('ministry_user_session');
                if (sessionStr) {
                    const parsed = JSON.parse(sessionStr);
                    token = parsed?.token || parsed?.access_token;
                }
            } catch (e) {}
        }
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout to allow heavy analytics aggregation

    let res: Response;
    try {
        const fetchOptions: RequestInit = {
            ...options,
            headers,
            signal: controller.signal
        };

        // Aggressively prevent caching, especially critical for fetching fresh role profiles
        if (options.method === 'GET' || !options.method) {
            fetchOptions.cache = 'no-store';
        }

        res = await fetch(`${API_URL}${endpoint}`, fetchOptions);
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Request timed out');
        
        // Detect offline/network failures (Failed to fetch)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            window.dispatchEvent(new CustomEvent('api:offline'));
            throw new Error('Network error: Unable to connect to the server');
        }
        throw error;
    }

    clearTimeout(timeoutId);

    // Dynamic session recovery logic for HTTP 401
    if (res.status === 401) {
        console.warn(`[API] Received 401 Unauthorized for ${endpoint}. Attempting session refresh...`);
        
        // Prevent infinite retry loops
        if (options._retry) {
            console.error(`[API] Retry attempt failed for ${endpoint}. Token remains invalid.`);
            throw new Error('Unauthorized: Session expired or invalid');
        }

        try {
            // Attempt to refresh the session via Supabase Auth client
            const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
            
            if (refreshErr || !refreshData?.session?.access_token) {
                console.error('[API] Refresh token expired or failed:', refreshErr?.message);
                
                if (!options._silent) {
                    window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { endpoint } }));
                }
                
                throw new Error(refreshErr?.message || 'Unauthorized: Missing or invalid token format');
            }

            const newToken = refreshData.session.access_token;
            console.log('[API] Session refreshed successfully. Retrying request...');

            // Update Auth header with the fresh token and trigger retry
            return apiFetch(endpoint, {
                ...options,
                token: newToken,
                _retry: true
            });
        } catch (refreshCatchErr: any) {
            console.error('[API] Session recovery failed:', refreshCatchErr.message);
            throw refreshCatchErr;
        }
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${res.status} ${res.statusText}`);
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return null;
    }

    return res.json();
};

export const apiFetchPublic = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
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
        throw error;
    }
};
