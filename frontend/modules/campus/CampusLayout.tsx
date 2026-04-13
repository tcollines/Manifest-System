import React from 'react';
import { Outlet } from 'react-router-dom';
import { CampusProvider } from './CampusContext';
import { MinistryEvent } from '../../types';

const CampusLayout: React.FC<{ events: MinistryEvent[] }> = ({ events }) => (
    <CampusProvider initialEvents={events}>
        <Outlet />
    </CampusProvider>
);

export default CampusLayout;
