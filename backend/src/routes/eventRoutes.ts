import { Router } from 'express';
import { getAllEvents, createEvent, updateEvent, deleteEvent } from '../controllers/eventController';

const router = Router();

router.get('/', getAllEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
