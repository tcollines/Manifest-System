import React from 'react';
import ParkingDashboard from '../../components/ParkingDashboard';
import { MinistryEvent, User, ModalType } from '../../types';

interface ParkingPageProps {
    events?: MinistryEvent[];
    currentUser?: User | null;
    onOpenModal?: (type: ModalType) => void;
}

const ParkingDatabasePage: React.FC<ParkingPageProps> = (props) => {
    return <ParkingDashboard {...props} urlTab="database" />;
};

export default ParkingDatabasePage;
