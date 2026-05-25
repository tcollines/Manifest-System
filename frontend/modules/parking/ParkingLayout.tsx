/** ParkingLayout — pure route shell. The inner dashboard renders its own header and tabs. */
import React from 'react';
import { Outlet } from 'react-router-dom';

const ParkingLayout: React.FC = () => (
    <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
);

export default ParkingLayout;
