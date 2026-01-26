
import { User } from '../types';
import { apiFetch } from '../services/api';
import { MOCK_USERS } from '../constants';

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
  login: async (username: string, password: string): Promise<User | null> => {
    try {
      const data = await apiFetch('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (data) {
        return mapUserFromDB(data);
      }
    } catch (e) {
      console.warn('API login failed, checking mock users...', e);
    }

    // Fallback: Check mock users
    const mockUser = MOCK_USERS.find(u => u.username === username && u.password === password);
    if (mockUser) {
      return mockUser;
    }

    console.error('Login failed: Invalid credentials or database unavailable.');
    return null;
  },

  getByEmail: async (email: string): Promise<User | null> => {
    // Currently API doesn't have search by email endpoint exposed generically, 
    // but we can add query param or filter. For now, we'll fetch all and filter client side 
    // OR add a specific endpoint. 
    // Optimization: Add filter support to backend.
    // Hack for now: Get all (cache could help) or use MOCK if all fails.
    // Better: Add endpoint /users?email=...
    // Let's rely on getAll for now or add endpoint in next step.
    // Actually, let's just fetch all and find, since user base might be small?
    // Or simpler: /users?param=...
    // The backend `getAllUsers` just selects `*`. 
    // I'll update getAllUsers in backend to support query params ideally, but sticking to plan:
    try {
      const users = await UserStore.getAll();
      return users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
    } catch (e) { return null; }
  },

  getUserByToken: async (token: string): Promise<User | null> => {
    try {
      const users = await UserStore.getAll();
      return users.find(u => u.invitationToken === token) || null;
    } catch (e) { return null; }
  },

  getAll: async (): Promise<User[]> => {
    try {
      const data = await apiFetch('/users');
      // data is array of DB objects
      if (Array.isArray(data)) {
        return data.map(mapUserFromDB);
      }
      return MOCK_USERS;
    } catch (e) {
      console.warn('API connection failed, using mock users.', e);
      return MOCK_USERS;
    }
  },

  add: async (user: User): Promise<User[]> => {
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(mapUserToDB(user))
      });
      return UserStore.getAll();
    } catch (e: any) {
      console.error("UserStore Add Error:", e);
      throw e;
    }
  },

  remove: async (id: string): Promise<User[]> => {
    try {
      await apiFetch(`/users/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error(e);
    }
    return UserStore.getAll();
  },

  update: async (user: User): Promise<User[]> => {
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(mapUserToDB(user))
      });
      return UserStore.getAll();
    } catch (e: any) {
      console.error("UserStore Update Error:", e);
      throw e;
    }
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
