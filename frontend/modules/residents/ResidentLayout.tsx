import React from 'react';
import { Outlet } from 'react-router-dom';
import { MinistryEvent } from '../../types';
import { ResidentProvider } from './ResidentContext';

interface ResidentLayoutProps {
  events: MinistryEvent[];
}

export const ResidentLayout: React.FC<ResidentLayoutProps> = ({ events }) => (
    <div className="flex flex-col h-full bg-gray-50">
        <ResidentProvider initialEvents={events}>
            <div className="flex-1">
                <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
            </div>
        </ResidentProvider>
    </div>
);

export default ResidentLayout;
