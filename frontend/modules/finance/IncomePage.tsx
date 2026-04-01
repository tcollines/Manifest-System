/** IncomePage — route: /finance/income */
import React from 'react';
import FinanceDashboard from '../../components/FinanceDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface IncomePageProps {
  events: MinistryEvent[];
  currentUser?: User;
  onOpenModal?: (type: ModalType) => void;
}

const IncomePage: React.FC<IncomePageProps> = ({ events, currentUser, onOpenModal }) => (
  <FinanceDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    urlTab="income"
  />
);
export default IncomePage;
