import React from 'react';
import { Outlet } from 'react-router-dom';
import { CampusProvider } from './CampusContext';
import { MinistryEvent } from '../../types';

const CampusLayout: React.FC<{ events: MinistryEvent[] }> = ({ events }) => (
    <CampusProvider initialEvents={events}>
        <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
    </CampusProvider>
);

export default CampusLayout;
