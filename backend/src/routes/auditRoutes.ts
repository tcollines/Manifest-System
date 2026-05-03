import express from 'express';
import { authenticate } from '../middleware/auth';
import { getWorkplanItemAuditLogs, getRequisitionAuditLogs } from '../controllers/auditController';

const router = express.Router();

router.use(authenticate);

router.get('/workplan-items/:itemId', getWorkplanItemAuditLogs);
router.get('/requisitions', getRequisitionAuditLogs);

export default router;
