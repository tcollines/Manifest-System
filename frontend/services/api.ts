import { supabase } from './supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || 'https://manifest-system-esft.onrender.com/api';

export const apiFetch = async (endpoint: string, options: RequestInit & { token?: string, _retry?: boolean } = {}) => {
    // Dynamically retrieve the latest session token if not explicitly provided
    let token = options.token;
    if (!token) {
        token = localStorage.getItem('google_sso_token') || undefined;
        if (!token) {
            const { data: { session } } = await supabase.auth.getSession();
            token = session?.access_token;
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

        const res = await fetch(`${API_URL}${endpoint}`, fetchOptions);

        clearTimeout(timeoutId);

        if (!res.ok) {
            // Automatic Token Refresh / Retry Logic
            if (res.status === 401 && !options._retry) {
                const isGoogleAuth = !!localStorage.getItem('google_sso_token');
                if (isGoogleAuth) {
                     console.warn("[API FETCH 401] Google SSO token expired. Redirecting cleanly.");
                     
                     // CLEAN LOGOUT on 401: Clear local state to prevent broken UI
                     for (let i = 0; i < localStorage.length; i++) {
                         const key = localStorage.key(i);
                         if (key && (key.startsWith('sb-') || key.includes('ministry_user_session') || key === 'google_sso_token')) {
                             localStorage.removeItem(key);
                         }
                     }
                     // Use setTimeout to ensure the microtask queue is clear, then redirect
                     setTimeout(() => {
                         window.location.href = '/';
                     }, 10);
                     
                     // Return an infinitely pending promise so no "Promise Error" is ever thrown to the UI!
                     return new Promise(() => {});
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
            throw new Error(errorBody?.details || errorBody?.error || `API Error (${res.status}): ${text || res.statusText}`);
        }
        const json = await res.json();
        // console.log(`[API FETCH SUCCESS] payload size: ${JSON.stringify(json).length}`);
        return json;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Request timed out');
        throw error;
    }
};
