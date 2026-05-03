import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { getDashboardForUser } from '../utils';
import { resolveDepartment } from '../constants/departmentMap';
import LoadingSpinner from './ui/LoadingSpinner';

interface ProtectedRouteProps {
    /** If provided, user's department must match one of these IDs/slugs/codes. */
    allowedDepartments?: string[];
    /** If provided, user's role must be in this list. */
    allowedRoles?: string[];
    /** Roles that bypass the allowedDepartments check (e.g. Logistics accessing registration). */
    bypassRoles?: string[];
    /** Where to redirect unauthenticated users. Defaults to '/'. */
    redirectPath?: string;
}

/**
 * ProtectedRoute — The SINGLE navigation authority for unauthenticated access.
 *
 * Rules (in order):
 *   1. If auth is still loading (either phase) → show spinner. NEVER redirect yet.
 *   2. If no user after loading → redirect to redirectPath.
 *   3. If user exists → run optional dept/role checks, then render <Outlet />.
 *
 * This component reads directly from AuthContext (useAuth).
 * No currentUser prop drilling. No duplicate navigation logic elsewhere.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    allowedDepartments = [],
    allowedRoles = [],
    bypassRoles = [],
    redirectPath = '/',
}) => {
    const { user, isInitialLoading } = useAuth();

    // ── Phase 1+2 loading: wait for auth to fully settle ─────────────────────
    // isInitialLoading in AuthContext covers BOTH the Supabase session check AND the
    // backend profile fetch. Only after both complete is it safe to decide.
    if (isInitialLoading) {
        return <LoadingSpinner message="Loading…" />;
    }

    // ── Unauthenticated: redirect ─────────────────────────────────────────────
    if (!user) {
        return <Navigate to={redirectPath} replace />;
    }

    // ── Super Admin / Administrator / TeamLeader: full access ─────────────────
    if (['Super Admin', 'Administrator', 'TeamLeader', 'Team Leader'].includes(user.role)) {
        return <Outlet />;
    }

    // ── Bypass roles (e.g. Logistics accessing Registration) ─────────────────
    if (bypassRoles.length > 0 && bypassRoles.includes(user.role)) {
        return <Outlet />;
    }

    // ── Department check ──────────────────────────────────────────────────────
    if (allowedDepartments.length > 0) {
        const userDept = resolveDepartment(user.departmentId);

        const isAllowed =
            (user.departmentId && allowedDepartments.includes(user.departmentId)) ||
            (userDept && (
                allowedDepartments.includes(userDept.slug) ||
                allowedDepartments.includes(userDept.uuid)
            ));

        if (!isAllowed) {
            console.warn(`[ProtectedRoute] Access denied: ${user.username} (dept: ${user.departmentId})`);
            return <Navigate to={getDashboardForUser(user)} replace />;
        }
    }

    // ── Role check ────────────────────────────────────────────────────────────
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.warn(`[ProtectedRoute] Access denied: ${user.username} (role: ${user.role})`);
        return <Navigate to={getDashboardForUser(user)} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
