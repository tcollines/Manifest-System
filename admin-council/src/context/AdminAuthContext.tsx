import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginAdmin } from '../services/adminApi';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        try {
            const savedUser = sessionStorage.getItem('ac_user');
            const savedToken = sessionStorage.getItem('ac_token');
            if (savedUser && savedToken) {
                setUser(JSON.parse(savedUser));
            }
        } catch (e) {
            console.warn('[AdminAuth] Failed to restore session:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const response = await loginAdmin(email, password);

            if (response?.session?.access_token && response?.user) {
                sessionStorage.setItem('ac_token', response.session.access_token);
                sessionStorage.setItem('ac_user', JSON.stringify(response.user));
                setUser(response.user);
                return { success: true };
            }

            return { success: false, error: 'Invalid response from server' };
        } catch (error: any) {
            return { success: false, error: error.message || 'Login failed' };
        }
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem('ac_token');
        sessionStorage.removeItem('ac_user');
        setUser(null);
    }, []);

    return (
        <AdminAuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout,
        }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = (): AdminAuthContextType => {
    const ctx = useContext(AdminAuthContext);
    if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
    return ctx;
};
