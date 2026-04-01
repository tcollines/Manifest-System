import React from 'react';
import { Outlet } from 'react-router-dom';
import { User } from '../../types';

interface TransportationLayoutProps {
  currentUser?: User;
}

export const TransportationLayout: React.FC<TransportationLayoutProps> = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="flex-1 overflow-y-auto">
            <Outlet />
        </div>
    </div>
);

export default TransportationLayout;
