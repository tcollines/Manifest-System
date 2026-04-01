/** FollowUpDatabasePage — route: /follow-up/database */
import React from 'react';
import FollowUpDashboard from '../../components/FollowUpDashboard';
import { ModalType, User } from '../../types';

interface Props { currentUser: User; onOpenModal?: (t: ModalType) => void; }
const FollowUpDatabasePage: React.FC<Props> = ({ currentUser, onOpenModal }) => (
  <FollowUpDashboard currentUser={currentUser} onOpenModal={onOpenModal} urlTab="database" />
);
export default FollowUpDatabasePage;
