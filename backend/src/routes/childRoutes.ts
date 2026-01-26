import { Router } from 'express';
import {
    getChildren,
    addChild,
    bulkAddChildren,
    updateChild,
    deleteChild,
    bulkDeleteChildren,
    getChildAttendance
} from '../controllers/childController';

const router = Router();

router.get('/', getChildren);
router.post('/', addChild);
router.post('/bulk', bulkAddChildren);
router.put('/:id', updateChild);
router.delete('/:id', deleteChild);
router.post('/bulk-delete', bulkDeleteChildren);
router.get('/attendance/:serviceId', getChildAttendance);

export default router;
