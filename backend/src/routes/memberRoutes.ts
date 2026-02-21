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
    getMembersByIds
} from '../controllers/memberController';

const router = Router();
router.get('/', getMembers);
router.post('/batch', getMembersByIds); // New batch retrieval endpoint
router.post('/', addMember);
router.put('/:id', updateMember);
router.post('/delete', deleteMember); // Using POST for bulk delete with body
router.post('/check-in', checkInMember);
router.get('/stats/:serviceId', getServiceStats);
router.get('/:id/details', getMemberDetails);
router.get('/search-status/:serviceId', searchMembersWithStatus);
router.get('/attendees/:id', getEventAttendees);

export default router;
