import { useEffect } from 'react';
import { UserStore } from '../database/userStore';
import { EventStore } from '../database/eventStore';
import { VehicleStore } from '../database/vehicleStore';
import { LogisticsStore } from '../database/logisticsStore';
import { isEventLocked } from '../utils';

export const useEventLifecycle = () => {
    useEffect(() => {
        const cleanupExpiredCredentials = async () => {
            const eventResponse = await EventStore.getAll();
            const allEvents = eventResponse.status === 'success' ? eventResponse.data : [];
            const lockedEventIds = allEvents
                .filter(e => isEventLocked(e.date))
                .map(e => e.id);


            if (lockedEventIds.length === 0) return;

            const vehicleResponse = await VehicleStore.getVehicles();
            const allVehicles = vehicleResponse.status === 'success' ? vehicleResponse.data : [];

            const stationResponse = await LogisticsStore.getStations();
            const allStations = stationResponse.status === 'success' ? stationResponse.data : [];

            const userResponse = await UserStore.getAll();
            const allUsers = userResponse.status === 'success' ? userResponse.data : [];

            const passengerResponse = await VehicleStore.getPassengers();
            const allPassengers = passengerResponse.status === 'success' ? passengerResponse.data : [];

            // 1. Snapshot stats for locked events (if not already done or if stats are zero/incomplete)
            for (const eventId of lockedEventIds) {
                const event = allEvents.find(e => e.id === eventId);
                // Repair logic: If stats are missing OR vehicles is 0 (likely due to previous bug), recalculate.
                if (event && (event.stats.vehicles === undefined || event.stats.vehicles === 0)) {
                    // Calculate stats using ROBUST Station-based linking (immune to deleted coordinators)
                    const eventStations = allStations.filter(s => s.eventId === eventId);
                    const eventStationIds = eventStations.map(s => s.id);

                    const eventVehicles = allVehicles.filter(v => eventStationIds.includes(v.stationId));
                    const eventPassengers = allPassengers.filter(p => eventVehicles.some(v => v.id === p.vehicleId));

                    const firstTimersCount = eventPassengers.filter(p => p.isFirstTime === 'Yes').length;
                    const childrenCount = eventVehicles.reduce((sum, v) => sum + (v.childrenCount || 0), 0);
                    const totalAttendees = eventPassengers.length + childrenCount;

                    const totalExpenditure = eventVehicles.reduce((sum, v) => {
                        const dispatchAmount = parseFloat(v.financeDetails?.ongoingDispatch || '0');
                        return sum + dispatchAmount;
                    }, 0);

                    // Update Event
                    const updatedEvent = {
                        ...event,
                        stats: {
                            ...event.stats,
                            vehicles: eventVehicles.length,
                            students: eventPassengers.filter(p => p.category === 'Student').length,
                            institutions: eventPassengers.filter(p => p.category === 'Institution').length,
                            attendees: totalAttendees,
                            firstTimers: firstTimersCount,
                            children: childrenCount,
                            expenditure: totalExpenditure.toLocaleString()
                        }
                    };


                    await EventStore.update(updatedEvent);
                }
            }

            // 2. Cleanup Users
            const usersToRemove = allUsers.filter(u => {
                // Check if user is linked to a locked event
                if (!u.eventId || !lockedEventIds.includes(u.eventId)) return false;

                // Check if user has a temporary role
                return ['Data Entrant', 'Coordinator', 'Vehicle Coordinator'].includes(u.role);
            });

            if (usersToRemove.length > 0) {

                for (const user of usersToRemove) {
                    await UserStore.remove(user.id);
                }
            }
        };

        cleanupExpiredCredentials();
    }, []);
};
