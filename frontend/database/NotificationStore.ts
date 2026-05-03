import { supabase } from '../services/supabaseClient';
import { apiFetch } from '../services/api';
import { create } from 'zustand';

export interface Notification {
  id: string;
  manifest_id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  url?: string;
  entity_id?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribe: (userId: string) => void;
  unsubscribe: () => void;
}

let subscription: any = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch('/notifications');
      set({ 
        notifications: data || [],
        unreadCount: (data || []).filter((n: Notification) => !n.read).length,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      set((state) => {
        const updated = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.read).length
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiFetch(`/notifications/read-all`, { method: 'PUT' });
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  },

  subscribe: (userId: string) => {
    if (subscription) return; // Already subscribed

    subscription = supabase
      .channel('notifications_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        set((state) => {
          // Prevent duplicates
          if (state.notifications.some(n => n.id === newNotification.id)) return state;
          
          return {
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1
          };
        });
      })
      .subscribe();
  },

  unsubscribe: () => {
    if (subscription) {
      supabase.removeChannel(subscription);
      subscription = null;
    }
  }
}));
