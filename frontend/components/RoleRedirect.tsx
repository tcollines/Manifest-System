import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface RoleRedirectProps {
    user: User;
}

const RoleRedirect: React.FC<RoleRedirectProps> = ({ user }) => {
    const navigate = useNavigate();
    const [departments, setDepartments] = React.useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        // Load Departments for 'Head of Dept'
        if (user.role === 'Head of Dept') {
            // We can lazy load or assumes loaded.
            // Best to use a hook or store.
            // For now, let's fetch.
            import('../services/api').then(({ apiFetch }) => {
                apiFetch('/departments').then(data => {
                    const myDept = data.find((d: any) => d.id === user.departmentUid || d.code === user.departmentId);
                    if (myDept && myDept.dashboardRoute) {
                        navigate(myDept.dashboardRoute);
                    } else {
                        // Fallback if no route defined
                        navigate('/dashboard');
                    }
                }).catch(() => navigate('/dashboard'));
            });
            return;
        }

        if (user.role === 'Super Admin' || user.role === 'Administrator') {
            navigate('/dashboard');
            return;
        }

        // Role-specific overrides from original logic
        if (user.role === 'Logistics') {
            navigate('/registration');
            return;
        }
        if (user.role === 'Stage Coordinator' || user.role === 'Coordinator' || user.role === 'Vehicle Coordinator') {
            if (user.stationId) navigate('/stage-dashboard');
            else navigate('/transportation');
            return;
        }

        // Default fallback if no specific role or department rule applies
        navigate('/dashboard');

    }, [user, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ministry-orange"></div>
        </div>
    );
};

export default RoleRedirect;
