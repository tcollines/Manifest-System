/**
 * CheckInPage — route: /registration/check-in
 *
 * Thin wrapper that renders RegistrationDashboard with urlTab='checkin'.
 * All business logic remains in RegistrationDashboard.
 * URL segment is the single source of truth for active tab.
 */
import React from 'react';
import RegistrationDashboard from '../../components/RegistrationDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface CheckInPageProps {
  events: MinistryEvent[];
  currentUser: User;
  onOpenModal?: (type: ModalType) => void;
  refreshParentData?: () => void;
}

const CheckInPage: React.FC<CheckInPageProps> = ({ events, currentUser, onOpenModal, refreshParentData }) => (
  <RegistrationDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    refreshParentData={refreshParentData}
    urlTab="checkin"
  />
);

export default CheckInPage;
