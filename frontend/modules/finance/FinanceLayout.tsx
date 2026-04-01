import React from 'react';
import { Outlet } from 'react-router-dom';
import { User } from '../../types';

interface FinanceLayoutProps {
  currentUser?: User;
}

export const FinanceLayout: React.FC<FinanceLayoutProps> = ({ currentUser }) => {
    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default FinanceLayout;
