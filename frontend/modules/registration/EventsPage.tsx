import React from 'react';
import EventsTab from './tabs/EventsTab';
import { useRegistration } from './RegistrationContext';

const EventsPage: React.FC = () => {
    const { currentUser } = useRegistration();

    if (!currentUser) return null;

    return <EventsTab />;
};

export default EventsPage;
