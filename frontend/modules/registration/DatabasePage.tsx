import React from 'react';
import DatabaseTab from './tabs/DatabaseTab';
import { useRegistration } from './RegistrationContext';

const DatabasePage: React.FC = () => {
    const { currentUser } = useRegistration();

    if (!currentUser) return null;

    return <DatabaseTab />;
};

export default DatabasePage;
