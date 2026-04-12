import React from 'react';
import SettingsView from '../../components/SettingsView';
import { ModalType, User } from '../../types';

interface Props {
  openModal: (t: ModalType) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (u: User) => void;
}

const SettingsManifestPage: React.FC<Props> = (props) => (
  <SettingsView {...props} initialTab="manifest" />
);

export default SettingsManifestPage;
