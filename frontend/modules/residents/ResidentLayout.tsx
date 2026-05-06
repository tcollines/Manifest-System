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
                <Outlet />
            </div>
        </ResidentProvider>
    </div>
);

export default ResidentLayout;
