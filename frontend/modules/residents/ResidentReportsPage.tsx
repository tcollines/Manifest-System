import React from 'react';
import ResidentDashboard from '../../components/ResidentDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface Props { events: MinistryEvent[]; currentUser?: User | null; onOpenModal?: (t: ModalType) => void; }

const ResidentReportsPage: React.FC<Props> = ({ events, currentUser, onOpenModal }) => (
  <ResidentDashboard events={events} currentUser={currentUser} onOpenModal={onOpenModal} urlTab="reports" />
);

export default ResidentReportsPage;
