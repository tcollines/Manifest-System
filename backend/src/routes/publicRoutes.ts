import express from 'express';
import { getPublicResidence, submitPublicSouls } from '../controllers/publicController';

const router = express.Router();

router.get('/residences/:id', getPublicResidence);
router.post('/souls', submitPublicSouls);

export default router;
