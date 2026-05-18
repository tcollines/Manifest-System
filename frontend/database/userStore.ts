
import { User, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { MOCK_USERS } from '../constants';
import { safeFetch } from '../services/safeFetch';

const SESSION_KEY = 'ministry_user_session';

// Helper to map DB snake_case to App camelCase
export const mapUserFromDB = (u: any): User => ({
  id: String(u.id),
  name: String(u.name || ''),
  role: String(u.role || 'Member') as any, // FORCE strictly derived scalar role
  manifestId: u.manifest_id,
  departmentId: u.department_id,
  departmentUid: u.department_uid,
  username: u.username,
  password: u.password,
  contact: u.contact,
  email: u.email,
  stationId: u.station_id,
  eventId: u.event_id,
  invitationToken: u.invitation_token,
  status: u.status,
  createdBy: u.created_by
});

// Helper to map App camelCase to DB snake_case
const mapUserToDB = (u: User) => {
  const data = {
    id: u.id,
    name: u.name,
    role: u.role,
    department_id: u.departmentId, // Map from App camelCase
    department_uid: u.departmentUid,
    username: u.username,
    password: u.password,
    contact: u.contact,
    email: u.email,
    station_id: u.stationId,
    event_id: u.eventId,
    invitation_token: u.invitationToken,
    status: u.status,
    // created_by: u.createdBy // Disabled to prevent SQL error if migration not successful
  };
  // Remove undefined keys
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
};

import { supabase } from '../services/supabaseClient';

export const UserStore = {
  // Login now uses Supabase Auth natively while handling legacy username formats
  login: async (username: string, password: string): Promise<ServiceResponse<User | null>> => {
    try {
      console.log(`[USERSTORE LOGIN START] Attempting login for: ${username}`);

      // Force clear broken local storage states
      // [FIX 6] Collect keys first, THEN delete — prevents mutation-during-iteration (undefined behavior)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      const input = username.trim();

      // Secure Backend Login Proxy
      let authResult;
      try {
        const apiUrl = (import.meta as any).env.VITE_API_URL || 'https://manifest-system-lofy.onrender.com/api';
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: input, password })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          authResult = { error: { message: errData.error || 'Login failed' } };
        } else {
          const { session } = await response.json();
          // Store session into the local Supabase client instance so realtime & api fetch works
          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });

          if (setSessionError) {
            authResult = { error: setSessionError };
          } else {
            authResult = { data: { session } };
          }
        }
      } catch (err: any) {
        authResult = { error: err };
      }

      if (authResult?.error) {
        console.error(`[USERSTORE] Auth attempts failed:`, authResult.error.message || authResult.error);
        
        // Differentiate between actual auth failure and network failure
        // First, check for common browser network error strings
        const errorMsg = authResult.error.message || String(authResult.error);
        let isOffline = !navigator.onLine || 
                        errorMsg.toLowerCase().includes('failed to fetch') || 
                        errorMsg.toLowerCase().includes('networkerror') ||
                        errorMsg.toLowerCase().includes('load failed');
        
        // If not obvious, perform an active ping to definitively rule out false-positive "online" OS states
        if (!isOffline) {
            try {
                await fetch('https://www.google.com/favicon.ico?_t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
            } catch (pingError) {
                isOffline = true;
            }
        }
        
        if (isOffline) {
            return { status: 'error', message: 'No internet connection', error: authResult.error };
        }
        
        return { status: 'error', message: 'Invalid credentials or Auth failure', error: authResult.error };
      }

      console.log(`[USERSTORE] Auth Success. JWT acquired. Fetching core profile via /users/profile endpoints...`);
      // Fetch full user profile from database now that we have a JWT
      // We must use the API getProfile, because it securely handles Legacy ID vs Auth ID duplication 
      // by falling back to the email with the most complete profile data.
      let profileData = null;
      try {
        profileData = await apiFetch('/users/profile', { token: authResult.data.session.access_token });
      } catch (e: any) {
        console.error(`[USERSTORE] API Profile Fetch Failed:`, e);
        return { status: 'error', message: e.message || 'Server connection failed while fetching profile.' };
      }

      if (!profileData) {
        console.error(`[USERSTORE] User profile not found in database via API fallback`);
        return { status: 'error', message: 'User profile not found in database' };
      }

      console.log(`[USERSTORE] Core Profile Fetched. Login Complete.`);
      return { status: 'success', data: mapUserFromDB(profileData) };

    } catch (error: any) {
      console.error(`[USERSTORE LOGIN CATCH]`, error);
      return { status: 'error', message: 'Login Exception', error: error.message };
    }
  },

  get: async (id: string): Promise<ServiceResponse<User | null>> => {
    return safeFetch(
      () => apiFetch(`/users/${id}`),
      'Failed to fetch user',
      (data: any) => data ? mapUserFromDB(data) : null
    );
  },

  getByEmail: async (email: string, token?: string): Promise<User | null> => {
    try {
      const response = await apiFetch('/users/profile', { token });
      if (response && response.id) {
        return mapUserFromDB(response);
      }
      return null;
    } catch (e: any) {
      console.error("[UserStore] getByEmail/profile failed:", e);
      // Re-throw so handleGoogleLogin can catch the specific error (401, 500, etc.)
      throw e;
    }
  },

  getUserByToken: async (token: string): Promise<User | null> => {
    try {
      const result = await UserStore.getAll();
      if (result.status === 'success') {
        return result.data.find(u => u.invitationToken === token) || null;
      }
      return null;
    } catch (e) { return null; }
  },

  getAll: async (params?: { role?: string; eventId?: string; departmentId?: string; stationId?: string }): Promise<ServiceResponse<User[]>> => {
    return safeFetch(
      () => {
        let url = '/users';
        if (params) {
          const queryParams = new URLSearchParams();
          if (params.role) queryParams.append('role', params.role);
          if (params.eventId) queryParams.append('eventId', params.eventId);
          if (params.departmentId) queryParams.append('departmentId', params.departmentId);
          if (params.stationId) queryParams.append('stationId', params.stationId);
          const queryString = queryParams.toString();
          if (queryString) url += `?${queryString}`;
        }
        return apiFetch(url);
      },
      'Failed to fetch users',
      (data: any[]) => data ? data.map(mapUserFromDB) : []
    );
  },

  add: async (user: User): Promise<ServiceResponse<User[]>> => {
    return safeFetch(
      async () => {
        await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(mapUserToDB(user))
        });
        // Verify by fetching all? Or just return success?
        // Existing logic returned getAll().
        // We will call getAll() but we need to return the ServiceResponse from it.
        // BUT safeFetch expects a fetcher that returns data.
        // If getAll returns ServiceResponse, safeFetch will wrap a ServiceResponse? No.
        // Let's just return UserStore.getAll().
        const result = await UserStore.getAll();
        if (result.status === 'error') throw result.error || new Error(result.message);
        return result.data;
      },
      'Failed to add user',
    );
  },

  remove: async (id: string): Promise<ServiceResponse<User[]>> => {
    return safeFetch(
      async () => {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        const result = await UserStore.getAll();
        if (result.status === 'error') throw result.error || new Error(result.message);
        return result.data;
      },
      'Failed to remove user'
    );
  },

  update: async (user: User): Promise<ServiceResponse<User[]>> => {
    return safeFetch(
      async () => {
        await apiFetch(`/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(mapUserToDB(user))
        });
        const result = await UserStore.getAll();
        if (result.status === 'error') throw result.error || new Error(result.message);
        return result.data;
      },
      'Failed to update user'
    );
  },

  // Session Persistence
  saveSession: (user: User) => {
    console.log("[USERSTORE] Persisting Session to localStorage. Role:", user.role);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  getSession: (): User | null => {
    const json = localStorage.getItem(SESSION_KEY);
    if (json) {
      try {
        const parsed = JSON.parse(json);
        console.log("[USERSTORE] Hydrating Session from localStorage. Role:", parsed.role);
        return parsed;
      } catch (e) {
        console.error("Failed to parse session", e);
        return null;
      }
    }
    return null;
  },

  clearSession: () => {
    console.log("[USERSTORE] Purging all LocalStorage User Data.");
    localStorage.removeItem(SESSION_KEY);
  }
};
