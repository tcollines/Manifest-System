/**
 * RegistrationLayout — pure route shell for the Registration department.
 *
 * The inner RegistrationDashboard already renders its own full header, description,
 * and tab navigation (driven by the urlTab prop). This layout is intentionally a
 * thin pass-through to avoid duplicate UI.
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { User } from '../../types';

interface RegistrationLayoutProps {
  currentUser: User;
}

export const RegistrationLayout: React.FC<RegistrationLayoutProps> = () => (
  <Outlet />
);

export default RegistrationLayout;
