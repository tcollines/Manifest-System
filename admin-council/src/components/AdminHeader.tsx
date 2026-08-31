import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminHeaderProps {
    title: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title }) => {
    const { user } = useAdminAuth();

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-30">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-medium">{user?.role || 'Admin Counsel'}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0) || 'A'}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
