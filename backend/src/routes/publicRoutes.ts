import express from 'express';
import { getPublicResidence, submitPublicSouls, getPublicEvent, submitPublicEventSouls } from '../controllers/publicController';

const router = express.Router();

router.get('/residences/:id', getPublicResidence);
router.post('/souls', submitPublicSouls);

router.get('/events/:id', getPublicEvent);
router.post('/events/souls', submitPublicEventSouls);

export default router;
