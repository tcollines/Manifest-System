import React from 'react';
import CheckInTab from './tabs/CheckInTab';
import { useRegistration } from './RegistrationContext';

const CheckInPage: React.FC = () => {
    const { currentUser } = useRegistration();

    if (!currentUser) return null;

    return <CheckInTab />;
};

export default CheckInPage;
