import express from 'express';
import { saveSubscription, deleteSubscription, getPreferences, updatePreferences } from '../controllers/pushController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/subscribe', authenticate, saveSubscription);
router.post('/unsubscribe', authenticate, deleteSubscription);

router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, updatePreferences);

export default router;
