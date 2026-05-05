/**
 * StagesTab
 *
 * Stage Details tab for the Transportation module.
 * Wraps the existing StageDetailsTab component (which is already pure/stateless)
 * and feeds it the event-scoped data from useTransport() context.
 *
 * No props, no currentUser prop.
 */

import React from 'react';
import { useTransport } from '../TransportContext';
import { StageDetailsTab } from '../../../components/StageDetailsTab';

const StagesTab: React.FC = () => {
    const { vehicles, passengers, dbStations, selectedEventId } = useTransport();

    // Filter stations to the currently selected event only
    const eventStations = dbStations.filter(s => s.eventId === selectedEventId);

    return (
        <div>
            <StageDetailsTab
                vehicles={vehicles}
                passengers={passengers}
                stations={eventStations}
            />
        </div>
    );
};

export default StagesTab;
