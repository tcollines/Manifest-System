import express from 'express';
import {
    getDepartments,
    getDepartmentById,
    createDepartment,
    getChurchMembers,
    addChurchMember,
    removeChurchMember,
    linkMemberToUser,
    getLinkableUsers,
    getDeptFinances,
    addDeptFinanceEntry,
    deleteDeptFinanceEntry,
    updateDeptFinanceEntry,
} from '../controllers/departmentController';

const router = express.Router();

// Departments
router.get('/',                                         getDepartments);
router.get('/:departmentId',                            getDepartmentById);
router.post('/',                                        createDepartment);

// Church members (serving, no login)
router.get( '/:departmentId/church-members',            getChurchMembers);
router.post('/:departmentId/church-members',            addChurchMember);
router.delete('/:departmentId/church-members/:memberId', removeChurchMember);
router.get( '/:departmentId/linkable-users',            getLinkableUsers);
router.patch('/:departmentId/church-members/:memberId/link', linkMemberToUser);

// Dept finances
router.get(   '/:departmentId/finances',                getDeptFinances);
router.post(  '/:departmentId/finances',                addDeptFinanceEntry);
router.put(   '/:departmentId/finances/:entryId',       updateDeptFinanceEntry);
router.delete('/:departmentId/finances/:entryId',       deleteDeptFinanceEntry);

export default router;
