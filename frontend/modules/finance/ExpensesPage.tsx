/** ExpensesPage — route: /finance/expenses */
import React from 'react';
import FinanceDashboard from '../../components/FinanceDashboard';
import { MinistryEvent, ModalType, User } from '../../types';

interface ExpensesPageProps {
  events: MinistryEvent[];
  currentUser?: User;
  onOpenModal?: (type: ModalType) => void;
}

const ExpensesPage: React.FC<ExpensesPageProps> = ({ events, currentUser, onOpenModal }) => (
  <FinanceDashboard
    events={events}
    currentUser={currentUser}
    onOpenModal={onOpenModal}
    urlTab="expenses"
  />
);
export default ExpensesPage;
