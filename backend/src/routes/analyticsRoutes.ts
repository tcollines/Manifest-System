import express from 'express';
import { getServiceAttendance, getSoulsWon, getDashboardKPIs, getFollowUpAnalysis } from '../controllers/analyticsController';
import { getWorkflowSummary, getDepartmentAnalytics, getFinanceAnalytics, getTeamLeaderAnalytics } from '../controllers/workflowAnalyticsController';

import { getDashboardBootstrap } from '../controllers/dashboardBootstrapController';

const router = express.Router();

// Phase 3: Bootstrap Endpoint (Aggregates multiple queries)
router.get('/dashboard/bootstrap', getDashboardBootstrap);

// Existing
router.get('/attendance', getServiceAttendance);
router.get('/souls', getSoulsWon);
router.get('/dashboard', getDashboardKPIs);
router.get('/followup', getFollowUpAnalysis);

// Phase 3: Workflow Analytics
router.get('/workflow/summary', getWorkflowSummary);
router.get('/workflow/department/:id', getDepartmentAnalytics);
router.get('/workflow/finance', getFinanceAnalytics);
router.get('/workflow/team-leader', getTeamLeaderAnalytics);

export default router;
