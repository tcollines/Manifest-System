import express from 'express';
import { getPublicResidence, submitPublicSouls, getPublicEvent, submitPublicEventSouls, getPublicSchedule, submitPublicScheduleAvailability, submitPublicEventPassengers } from '../controllers/publicController';

const router = express.Router();

router.get('/residences/:id', getPublicResidence);
router.post('/souls', submitPublicSouls);

router.get('/events/:id', getPublicEvent);
router.post('/events/souls', submitPublicEventSouls);
router.post('/events/:id/passengers', submitPublicEventPassengers);

// Public Schedule Availability
router.get('/schedules/:id', getPublicSchedule);
router.post('/schedules/:id/availability', submitPublicScheduleAvailability);

export default router;
