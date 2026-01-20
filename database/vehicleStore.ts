
import { Vehicle, Passenger } from '../types';
import { supabase } from '../services/supabaseClient';

// Mapper functions to convert DB snake_case to App camelCase
const mapVehicleFromDB = (v: any): Vehicle => ({
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

const mapPassengerFromDB = (p: any): Passenger => ({
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
    gender: p.gender
});

export const VehicleStore = {
    getVehicles: async (coordinatorName?: string): Promise<Vehicle[]> => {
        try {
            let query = supabase.from('vehicles').select('*');

            if (coordinatorName) {
                query = query.eq('coordinator', coordinatorName);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching vehicles:', error.message);
                return [];
            }
            return data.map(mapVehicleFromDB);
        } catch (e: any) {
            console.error('Unexpected error fetching vehicles:', e.message || e);
            return [];
        }
    },

    addVehicle: async (vehicle: Vehicle): Promise<void> => {
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
        try {
            const { error } = await supabase.from('vehicles').insert([payload]);
            if (error) throw error;
        } catch (e: any) {
            console.error('Error adding vehicle:', e.message || e);
        }
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
            const { error } = await supabase.from('vehicles').update(payload).eq('id', vehicle.id);
            if (error) console.error('Error updating vehicle:', error.message);
        } catch (e: any) {
            console.error('Unexpected error updating vehicle:', e.message || e);
        }
    },

    // Targeted update for approvals to avoid overwriting other fields
    updateVehicleStage: async (id: string, stage: string, approvals: any): Promise<void> => {
        try {
            const { data, error } = await supabase.from('vehicles').update({
                current_stage: stage,
                approvals: approvals
            }).eq('id', id).select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error(`Vehicle update failed: ID ${id} not found or permission denied.`);
            }
        } catch (e: any) {
            console.error('Error updating vehicle stage:', e.message || e);
            throw e;
        }
    },

    updateVehicleLocation: async (id: string, location: { lat: number, lng: number }): Promise<void> => {
        try {
            const { error } = await supabase.from('vehicles').update({ location }).eq('id', id);
            if (error) {
                console.error('Error updating vehicle location:', error.message);
            }
        } catch (e: any) {
            console.error('Unexpected error updating vehicle location:', e.message || e);
        }


    },

    getPassengers: async (vehicleId?: string): Promise<Passenger[]> => {
        try {
            let query = supabase.from('passengers').select('*');
            if (vehicleId) {
                query = query.eq('vehicle_id', vehicleId);
            }
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching passengers:', error.message);
                return [];
            }
            return data.map(mapPassengerFromDB);
        } catch (e: any) {
            console.error('Unexpected error fetching passengers:', e.message || e);
            return [];
        }
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
            gender: passenger.gender
        };
        try {
            const { error } = await supabase.from('passengers').insert([payload]);
            if (error) console.error('Error adding passenger:', error.message);
        } catch (e: any) {
            console.error('Unexpected error adding passenger:', e.message || e);
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
            gender: passenger.gender
        };
        try {
            const { error } = await supabase.from('passengers').update(payload).eq('id', passenger.id);
            if (error) console.error('Error updating passenger:', error.message);
        } catch (e: any) {
            console.error('Unexpected error updating passenger:', e.message || e);
        }
    },

    deletePassenger: async (id: string): Promise<void> => {
        try {
            const { error } = await supabase.from('passengers').delete().eq('id', id);
            if (error) console.error('Error deleting passenger:', error.message);
        } catch (e: any) {
            console.error('Unexpected error deleting passenger:', e.message || e);
        }
    },

    // --- PARKING MODULE (Personal Vehicles) ---

    getPersonalVehicles: async (): Promise<any[]> => {
        try {
            const { data, error } = await supabase.from('personal_vehicles').select('*').order('registered_date', { ascending: false });
            if (error) throw error;
            return data.map(v => ({
                id: v.id,
                number_plate: v.number_plate,
                driverName: v.driver_name,
                driverContact: v.driver_contact,
                status: v.status,
                checkInTime: v.check_in_time,
                checkOutTime: v.check_out_time,
                currentServiceId: v.current_service_id,
                registeredDate: v.registered_date
            }));
        } catch (e: any) {
            console.error("Error fetching personal vehicles:", e);
            return [];
        }
    },

    addPersonalVehicle: async (vehicle: any): Promise<void> => {
        try {
            const payload = {
                number_plate: vehicle.number_plate,
                driver_name: vehicle.driverName,
                driver_contact: vehicle.driverContact,
                status: vehicle.status || 'Absent',
                registered_date: new Date().toISOString()
            };
            const { error } = await supabase.from('personal_vehicles').insert([payload]);
            if (error) throw error;
        } catch (e: any) {
            console.error("Error adding personal vehicle:", e);
            throw e;
        }
    },

    updatePersonalVehicleStatus: async (id: string, status: 'Checked In' | 'Checked Out', serviceId?: string): Promise<void> => {
        try {
            const now = new Date().toISOString();
            const payload: any = { status };

            if (status === 'Checked In') {
                payload.check_in_time = now;
                payload.current_service_id = serviceId;
            } else {
                payload.check_out_time = now;
            }

            const { error } = await supabase.from('personal_vehicles').update(payload).eq('id', id);
            if (error) throw error;
        } catch (e: any) {
            console.error("Error updating personal vehicle status:", e);
            throw e;
        }
    }

};
