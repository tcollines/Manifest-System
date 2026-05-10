import { Router } from 'express';
import {
    getAllSchedules,
    getSchedulesByDepartment,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    addSession,
    updateSession,
    deleteSession,
    addAssignment,
    deleteAssignment,
    getMemberServingHistory,
    generateGlobalSchedules,
    getGlobalStatus
} from '../controllers/scheduleController';

const router = Router();

// Schedules
router.get('/',                                                    getAllSchedules);
router.get('/department/:departmentId',                            getSchedulesByDepartment);
router.get('/global-status/:weekStart',                            getGlobalStatus);
router.post('/global-generate',                                    generateGlobalSchedules);
router.post('/',                                                   createSchedule);
router.patch('/:scheduleId',                                       updateSchedule);
router.delete('/:scheduleId',                                      deleteSchedule);

// Sessions (nested under schedule)
router.post( '/:scheduleId/sessions',                             addSession);
router.patch('/:scheduleId/sessions/:sessionId',                   updateSession);
router.delete('/:scheduleId/sessions/:sessionId',                  deleteSession);

// Assignments (nested under session)
router.post( '/sessions/:sessionId/assignments',                   addAssignment);
router.delete('/sessions/:sessionId/assignments/:assignmentId',    deleteAssignment);

// Member serving history
router.get('/members/:memberId/history',                           getMemberServingHistory);

export default router;
