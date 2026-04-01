import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleTabs } from '../../components/ui/ModuleTabs';
import { Users, HeartHandshake, GraduationCap, Building2, FileText, Calendar, DollarSign } from 'lucide-react';

const CAMPUS_TABS = [
  { id: 'families', label: 'Families', icon: <Users className="w-4 h-4" /> },
  { id: 'evangelism', label: 'Evangelism', icon: <HeartHandshake className="w-4 h-4" /> },
  { id: 'vacists', label: 'Vacists', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'alumni', label: 'Alumni', icon: <Building2 size={18} /> },
  { id: 'events', label: 'Events', icon: <Calendar size={18} /> },
  { id: 'finance', label: 'Finance', icon: <DollarSign size={18} /> }
];

const CampusLayout: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-ministry-text">Campus & Institutions</h1>
            <ModuleTabs
                tabs={CAMPUS_TABS}
                basePath="/campus"
            />
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

export default CampusLayout;
