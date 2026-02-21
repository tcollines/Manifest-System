import { supabase } from './supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || 'https://manifest-system-esft.onrender.com/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    // Dynamically retrieve the latest session token
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

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
};
