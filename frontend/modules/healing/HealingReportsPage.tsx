import React from 'react';
import HealingDashboard from '../../components/HealingDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface HealingPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const HealingReportsPage: React.FC<HealingPageProps> = (props) => {
    return <HealingDashboard {...props} urlTab="reports" />;
};

export default HealingReportsPage;
