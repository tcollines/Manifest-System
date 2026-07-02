import { Router } from 'express';
import {
    getMembers,
    addMember,
    updateMember,
    deleteMember,
    checkInMember,
    getServiceStats,
    getMemberDetails,
    searchMembersWithStatus,
    getEventAttendees,
    getMemberById,
    getMembersByIds,
    searchMembersByResidency,
    bulkUpdateResidency,
    uncheckInMember,
    getFirstTimers,
    getPassengerDetails,
    getAttendanceSummary
} from '../controllers/memberController';

const router = Router();
router.get('/', getMembers);
router.get('/lists/first-timers', getFirstTimers);
router.post('/batch', getMembersByIds); // New batch retrieval endpoint
router.post('/', addMember);
router.put('/:id', updateMember);
router.post('/delete', deleteMember); // Using POST for bulk delete with body
router.post('/check-in', checkInMember);
router.post('/uncheck-in', uncheckInMember);
router.get('/stats/:serviceId', getServiceStats);
router.get('/:id/details', getMemberDetails);
router.get('/passengers/:id/details', getPassengerDetails);
router.get('/search-status/:serviceId', searchMembersWithStatus);
router.get('/attendees/:id', getEventAttendees);
router.get('/search-by-residency', searchMembersByResidency);
router.get('/attendance-summary', getAttendanceSummary);
router.post('/bulk-update-residency', bulkUpdateResidency);
router.get('/:id', getMemberById);

export default router;
