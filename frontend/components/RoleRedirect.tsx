import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface RoleRedirectProps {
    user: User;
}

const RoleRedirect: React.FC<RoleRedirectProps> = ({ user }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        if (user.role === 'Super Admin' || user.role === 'Administrator') {
            navigate('/dashboard');
            return;
        }

        // Role-specific overrides
        if (user.role === 'Logistics') {
            navigate('/registration');
            return;
        }
        if (user.role === 'Coordinator' || user.role === 'Vehicle Coordinator') {
            navigate('/transportation');
            return;
        }
        if (user.role === 'Stage Coordinator') {
            navigate('/stage-dashboard');
            return;
        }

        // Map Department ID to Dashboard View
        switch (user.departmentId) {
            case 'd1': navigate('/registration'); break;
            case 'd2': navigate('/next-gen'); break;
            case 'd3': navigate('/parking'); break;
            case 'd4': navigate('/finance'); break;
            case 'd5': navigate('/transportation'); break;
            case 'd6': navigate('/follow-up'); break;
            case 'd7': navigate('/schools'); break;
            default: navigate('/team-dashboard'); break;
        }
    }, [user, navigate]);

    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
};

export default RoleRedirect;
