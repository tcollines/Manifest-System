import React from 'react';
import HealingDashboard from '../../components/HealingDashboard';
import { User, MinistryEvent, ModalType } from '../../types';

interface HealingPageProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

const HealingTestimoniesPage: React.FC<HealingPageProps> = (props) => {
    return <HealingDashboard {...props} urlTab="testimonies" />;
};

export default HealingTestimoniesPage;
