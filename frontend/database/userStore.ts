
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
  departmentId: u.department_id,
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
    department_id: u.departmentId,
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

export const UserStore = {
  // Login now calls the API
  login: async (username: string, password: string): Promise<ServiceResponse<User | null>> => {
    return safeFetch(
      () => apiFetch('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }),
      'Login failed',
      (data: any) => data ? mapUserFromDB(data) : null
    );
  },

  getByEmail: async (email: string): Promise<User | null> => {
    try {
      const result = await UserStore.getAll();
      if (result.status === 'success') {
        return result.data.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
      }
      return null;
    } catch (e) { return null; }
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

  getAll: async (): Promise<ServiceResponse<User[]>> => {
    return safeFetch(
      () => apiFetch('/users'),
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
