import React from 'react';
import { SchoolsDashboard } from '../../components/SchoolsDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface SchoolsPageProps {
    currentUser: User | null;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const SchoolsReportsPage: React.FC<SchoolsPageProps> = (props) => {
    return <SchoolsDashboard {...props} urlTab="reports" />;
};

export default SchoolsReportsPage;
