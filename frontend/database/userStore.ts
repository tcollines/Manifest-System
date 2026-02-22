
import { User, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { MOCK_USERS } from '../constants';
import { safeFetch } from '../services/safeFetch';

const SESSION_KEY = 'ministry_user_session';

// Helper to map DB snake_case to App camelCase
const mapUserFromDB = (u: any): User => ({
  id: u.id,
  name: u.name,
  role: u.role,
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
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }

      const input = username.trim();
      const isEmailInput = input.includes('@');

      // Helper to wrap signIn calls natively to prevent silent client timeout bugs
      const attemptSignInAction = (signInEmail: string, pass: string): Promise<any> => {
        return new Promise(async (resolve, reject) => {
          let timeoutId = setTimeout(() => {
            reject(new Error('Supabase Auth request timed out. Check network or CORS.'));
          }, 10000);

          try {
            const res = await supabase.auth.signInWithPassword({ email: signInEmail, password: pass });
            clearTimeout(timeoutId);
            resolve(res);
          } catch (err) {
            clearTimeout(timeoutId);
            reject(err);
          }
        });
      };

      let authResult;

      // 1. Try treating input literally as an email if it looks like one
      if (isEmailInput) {
        console.log(`[USERSTORE] Attempt 1 (Direct Email): ${input}`);
        try {
          authResult = await attemptSignInAction(input, password);
        } catch (err: any) {
          authResult = { error: err };
        }
      }

      // 2. If it wasn't an email, or the email login failed, fall back to Username resolving
      if (!isEmailInput || (authResult?.error && authResult.error.message?.includes('Invalid login credentials'))) {

        const cleanUsername = input.replace(/ /g, '').replace(/@/g, '_').toLowerCase();
        let fallbackEmail = `${cleanUsername}@manifest.local`;

        console.log(`[USERSTORE] Attempting fallback mapped username email: ${fallbackEmail}`);

        try {
          authResult = await attemptSignInAction(fallbackEmail, password);
        } catch (err: any) {
          authResult = { error: err };
        }

        // 3. Fallback to Legacy UUID mapping via Secure RPC if initial mapped email fails
        if (authResult?.error && (authResult.error.message?.includes('Invalid login credentials') || authResult.error.message?.includes('timed out'))) {
          console.log(`[USERSTORE] Fallback 1 Failed. Fetching DB user ID via legacy RPC...`);

          const { data: dbUserId, error: rpcError } = await supabase.rpc('get_user_uuid_for_login', {
            p_username: input
          });

          if (!rpcError && dbUserId) {
            console.log(`[USERSTORE] Fallback ID acquired. Attempting Short UUID logic.`)
            const shortId = dbUserId.substring(0, 8);
            fallbackEmail = `${cleanUsername}_${shortId}@manifest.local`;

            try {
              authResult = await attemptSignInAction(fallbackEmail, password);
            } catch (err: any) {
              authResult = { error: err };
            }

            // 4. Fallback to Full UUID
            if (authResult?.error) {
              console.log(`[USERSTORE] Short UUID failed. Attempting Full UUID logic.`)
              const fullId = dbUserId.replace(/-/g, "");
              fallbackEmail = `${cleanUsername}_${fullId}@manifest.local`;

              try {
                authResult = await attemptSignInAction(fallbackEmail, password);
              } catch (err: any) {
                authResult = { error: err };
              }
            }
          } else {
            console.log(`[USERSTORE] Could not resolve RPC fallback ID for username.`, rpcError);
          }
        }
      }

      if (authResult?.error) {
        console.error(`[USERSTORE] All auth attempts failed:`, authResult.error.message);
        return { status: 'error', message: 'Invalid credentials or Auth failure', error: authResult.error };
      }

      console.log(`[USERSTORE] Auth Success. JWT acquired. Fetching core profile via RLS...`);
      // Fetch full user profile from database now that we have a JWT
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authResult.data.user.id)
        .single();

      if (dbError || !userData) {
        console.error(`[USERSTORE] RLS Core Profile Fetch Failed:`, dbError);
        return { status: 'error', message: 'User profile not found in database', error: dbError };
      }

      console.log(`[USERSTORE] Core Profile Fetched. Login Complete.`);
      return { status: 'success', data: mapUserFromDB(userData) };

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

  getAll: async (params?: { role?: string; eventId?: string; departmentId?: string }): Promise<ServiceResponse<User[]>> => {
    return safeFetch(
      () => {
        let url = '/users';
        if (params) {
          const queryParams = new URLSearchParams();
          if (params.role) queryParams.append('role', params.role);
          if (params.eventId) queryParams.append('eventId', params.eventId);
          if (params.departmentId) queryParams.append('departmentId', params.departmentId);
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  getSession: (): User | null => {
    const json = localStorage.getItem(SESSION_KEY);
    if (json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        console.error("Failed to parse session", e);
        return null;
      }
    }
    return null;
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
  }
};
