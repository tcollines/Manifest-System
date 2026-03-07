import { Router } from 'express';
import {
    getVehicles,
    getVehicle,
    addVehicle,
    updateVehicle,
    updateVehicleStage,
    updateVehicleLocation,
    updateVehicleChildren,
    updateVehicleFinance,
    deleteVehicle,
    getPassengers,
    addPassenger,
    updatePassenger,
    deletePassenger,
    getPassengerCounts,
    getPersonalVehicles,
    addPersonalVehicle,
    updatePersonalVehicleStatus,
    startReturnJourney,
    checkinPassenger
} from '../controllers/vehicleController';

const router = Router();

// 1. Passengers (Static/Deep paths first)
router.get('/passengers/counts', getPassengerCounts);
router.get('/passengers', getPassengers);
router.post('/passengers', addPassenger);
router.patch('/passengers/:id', updatePassenger);
router.patch('/passengers/:id/checkin', checkinPassenger);
router.delete('/passengers/:id', deletePassenger);

// 2. Personal Vehicles
router.get('/personal', getPersonalVehicles);
router.post('/personal', addPersonalVehicle);
router.patch('/personal/:id/status', updatePersonalVehicleStatus);

// 3. Vehicles (Parameterized routes last)
router.get('/', getVehicles);
router.get('/:id', getVehicle);
router.post('/', addVehicle);
router.patch('/:id', updateVehicle);
router.patch('/:id/stage', updateVehicleStage);
router.post('/:id/return-journey', startReturnJourney);
router.patch('/:id/finance', updateVehicleFinance);
router.patch('/:id/location', updateVehicleLocation);
router.patch('/:id/children', updateVehicleChildren);
router.delete('/:id', deleteVehicle);

export default router;
