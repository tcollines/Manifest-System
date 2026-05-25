import { useState } from 'react';
import { User } from '../types';
import { UserStore } from '../database/userStore';
import { useNotification } from '../components/ui/NotificationSystem';

export const useUserManagement = () => {
  const { showToast } = useNotification();
  const [refreshUsersCounter, setRefreshUsersCounter] = useState(0);

  const handleSaveUser = async (newUser: User) => {
    try {
      const usersResp = await UserStore.getAll();
      const users = usersResp.status === 'success' && usersResp.data ? usersResp.data : [];
      if (users.some(u => u.username?.toLowerCase() === newUser.username?.toLowerCase())) {
        if (newUser.username) {
          showToast(`Error: The username "${newUser.username}" is already taken.`, 'error');
          return;
        }
      }
      if (newUser.email && users.some(u => u.email?.toLowerCase() === newUser.email?.toLowerCase())) {
        throw new Error(`The email "${newUser.email}" is already registered.`);
      }
      const response = await UserStore.add(newUser);
      if (response.status !== 'success') {
        throw new Error(response.status === 'error' ? response.message : 'Failed to add user');
      }
      setRefreshUsersCounter(c => c + 1);
      showToast('User added successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add user', 'error');
      throw e;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await UserStore.remove(userId);
      setRefreshUsersCounter(c => c + 1);
      showToast('User deleted successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete user', 'error');
      throw e;
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const response = await UserStore.update(updatedUser);
      if (response.status !== 'success') {
        throw new Error(response.status === 'error' ? response.message : 'Failed to update user');
      }
      setRefreshUsersCounter(c => c + 1);
      showToast('User updated successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update user', 'error');
      throw e;
    }
  };

  return {
    refreshUsersCounter,
    handleSaveUser,
    handleUpdateUser,
    handleDeleteUser,
  };
};
