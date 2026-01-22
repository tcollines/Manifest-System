
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
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
  // Remove undefined keys to avoid sending them to Supabase (which might cause errors if cols are missing)
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
};

export const UserStore = {
  // Login now queries the DB
  login: async (username: string, password: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // Note: Plaintext check for migration compatibility. Recommended: Hash comparison.
        .single();

      if (data && !error) {
        return mapUserFromDB(data);
      }
    } catch (e) {
      console.warn('Supabase login failed or not configured, checking mock users...');
    }

    // Fallback: Check mock users if DB fails or returns no match
    const mockUser = MOCK_USERS.find(u => u.username === username && u.password === password);
    if (mockUser) {
      return mockUser;
    }

    console.error('Login failed: Invalid credentials or database unavailable.');
    return null;
  },

  getByEmail: async (email: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('users').select('*').ilike('email', email).single();
      if (data && !error) return mapUserFromDB(data);
    } catch (e) { console.warn("Fetch by email failed", e); }
    return null;
  },

  getUserByToken: async (token: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('invitation_token', token).single();
      if (data && !error) return mapUserFromDB(data);
    } catch (e) { console.warn("Fetch by token failed", e); }
    return null;
  },

  getAll: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.warn('Error fetching users from Supabase:', error.message);
        return MOCK_USERS; // Fallback to mock data
      }
      return data.map(mapUserFromDB);
    } catch (e) {
      console.warn('Supabase connection failed, using mock users.');
      return MOCK_USERS; // Fallback to mock data
    }
  },

  add: async (user: User): Promise<User[]> => {
    try {
      const { error } = await supabase.from('users').insert([mapUserToDB(user)]);
      if (error) throw new Error('Error adding user: ' + error.message);
      return UserStore.getAll();
    } catch (e: any) {
      console.error("UserStore Add Error:", e);
      throw e; // Re-throw to let the UI know it failed
    }
  },

  remove: async (id: string): Promise<User[]> => {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) console.error('Error removing user:', error);
    } catch (e) {
      console.error(e);
    }
    return UserStore.getAll();
  },

  update: async (user: User): Promise<User[]> => {
    try {
      const { error } = await supabase.from('users').update(mapUserToDB(user)).eq('id', user.id);
      if (error) console.error('Error updating user:', error);
    } catch (e) {
      console.error(e);
    }
    return UserStore.getAll();
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
