import React from 'react';
import HealingDashboard from '../../components/HealingDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface HealingPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const HealingNewPage: React.FC<HealingPageProps> = (props) => {
    return <HealingDashboard {...props} urlTab="new" />;
};

export default HealingNewPage;
