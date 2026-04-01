import React from 'react';
import { Outlet } from 'react-router-dom';
import { User } from '../../types';

interface FollowUpLayoutProps {
  currentUser?: User;
}

export const FollowUpLayout: React.FC<FollowUpLayoutProps> = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="flex-1 overflow-y-auto">
            <Outlet />
        </div>
    </div>
);

export default FollowUpLayout;
