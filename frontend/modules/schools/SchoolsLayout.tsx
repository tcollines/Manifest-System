/** SchoolsLayout — pure route shell. The inner dashboard renders its own header and tabs. */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { MinistryEvent } from '../../types';
import { SchoolsProvider } from './SchoolsContext';

interface SchoolsLayoutProps {
    events: MinistryEvent[];
}

const SchoolsLayout: React.FC<SchoolsLayoutProps> = ({ events }) => (
    <SchoolsProvider initialEvents={events}>
        <Outlet />
    </SchoolsProvider>
);

export default SchoolsLayout;
