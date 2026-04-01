/** FollowUpMembersPage — route: /follow-up/members */
import React from 'react';
import FollowUpDashboard from '../../components/FollowUpDashboard';
import { ModalType, User } from '../../types';

interface Props { currentUser: User; onOpenModal?: (t: ModalType) => void; }
const FollowUpMembersPage: React.FC<Props> = ({ currentUser, onOpenModal }) => (
  <FollowUpDashboard currentUser={currentUser} onOpenModal={onOpenModal} urlTab="members" />
);
export default FollowUpMembersPage;
