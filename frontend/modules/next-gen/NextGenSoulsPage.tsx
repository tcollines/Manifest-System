import React from 'react';
import NextGenDashboard from '../../components/NextGenDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface Props { events: MinistryEvent[]; currentUser?: User | null; onOpenModal?: (t: ModalType) => void; }

const NextGenSoulsPage: React.FC<Props> = ({ events, currentUser, onOpenModal }) => (
  <NextGenDashboard events={events} currentUser={currentUser} onOpenModal={onOpenModal} urlTab="souls" />
);

export default NextGenSoulsPage;
