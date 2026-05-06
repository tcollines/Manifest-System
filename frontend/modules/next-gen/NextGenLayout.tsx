import React from 'react';
import { Outlet } from 'react-router-dom';
import { LogIn, LogOut, Database, Heart } from 'lucide-react';
import { User } from '../../types';

interface NextGenLayoutProps {
  currentUser?: User | null;
}

export const NextGenLayout: React.FC<NextGenLayoutProps> = () => (
  <div className="flex flex-col h-full bg-gray-50">
    <div className="flex-1 w-full">
      <Outlet />
    </div>
  </div>
);

export default NextGenLayout;
