export const API_URL = import.meta.env.VITE_API_URL || 'https://manifest-system-esft.onrender.com/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        let errorBody;
        try {
            errorBody = JSON.parse(text);
        } catch {
            // Response was not JSON
        }
        throw new Error(errorBody?.error || `API Error (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
};
