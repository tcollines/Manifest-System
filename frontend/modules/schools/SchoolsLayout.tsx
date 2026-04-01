import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleTabs } from '../../components/ui/ModuleTabs';
import { FileText, Calendar } from 'lucide-react';

const SCHOOLS_TABS = [
  { id: 'reports', label: 'Outreach Reports', icon: <FileText className="w-4 h-4" /> },
  { id: 'events', label: 'School Events', icon: <Calendar className="w-4 h-4" /> },
];

const SchoolsLayout: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-ministry-text">High Schools Ministry</h1>
            <ModuleTabs
                tabs={SCHOOLS_TABS}
                basePath="/schools"
            />
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

export default SchoolsLayout;
