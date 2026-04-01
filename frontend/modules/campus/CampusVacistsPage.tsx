import React from 'react';
import CampusDashboard from '../../components/CampusDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface CampusPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const CampusVacistsPage: React.FC<CampusPageProps> = (props) => {
    return <CampusDashboard {...props} urlTab="vacists" />;
};

export default CampusVacistsPage;
