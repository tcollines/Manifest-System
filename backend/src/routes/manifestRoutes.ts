import { Router } from 'express';
import { getManifest, saveManifest } from '../controllers/manifestController';

const router = Router();

router.get('/', getManifest);
router.post('/', saveManifest);

export default router;
