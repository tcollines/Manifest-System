import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleTabs } from '../../components/ui/ModuleTabs';
import { CheckCircle, Database } from 'lucide-react';

const PARKING_TABS = [
  { id: 'checkin', label: 'Check In', icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'database', label: 'Vehicle Database', icon: <Database className="w-4 h-4" /> },
];

const ParkingLayout: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-ministry-text">Parking & Transport</h1>
            <ModuleTabs
                tabs={PARKING_TABS}
                basePath="/parking"
            />
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

export default ParkingLayout;
