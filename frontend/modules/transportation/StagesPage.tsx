/** StagesPage — route: /transportation/stages */
import React from 'react';
import TransportationDashboard from '../../components/TransportationDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface Props { events: MinistryEvent[]; currentUser: User; onOpenModal?: (t: ModalType) => void; }

const StagesPage: React.FC<Props> = ({ events, currentUser, onOpenModal }) => (
  <TransportationDashboard events={events} currentUser={currentUser} onOpenModal={onOpenModal} urlTab="stages" />
);
export default StagesPage;
