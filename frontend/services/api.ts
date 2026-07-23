import { supabase } from './supabaseClient';
import { UserStore } from '../database/userStore';

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
            const localUser = UserStore.getSession();
            token = (localUser as any)?.token || (localUser as any)?.access_token || localStorage.getItem('google_sso_token') || undefined;
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

    if (!res.ok) {
        // Automatic Token Refresh / Retry Logic
        if (res.status === 401 && !options._retry) {
            const isGoogleAuth = !!localStorage.getItem('google_sso_token');
            if (isGoogleAuth) {
                 console.warn("[API FETCH 401] Google SSO token expired. Dispatching clean logout.");

                 // [FIX 3] Collect keys first, THEN delete — safe iteration (no mutation during loop)
                 const keysToRemove: string[] = [];
                 for (let i = 0; i < localStorage.length; i++) {
                     const key = localStorage.key(i);
                     if (key && (key.startsWith('sb-') || key.includes('ministry_user_session') || key === 'google_sso_token')) {
                         keysToRemove.push(key);
                     }
                 }
                 keysToRemove.forEach(k => localStorage.removeItem(k));

                 // Dispatch unauthorized explicitly in addition to force-logout
                 window.dispatchEvent(new CustomEvent('api:unauthorized'));
                 window.dispatchEvent(new CustomEvent('auth:force-logout'));

                 // Throw so callers get an error instead of a promise that never resolves
                 throw new Error('SESSION_EXPIRED');
            }

            console.warn(`[API FETCH 401] Token rejected. Attempting background refresh for ${endpoint}...`);
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error || !data.session) {
                console.warn(`[API FETCH 401] Refresh failed or missing session. Waiting 800ms for cache recovery...`);
                // Extra fallback for hard-refreshes where Supabase hasn't populated LocalStorage yet
                await new Promise(r => setTimeout(r, 800));
            }

            // Try exactly once more, without passing the old broken token so it pulls the fresh one from getSession()
            const retryOptions = { ...options, token: undefined, _retry: true };
            return apiFetch(endpoint, retryOptions);
        }

        const text = await res.text();
        let errorBody;
        try {
            errorBody = JSON.parse(text);
        } catch {
            // Response was not JSON
        }
        if (res.status !== 401 && res.status !== 403) {
            console.error(`[API FETCH ERROR] ${res.status} to ${endpoint}:`, text);
        }
        
        const errorMessage = errorBody?.details || errorBody?.error || `API Error (${res.status}): ${text || res.statusText}`;
        
        if (!options._silent && res.status >= 500) {
            window.dispatchEvent(new CustomEvent('api:error', { detail: errorMessage }));
        }

        throw new Error(errorMessage);
    }

    try {
        const json = await res.json();
        
        // STANDARD RESPONSE WRAPPER HANDLING
        if (json && typeof json === 'object' && 'success' in json && 'error' in json) {
            if (!json.success) {
                if (!options._silent) {
                    window.dispatchEvent(new CustomEvent('api:error', { detail: json.error }));
                }
                throw new Error(json.error || 'Unknown API error');
            }
            return json.data;
        }

        return json;
    } catch (error: any) {
        if (error.name === 'SyntaxError') {
            // It might just be an empty 204 No Content response
            if (res.status === 204) return null;
        }
        throw error;
    }
};

export const apiFetchPublic = async (endpoint: string, options: RequestInit & { _silent?: boolean } = {}) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let res: Response;
    try {
        const fetchOptions: RequestInit = {
            ...options,
            headers,
            signal: controller.signal
        };

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

    if (!res.ok) {
        const text = await res.text();
        let errorBody;
        try { errorBody = JSON.parse(text); } catch {}
        
        const errorMessage = errorBody?.details || errorBody?.error || `API Error (${res.status}): ${text || res.statusText}`;
        
        if (!options._silent && res.status >= 500) {
            window.dispatchEvent(new CustomEvent('api:error', { detail: errorMessage }));
        }

        throw new Error(errorMessage);
    }

    try {
        const json = await res.json();
        
        // STANDARD RESPONSE WRAPPER HANDLING
        if (json && typeof json === 'object' && 'success' in json && 'error' in json) {
            if (!json.success) {
                if (!options._silent) {
                    window.dispatchEvent(new CustomEvent('api:error', { detail: json.error }));
                }
                throw new Error(json.error || 'Unknown API error');
            }
            return json.data;
        }

        return json;
    } catch (error: any) {
        if (error.name === 'SyntaxError') {
            if (res.status === 204) return null;
        }
        throw error;
    }
};
