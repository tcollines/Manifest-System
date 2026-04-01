import React from 'react';
import SettingsView from '../../components/SettingsView';
import { ModalType, User } from '../../types';

interface Props {
  users: User[];
  openModal: (t: ModalType) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (u: User) => void;
  currentUser?: User | null;
}

const SettingsProfilePage: React.FC<Props> = (props) => (
  <SettingsView {...props} initialTab="profile" />
);

export default SettingsProfilePage;
