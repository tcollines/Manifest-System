/**
 * EventsPage — route: /registration/events
 *
 * Thin wrapper that renders RegistrationDashboard with urlTab='events'.
 * All business logic remains in RegistrationDashboard.
 */
import React from 'react';
import RegistrationDashboard from '../../components/RegistrationDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface EventsPageProps {
  events: MinistryEvent[];
  currentUser: User;
  onOpenModal?: (type: ModalType) => void;
  refreshParentData?: () => void;
}

const EventsPage: React.FC<EventsPageProps> = ({ events, currentUser, onOpenModal, refreshParentData }) => (
  <RegistrationDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    refreshParentData={refreshParentData}
    urlTab="events"
  />
);

export default EventsPage;
