/** FleetPage — route: /finance/fleet */
import React from 'react';
import FinanceDashboard from '../../components/FinanceDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface FleetPageProps {
  events: MinistryEvent[];
  currentUser?: User;
  onOpenModal?: (type: ModalType) => void;
}

const FleetPage: React.FC<FleetPageProps> = ({ events, currentUser, onOpenModal }) => (
  <FinanceDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    urlTab="fleet"
  />
);
export default FleetPage;
