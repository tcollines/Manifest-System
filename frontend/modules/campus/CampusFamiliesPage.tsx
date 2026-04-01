import React from 'react';
import CampusDashboard from '../../components/CampusDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface CampusPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const CampusFamiliesPage: React.FC<CampusPageProps> = (props) => {
    return <CampusDashboard {...props} urlTab="families" />;
};

export default CampusFamiliesPage;
