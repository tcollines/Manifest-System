/** CoordinatorsPage — route: /transportation/coordinators */
import React from 'react';
import TransportationDashboard from '../../components/TransportationDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface Props { events: MinistryEvent[]; currentUser: User; onOpenModal?: (t: ModalType) => void; }

const CoordinatorsPage: React.FC<Props> = ({ events, currentUser, onOpenModal }) => (
  <TransportationDashboard events={events} currentUser={currentUser} onOpenModal={onOpenModal} urlTab="coordinators" />
);
export default CoordinatorsPage;
