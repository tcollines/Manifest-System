import { supabase } from './supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || 'https://manifest-system-esft.onrender.com/api';

export const apiFetch = async (endpoint: string, options: RequestInit & { token?: string } = {}) => {
    // Dynamically retrieve the latest session token if not explicitly provided
    let token = options.token;
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
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
            throw new Error(errorBody?.error || `API Error (${res.status}): ${text || res.statusText}`);
        }
        const json = await res.json();
        console.log(`[API FETCH SUCCESS] payload size: ${JSON.stringify(json).length}`);
        return json;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Request timed out');
        throw error;
    }
};
