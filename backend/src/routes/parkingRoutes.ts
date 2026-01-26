import { Router } from 'express';
import {
    getPersonalVehicles,
    addPersonalVehicle,
    updatePersonalVehicle,
    checkInPersonalVehicle,
    checkOutPersonalVehicle,
    getAttendanceCount
} from '../controllers/parkingController';

const router = Router();

router.get('/', getPersonalVehicles);
router.post('/', addPersonalVehicle);
router.put('/:id', updatePersonalVehicle);
router.post('/:id/check-in', checkInPersonalVehicle);
router.post('/:id/check-out', checkOutPersonalVehicle);
router.get('/count/:serviceId', getAttendanceCount);

export default router;
