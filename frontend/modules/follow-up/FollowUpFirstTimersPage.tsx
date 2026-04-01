/** FollowUpFirstTimersPage — route: /follow-up/first-timers */
import React from 'react';
import FollowUpDashboard from '../../components/FollowUpDashboard';
import { ModalType, User } from '../../types';

interface Props { currentUser: User; onOpenModal?: (t: ModalType) => void; }
const FollowUpFirstTimersPage: React.FC<Props> = ({ currentUser, onOpenModal }) => (
  <FollowUpDashboard currentUser={currentUser} onOpenModal={onOpenModal} urlTab="first-timers" />
);
export default FollowUpFirstTimersPage;
