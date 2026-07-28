
import { Vehicle, Passenger, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

// Mapper functions to convert DB snake_case to App camelCase
export const mapVehicleFromDB = (v: any): Vehicle => ({
    id: v.id,
    stationId: v.station_id,
    eventId: v.event_id, // Map from DB
    number_plate: v.number_plate,
    driverName: v.driver_name,
    driverContact: v.driver_contact,
    driverNin: v.driver_nin,
    type: v.type,
    coordinator: v.coordinator,
    coordinatorUid: v.coordinator_uid, // Map from DB
    coordinatorContact: v.coordinator_contact, // Map from DB
    timeArrival: v.time_arrival,
    status: v.status,
    journeyDirection: v.journey_direction,
    currentStage: (v.current_stage === 'Registration' ? 'Onboarding' : v.current_stage),
    approvals: v.approvals,
    financeDetails: v.finance_details,
    location: typeof v.location === 'string' ? JSON.parse(v.location) : v.location,
    ongoingStartTime: v.ongoing_start_time,
    ongoingArrivalTime: v.ongoing_arrival_time,
    returnStartTime: v.return_start_time,
    returnArrivalTime: v.return_arrival_time,
    childrenCount: v.children,
    version: v.version
});

export const mapPassengerFromDB = (p: any): Passenger => ({
    id: p.id,
    vehicleId: p.vehicle_id,
    category: p.category,
    name: p.name,
    contact: p.contact,
    residence: p.residence,
    isFirstTime: p.is_first_time,
    verified: p.verified,
    school: p.school,
    studentClass: p.student_class,
    boardingType: p.boarding_type,
    gender: p.gender,
    parentContact: p.parent_contact,
    soulWon: p.soul_won,
    version: p.version
});

export const mapPersonalVehicleFromDB = (v: any): any => ({
    id: v.id,
    number_plate: v.number_plate,
    driverName: v.driver_name,
    driverContact: v.driver_contact,
    status: v.status,
    checkInTime: v.check_in_time,
    checkOutTime: v.check_out_time,
    currentServiceId: v.current_service_id,
    registeredDate: v.registered_date
});

export const VehicleStore = {
    getVehicles: async (params?: { coordinator?: string; coordinatorUid?: string; eventId?: string }): Promise<ServiceResponse<Vehicle[]>> => {
        return safeFetch(
            () => {
                let url = '/vehicles';
                const queryParams = new URLSearchParams();
                if (params?.coordinator) queryParams.append('coordinator', params.coordinator);
                if (params?.coordinatorUid) queryParams.append('coordinatorUid', params.coordinatorUid);
                if (params?.eventId) queryParams.append('eventId', params.eventId);

                const queryString = queryParams.toString();
                if (queryString) url += `?${queryString}`;

                return apiFetch(url);
            },
            'Failed to fetch vehicles',
            (data: any[]) => data ? data.map(mapVehicleFromDB) : []
        );
    },

    getVehicle: async (id: string): Promise<ServiceResponse<Vehicle | null>> => {
        return safeFetch(
            () => apiFetch(`/vehicles/${id}?_t=${Date.now()}`),
            'Failed to fetch vehicle',
            (res: any) => res.vehicle ? mapVehicleFromDB(res.vehicle) : null
        );
    },

    addVehicle: async (vehicle: Vehicle): Promise<ServiceResponse<Vehicle | null>> => {
        const payload = {
            id: vehicle.id,
            station_id: vehicle.stationId,
            event_id: vehicle.eventId, // Added field
            number_plate: vehicle.number_plate,
            driver_name: vehicle.driverName,
            driver_contact: vehicle.driverContact,
            driver_nin: vehicle.driverNin,
            type: vehicle.type,
            coordinator: vehicle.coordinator,
            coordinator_contact: vehicle.coordinatorContact, // Map to DB
            time_arrival: vehicle.timeArrival,
            status: vehicle.status,
            journey_direction: vehicle.journeyDirection,
            current_stage: vehicle.currentStage,
            approvals: vehicle.approvals,
            finance_details: vehicle.financeDetails,
            location: vehicle.location,
            ongoing_start_time: vehicle.ongoingStartTime,
            ongoing_arrival_time: vehicle.ongoingArrivalTime,
            return_start_time: vehicle.returnStartTime,
            return_arrivalTime: vehicle.returnArrivalTime,
            children: vehicle.childrenCount
        };
        return safeFetch(
            () => apiFetch('/vehicles', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            'Error adding vehicle',
            (res: any) => res.vehicle ? mapVehicleFromDB(res.vehicle) : null
        );
    },

    updateVehicle: async (vehicle: Partial<Vehicle> & { id: string }): Promise<Vehicle> => {
        // Construct payload dynamically to allow pure PATCH updates (no overwrites)
        const payload: Record<string, any> = {};

        if (vehicle.stationId !== undefined) payload.station_id = vehicle.stationId;
        if (vehicle.eventId !== undefined) payload.event_id = vehicle.eventId;
        if (vehicle.number_plate !== undefined) payload.number_plate = vehicle.number_plate;
        if (vehicle.driverName !== undefined) payload.driver_name = vehicle.driverName;
        if (vehicle.driverContact !== undefined) payload.driver_contact = vehicle.driverContact;
        if (vehicle.driverNin !== undefined) payload.driver_nin = vehicle.driverNin;
        if (vehicle.type !== undefined) payload.type = vehicle.type;
        if (vehicle.coordinator !== undefined) payload.coordinator = vehicle.coordinator;
        if (vehicle.coordinatorUid !== undefined) payload.coordinator_uid = vehicle.coordinatorUid;
        if (vehicle.coordinatorContact !== undefined) payload.coordinator_contact = vehicle.coordinatorContact;
        if (vehicle.timeArrival !== undefined) payload.time_arrival = vehicle.timeArrival;
        if (vehicle.childrenCount !== undefined) payload.children = vehicle.childrenCount;
        if (vehicle.version !== undefined) payload.version = vehicle.version; // For optimistic locking

        try {
            const res = await apiFetch(`/vehicles/${vehicle.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            return mapVehicleFromDB(res.vehicle);
        } catch (e: any) {
            console.error('Unexpected error updating vehicle:', e.message || e);
            throw e;
        }
    },

    // Targeted update for approvals to avoid overwriting other fields
    updateVehicleStage: async (id: string, stage: string, approvals: any, options?: { status?: string, journeyDirection?: string, ongoingArrivalTime?: string, returnArrivalTime?: string, ongoingStartTime?: string, returnStartTime?: string, version?: number }): Promise<Vehicle> => {
        console.log("updateVehicleStage called from:", new Error().stack);
        console.log("Stage update payload:", { id, stage, version: options?.version });
        try {
            const res = await apiFetch(`/vehicles/${id}/stage`, {
                method: 'PATCH',
                body: JSON.stringify({
                    stage,
                    approvals,
                    status: options?.status,
                    journey_direction: options?.journeyDirection,
                    ongoing_arrival_time: options?.ongoingArrivalTime,
                    return_arrival_time: options?.returnArrivalTime,
                    ongoing_start_time: options?.ongoingStartTime,
                    return_start_time: options?.returnStartTime
                })
            });
            return mapVehicleFromDB(res.vehicle);
        } catch (e: any) {
            console.error('Error updating vehicle stage:', e.message || e);
            throw e;
        }
    },


    startReturnJourney: async (id: string, version?: number): Promise<void> => {
        try {
            await apiFetch(`/vehicles/${id}/return-journey`, {
                method: 'POST',
                body: JSON.stringify({ version })
            });
        } catch (e: any) {
            console.error('Error starting return journey:', e.message || e);
            throw e;
        }
    },

    updateVehicleFinance: async (id: string, financeDetails: any, currentStage?: string, approvals?: any, journeyDirection?: string, ongoingStartTime?: string, returnStartTime?: string, version?: number): Promise<Vehicle> => {
        try {
            const res = await apiFetch(`/vehicles/${id}/finance`, {
                method: 'PATCH',
                body: JSON.stringify({
                    finance_details: financeDetails,
                    current_stage: currentStage,
                    approvals: approvals,
                    journey_direction: journeyDirection,
                    ongoing_start_time: ongoingStartTime,
                    return_start_time: returnStartTime,
                    version: version
                })
            });
            return mapVehicleFromDB(res.vehicle);
        } catch (e: any) {
            console.error('Error updating vehicle finance:', e.message || e);
            throw e;
        }
    },

    deleteVehicle: async (id: string): Promise<void> => {
        try {
            await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
        } catch (e: any) {
            console.error('Error deleting vehicle:', e.message || e);
            throw e;
        }
    },

    updateVehicleLocation: async (id: string, location: { lat: number, lng: number }): Promise<void> => {
        try {
            await apiFetch(`/vehicles/${id}/location`, {
                method: 'PATCH',
                body: JSON.stringify({ location })
            });
        } catch (e: any) {
            console.error('Unexpected error updating vehicle location:', e.message || e);
        }
    },

    updateChildrenCount: async (id: string, count: number): Promise<void> => {
        try {
            await apiFetch(`/vehicles/${id}/children`, {
                method: 'PATCH',
                body: JSON.stringify({ children: count })
            });
        } catch (e: any) {
            console.error('Error updating children count:', e.message || e);
            throw e;
        }
    },

    getPassengers: async (params?: string | { vehicleId?: string; eventId?: string }): Promise<ServiceResponse<Passenger[]>> => {
        return safeFetch(
            () => {
                let url = '/vehicles/passengers';
                const queryParams = new URLSearchParams();

                if (typeof params === 'string') {
                    queryParams.append('vehicleId', params);
                } else if (params) {
                    if (params.vehicleId) queryParams.append('vehicleId', params.vehicleId);
                    if (params.eventId) queryParams.append('eventId', params.eventId);
                }

                const queryString = queryParams.toString();
                if (queryString) url += `?${queryString}`;

                return apiFetch(url);
            },
            'Failed to fetch passengers',
            (data: any[]) => data ? data.map(mapPassengerFromDB) : []
        );
    },

    getPassengerCounts: async (eventId: string): Promise<ServiceResponse<Record<string, number>>> => {
        return safeFetch(
            () => apiFetch(`/vehicles/passengers/counts?eventId=${eventId}`),
            'Failed to fetch passenger counts'
        );
    },

    addPassenger: async (passenger: Passenger): Promise<ServiceResponse<Passenger | null>> => {
        const payload = {
            id: passenger.id,
            vehicle_id: passenger.vehicleId,
            category: passenger.category,
            name: passenger.name,
            contact: passenger.contact,
            residence: passenger.residence,
            is_first_time: passenger.isFirstTime,
            verified: passenger.verified,
            school: passenger.school,
            student_class: passenger.studentClass,
            boarding_type: passenger.boardingType,
            gender: passenger.gender,
            parent_contact: passenger.parentContact,
            soul_won: passenger.soulWon,
            event_id: passenger.eventId, // Added field
            station_id: passenger.stationId // Added field
        };
        return safeFetch(
            () => apiFetch('/vehicles/passengers', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            'Error adding passenger',
            (res: any) => res.passenger ? mapPassengerFromDB(res.passenger) : null
        );
    },

    updatePassenger: async (passenger: Partial<Passenger> & { id: string }): Promise<void> => {
        const payload: Record<string, any> = {};

        if (passenger.vehicleId !== undefined) payload.vehicle_id = passenger.vehicleId;
        if (passenger.category !== undefined) payload.category = passenger.category;
        if (passenger.name !== undefined) payload.name = passenger.name;
        if (passenger.contact !== undefined) payload.contact = passenger.contact;
        if (passenger.residence !== undefined) payload.residence = passenger.residence;
        if (passenger.isFirstTime !== undefined) payload.is_first_time = passenger.isFirstTime;
        if (passenger.verified !== undefined) payload.verified = passenger.verified;
        if (passenger.school !== undefined) payload.school = passenger.school;
        if (passenger.studentClass !== undefined) payload.student_class = passenger.studentClass;
        if (passenger.boardingType !== undefined) payload.boarding_type = passenger.boardingType;
        if (passenger.gender !== undefined) payload.gender = passenger.gender;
        if (passenger.parentContact !== undefined) payload.parent_contact = passenger.parentContact;
        if (passenger.soulWon !== undefined) payload.soul_won = passenger.soulWon;
        if (passenger.eventId !== undefined) payload.event_id = passenger.eventId;
        if (passenger.stationId !== undefined) payload.station_id = passenger.stationId;
        if (passenger.version !== undefined) payload.version = passenger.version; // For optimistic locking

        try {
            await apiFetch(`/vehicles/passengers/${passenger.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        } catch (e: any) {
            console.error('Unexpected error updating passenger:', e.message || e);
            throw e;
        }
    },

    checkinPassenger: async (passengerId: string, isVerified: boolean, version?: number): Promise<void> => {
        try {
            await apiFetch(`/vehicles/passengers/${passengerId}/checkin`, {
                method: 'PATCH',
                body: JSON.stringify({ isVerified, version })
            });
        } catch (e: any) {
            console.error('Error checking in passenger:', e.message || e);
            throw e;
        }
    },

    deletePassenger: async (id: string): Promise<void> => {
        try {
            await apiFetch(`/vehicles/passengers/${id}`, { method: 'DELETE' });
        } catch (e: any) {
            console.error('Unexpected error deleting passenger:', e.message || e);
            throw e;
        }
    },

    // --- PARKING MODULE (Personal Vehicles) ---

    getPersonalVehicles: async (): Promise<ServiceResponse<any[]>> => {
        return safeFetch(
            () => apiFetch('/vehicles/personal'),
            'Failed to fetch personal vehicles',
            (data: any[]) => data ? data.map(mapPersonalVehicleFromDB) : []
        );
    },

    addPersonalVehicle: async (vehicle: any): Promise<void> => {
        try {
            const payload = {
                number_plate: vehicle.number_plate,
                driver_name: vehicle.driverName,
                driver_contact: vehicle.driverContact,
                status: vehicle.status || 'Absent'
            };
            await apiFetch('/vehicles/personal', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (e: any) {
            console.error("Error adding personal vehicle:", e);
            throw e;
        }
    },

    updatePersonalVehicleStatus: async (id: string, status: 'Checked In' | 'Checked Out', serviceId?: string): Promise<void> => {
        try {
            await apiFetch(`/vehicles/personal/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status, serviceId })
            });
        } catch (e: any) {
            console.error("Error updating personal vehicle status:", e);
            throw e;
        }
    }

};
