import React from 'react';
import CampusDashboard from '../../components/CampusDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface CampusPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const CampusAlumniPage: React.FC<CampusPageProps> = (props) => {
    return <CampusDashboard {...props} urlTab="alumni" />;
};

export default CampusAlumniPage;
