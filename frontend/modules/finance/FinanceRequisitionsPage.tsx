/** FinanceRequisitionsPage — route: /finance/requisitions */
import React from 'react';
import FinanceDashboard from '../../components/FinanceDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface FinanceRequisitionsPageProps {
  events: MinistryEvent[];
  currentUser?: User;
  onOpenModal?: (type: ModalType) => void;
}

const FinanceRequisitionsPage: React.FC<FinanceRequisitionsPageProps> = ({ events, currentUser, onOpenModal }) => (
  <FinanceDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    urlTab="requisitions"
  />
);
export default FinanceRequisitionsPage;
