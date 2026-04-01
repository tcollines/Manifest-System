import React from 'react';
import HealingDashboard from '../../components/HealingDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface HealingPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const HealingOverviewPage: React.FC<HealingPageProps> = (props) => {
    return <HealingDashboard {...props} urlTab="overview" />;
};

export default HealingOverviewPage;
