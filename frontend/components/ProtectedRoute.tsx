import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { getDashboardForUser } from '../utils';
import { DEPARTMENTS } from '../constants';
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
    const { user, isLoading } = useAuth();

    // ── Phase 1+2 loading: wait for auth to fully settle ─────────────────────
    // isLoading in AuthContext covers BOTH the Supabase session check AND the
    // backend profile fetch. Only after both complete is it safe to decide.
    if (isLoading) {
        return <LoadingSpinner message="Loading…" />;
    }

    // ── Unauthenticated: redirect ─────────────────────────────────────────────
    if (!user) {
        return <Navigate to={redirectPath} replace />;
    }

    // ── Super Admin / Administrator / TeamLeader: full access ─────────────────
    if (['Super Admin', 'Administrator', 'TeamLeader'].includes(user.role)) {
        return <Outlet />;
    }

    // ── Bypass roles (e.g. Logistics accessing Registration) ─────────────────
    if (bypassRoles.length > 0 && bypassRoles.includes(user.role)) {
        return <Outlet />;
    }

    // ── Department check ──────────────────────────────────────────────────────
    if (allowedDepartments.length > 0) {
        // Custom dept users (UUID departmentId) have no entry in the DEPARTMENTS constant.
        // Their route (/departments/:id/dashboard) is guarded by a plain ProtectedRoute
        // with no allowedDepartments — so they pass through here automatically.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (user.departmentId && UUID_RE.test(user.departmentId)) {
            return <Outlet />;
        }

        const userDept = DEPARTMENTS.find(d =>
            d.id === user.departmentId ||
            d.uuid === user.departmentId ||
            d.code === user.departmentId
        );

        const isAllowed =
            (user.departmentId && allowedDepartments.includes(user.departmentId)) ||
            (userDept && (
                allowedDepartments.includes(userDept.code) ||
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
