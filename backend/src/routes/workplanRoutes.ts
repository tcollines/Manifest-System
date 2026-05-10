import { Router } from 'express';
import { ROLES } from '../constants/roles';
import { requireRole, requireDepartmentOwnership } from '../middleware/roleMiddleware';
import {
    getWorkplansByDepartment,
    generateGlobalWorkplans,
    populateDraftWorkplan,
    submitWorkplan,
    processAdminItemDecision,
    processTLItemDecision,
    finalizeWorkplan,
    deleteWorkplan,
    editWorkplanItem,
    resubmitWorkplan,
    getGlobalQueue,
    processAdminReviewCompletion,
    addWorkplanItem,
    getGlobalStatus
} from '../controllers/workplanController';

const router = Router();

// HOD scoped endpoints
router.get('/department/:departmentId', getWorkplansByDepartment);
router.get('/global-status/:month', getGlobalStatus);
router.post('/:workplanId/populate', requireDepartmentOwnership, populateDraftWorkplan);
router.delete('/:workplanId', requireDepartmentOwnership, deleteWorkplan);

router.patch('/:workplanId/submit', requireDepartmentOwnership, submitWorkplan);
router.patch('/:workplanId/items/:itemId/edit', requireDepartmentOwnership, editWorkplanItem);
router.post('/:workplanId/resubmit', requireDepartmentOwnership, resubmitWorkplan);

// Global Administrator Scopes
router.post('/global-generate', requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEAM_LEADER]), generateGlobalWorkplans);
router.get('/global-queue', requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEAM_LEADER, ROLES.FINANCE, 'Dept Finance', 'Head of Dept', 'HOD', 'Dept Admin']), getGlobalQueue);
router.patch('/:workplanId/items/:itemId/admin', requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), processAdminItemDecision);
router.patch('/:workplanId/admin/complete', requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), processAdminReviewCompletion);
router.post('/:workplanId/items/add', requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEAM_LEADER]), addWorkplanItem);

// Global Team Leader Scopes
router.patch('/:workplanId/items/:itemId/tl', requireRole([ROLES.TEAM_LEADER, ROLES.SUPER_ADMIN]), processTLItemDecision);
router.patch('/:workplanId/finalize', requireRole([ROLES.TEAM_LEADER, ROLES.SUPER_ADMIN]), finalizeWorkplan);

export default router;
