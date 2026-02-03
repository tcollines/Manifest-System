
import { Vehicle, Passenger, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

// Mapper functions to convert DB snake_case to App camelCase
export const mapVehicleFromDB = (v: any): Vehicle => ({
    id: v.id,
    stationId: v.station_id,
    number_plate: v.number_plate,
    driverName: v.driver_name,
    driverContact: v.driver_contact,
    driverNin: v.driver_nin,
    type: v.type,
    coordinator: v.coordinator,
    timeArrival: v.time_arrival,
    status: v.status,
    journeyDirection: v.journey_direction,
    currentStage: v.current_stage,
    approvals: v.approvals,
    financeDetails: v.finance_details,
    location: v.location,
    ongoingStartTime: v.ongoing_start_time,
    ongoingArrivalTime: v.ongoing_arrival_time,
    returnStartTime: v.return_start_time,
    returnArrivalTime: v.return_arrival_time,
    childrenCount: v.children
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
    soulWon: p.soul_won
});

export const VehicleStore = {
    getVehicles: async (coordinatorName?: string): Promise<ServiceResponse<Vehicle[]>> => {
        return safeFetch(
            () => {
                let url = '/vehicles';
                if (coordinatorName) {
                    url += `?coordinator=${encodeURIComponent(coordinatorName)}`;
                }
                return apiFetch(url);
            },
            'Failed to fetch vehicles',
            (data: any[]) => data ? data.map(mapVehicleFromDB) : []
        );
    },

    addVehicle: async (vehicle: Vehicle): Promise<ServiceResponse<void>> => {
        const payload = {
            id: vehicle.id,
            station_id: vehicle.stationId,
            number_plate: vehicle.number_plate,
            driver_name: vehicle.driverName,
            driver_contact: vehicle.driverContact,
            driver_nin: vehicle.driverNin,
            type: vehicle.type,
            coordinator: vehicle.coordinator,
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
            return_arrival_time: vehicle.returnArrivalTime,
            children: vehicle.childrenCount
        };
        return safeFetch(
            () => apiFetch('/vehicles', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            'Error adding vehicle'
        );
    },

    updateVehicle: async (vehicle: Vehicle): Promise<void> => {
        const payload = {
            station_id: vehicle.stationId,
            number_plate: vehicle.number_plate,
            driver_name: vehicle.driverName,
            driver_contact: vehicle.driverContact,
            driver_nin: vehicle.driverNin,
            type: vehicle.type,
            coordinator: vehicle.coordinator,
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
            return_arrival_time: vehicle.returnArrivalTime,
            children: vehicle.childrenCount
        };
        try {
            await apiFetch(`/vehicles/${vehicle.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } catch (e: any) {
            console.error('Unexpected error updating vehicle:', e.message || e);
            throw e;
        }
    },

    // Targeted update for approvals to avoid overwriting other fields
    updateVehicleStage: async (id: string, stage: string, approvals: any): Promise<void> => {
        try {
            await apiFetch(`/vehicles/${id}/stage`, {
                method: 'PATCH',
                body: JSON.stringify({ stage, approvals })
            });
        } catch (e: any) {
            console.error('Error updating vehicle stage:', e.message || e);
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

    getPassengers: async (vehicleId?: string): Promise<ServiceResponse<Passenger[]>> => {
        return safeFetch(
            () => {
                let url = '/vehicles/passengers';
                if (vehicleId) url += `?vehicleId=${vehicleId}`;
                return apiFetch(url);
            },
            'Failed to fetch passengers',
            (data: any[]) => data ? data.map(mapPassengerFromDB).sort((a, b) => a.name.localeCompare(b.name)) : []
        );
    },

    addPassenger: async (passenger: Passenger): Promise<void> => {
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
            soul_won: passenger.soulWon
        };
        try {
            await apiFetch('/vehicles/passengers', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (e: any) {
            console.error('Unexpected error adding passenger:', e.message || e);
            throw e;
        }
    },

    updatePassenger: async (passenger: Passenger): Promise<void> => {
        const payload = {
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
            soul_won: passenger.soulWon
        };
        try {
            await apiFetch(`/vehicles/passengers/${passenger.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } catch (e: any) {
            console.error('Unexpected error updating passenger:', e.message || e);
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
            (data: any[]) => data ? data.map((v: any) => ({
                id: v.id,
                number_plate: v.number_plate,
                driverName: v.driver_name,
                driverContact: v.driver_contact,
                status: v.status,
                checkInTime: v.check_in_time,
                checkOutTime: v.check_out_time,
                currentServiceId: v.current_service_id,
                registeredDate: v.registered_date
            })) : []
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
