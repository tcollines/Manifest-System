/** FollowUpServicesPage — route: /follow-up/services */
import React from 'react';
import FollowUpDashboard from '../../components/FollowUpDashboard';
import { ModalType, User } from '../../types';

interface Props { currentUser: User; onOpenModal?: (t: ModalType) => void; }
const FollowUpServicesPage: React.FC<Props> = ({ currentUser, onOpenModal }) => (
  <FollowUpDashboard currentUser={currentUser} onOpenModal={onOpenModal} urlTab="services" />
);
export default FollowUpServicesPage;
