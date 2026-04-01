/**
 * DatabasePage — route: /registration/database
 *
 * Thin wrapper that renders RegistrationDashboard with urlTab='database'.
 * All business logic remains in RegistrationDashboard.
 */
import React from 'react';
import RegistrationDashboard from '../../components/RegistrationDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface DatabasePageProps {
  events: MinistryEvent[];
  currentUser: User;
  onOpenModal?: (type: ModalType) => void;
  refreshParentData?: () => void;
}

const DatabasePage: React.FC<DatabasePageProps> = ({ events, currentUser, onOpenModal, refreshParentData }) => (
  <RegistrationDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    refreshParentData={refreshParentData}
    urlTab="database"
  />
);

export default DatabasePage;
