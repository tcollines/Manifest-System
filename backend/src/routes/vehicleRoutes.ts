import { Router } from 'express';
import {
    getVehicles,
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
    getPersonalVehicles,
    addPersonalVehicle,
    updatePersonalVehicleStatus
} from '../controllers/vehicleController';

const router = Router();

// Vehicles
router.get('/', getVehicles);
router.post('/', addVehicle);
router.put('/:id', updateVehicle);
router.patch('/:id/stage', updateVehicleStage);
router.patch('/:id/finance', updateVehicleFinance);
router.patch('/:id/location', updateVehicleLocation);
router.patch('/:id/children', updateVehicleChildren);
router.delete('/:id', deleteVehicle);

// Passengers
router.get('/passengers', getPassengers);
router.post('/passengers', addPassenger);
router.put('/passengers/:id', updatePassenger);
router.delete('/passengers/:id', deletePassenger);

// Personal Vehicles
router.get('/personal', getPersonalVehicles);
router.post('/personal', addPersonalVehicle);
router.patch('/personal/:id/status', updatePersonalVehicleStatus);

export default router;
