import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDashboardForUser } from '../utils';
import { User } from '../types';
import { apiFetch } from '../services/api';

// [FIX 4] Async handler ONLY for Head of Dept — preserves existing API dependency
// All other roles get an immediate declarative <Navigate />, no useEffect, no spinner.
const HeadOfDeptRedirect: React.FC<{ user: User }> = ({ user }) => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/departments')
      .then(data => {
        const myDept = data.find((d: any) =>
          d.id === user.departmentUid || d.code === user.departmentId
        );
        // Safe fallback: /setup-account instead of /dashboard (avoids ProtectedRoute loop)
        setTarget(myDept?.dashboardRoute || '/setup-account');
      })
      .catch(() => setTarget('/setup-account')); // explicit, not silent /dashboard
  }, [user]);

  if (!target) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ministry-orange" />
      </div>
    );
  }
  return <Navigate to={target} replace />;
};

// [FIX 4] Main component — synchronous + declarative for all roles except Head of Dept
// Replaces imperative useEffect + navigate() pattern that fired on every '/' visit
const RoleRedirect: React.FC<{ user: User }> = ({ user }) => {
  if (user.role === 'Head of Dept') {
    return <HeadOfDeptRedirect user={user} />;
  }
  // Immediate redirect — no mount side-effect, no spinner, no navigate() call
  return <Navigate to={getDashboardForUser(user)} replace />;
};

export default RoleRedirect;
