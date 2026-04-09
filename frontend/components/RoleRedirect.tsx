import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDashboardForUser } from '../utils';
import { User } from '../types';
import { apiFetch } from '../services/api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fast-path for custom dept HODs: departmentId is already a UUID → no API call needed
const HeadOfDeptRedirect: React.FC<{ user: User }> = ({ user }) => {
  if (user.departmentId && UUID_RE.test(user.departmentId)) {
    return <Navigate to={`/departments/${user.departmentId}/dashboard`} replace />;
  }
  // Slow-path: legacy code-based HOD (e.g. 'd4', 'finance') needs API to resolve route
  return <HeadOfDeptAsyncRedirect user={user} />;
};

const HeadOfDeptAsyncRedirect: React.FC<{ user: User }> = ({ user }) => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/departments')
      .then(data => {
        const myDept = data.find((d: any) =>
          d.id === user.departmentId ||
          d.id === user.departmentUid ||
          d.code === user.departmentId
        );
        if (myDept?.dashboardRoute) {
          setTarget(myDept.dashboardRoute);
        } else if (myDept?.id) {
          setTarget(`/departments/${myDept.id}/dashboard`);
        } else {
          setTarget(getDashboardForUser(user));
        }
      })
      .catch(() => setTarget(getDashboardForUser(user)));
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

// Main component — synchronous for all roles except Head of Dept
const RoleRedirect: React.FC<{ user: User }> = ({ user }) => {
  if (user.role === 'Head of Dept') {
    return <HeadOfDeptRedirect user={user} />;
  }
  return <Navigate to={getDashboardForUser(user)} replace />;
};

export default RoleRedirect;
