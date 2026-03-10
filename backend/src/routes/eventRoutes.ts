import { Router } from 'express';
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventHighlights, getEventPassengers } from '../controllers/eventController';

const router = Router();

router.get('/', getAllEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.get('/:id/highlights', getEventHighlights);
router.get('/:id/passengers', getEventPassengers);

export default router;
