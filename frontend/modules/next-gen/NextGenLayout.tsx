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
      <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
    </div>
  </div>
);

export default NextGenLayout;
