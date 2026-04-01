/** FollowUpAnalysisPage — route: /follow-up/analysis */
import React from 'react';
import FollowUpDashboard from '../../components/FollowUpDashboard';
import { ModalType, User } from '../../types';

interface Props { currentUser: User; onOpenModal?: (t: ModalType) => void; }
const FollowUpAnalysisPage: React.FC<Props> = ({ currentUser, onOpenModal }) => (
  <FollowUpDashboard currentUser={currentUser} onOpenModal={onOpenModal} urlTab="analysis" />
);
export default FollowUpAnalysisPage;
