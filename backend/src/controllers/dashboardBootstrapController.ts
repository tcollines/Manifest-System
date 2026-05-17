import { Request, Response } from 'express';
import { getAllEvents } from './eventController';
import { getWorkflowSummary } from './workflowAnalyticsController';
import { getDashboardKPIs, getServiceAttendance, getSoulsWon } from './analyticsController';

/**
 * Executes an existing Express controller function and returns its JSON output.
 * This is used to aggregate multiple endpoints into one bootstrap payload
 * without duplicating internal database logic.
 */
const executeController = async (controllerFn: Function, req: Request): Promise<any> => {
    return new Promise((resolve, reject) => {
        let isResolved = false;
        
        const mockRes = {
            status: function(code: number) { return this; },
            json: function(data: any) {
                if (!isResolved) {
                    isResolved = true;
                    resolve(data);
                }
                return this;
            },
            send: function(data: any) {
                if (!isResolved) {
                    isResolved = true;
                    resolve(data);
                }
                return this;
            }
        };

        try {
            const result = controllerFn(req, mockRes as any);
            if (result instanceof Promise) {
                result.catch((e) => {
                    if (!isResolved) {
                        isResolved = true;
                        reject(e);
                    }
                });
            }
        } catch (e) {
            if (!isResolved) {
                isResolved = true;
                reject(e);
            }
        }
    });
};

// In-memory cache to ensure instant dashboard loads
let bootstrapCache: {
    data: any;
    expiresAt: number;
    manifestId: string;
} | null = null;

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const getDashboardBootstrap = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    // Return instant cached response if valid
    if (bootstrapCache && bootstrapCache.manifestId === manifestId && bootstrapCache.expiresAt > Date.now()) {
        return res.json(bootstrapCache.data);
    }

    try {
        // Construct a clean mock request for the controllers
        const mockReq = {
            ...req,
            manifestId,
            query: {
                limit: '50' // Ensure we get enough events for the dashboard
            }
        } as unknown as Request;

        const [
            eventsPayload,
            workflowStats,
            kpiStats,
            attendanceData,
            soulsData
        ] = await Promise.all([
            executeController(getAllEvents, mockReq),
            executeController(getWorkflowSummary, mockReq),
            executeController(getDashboardKPIs, mockReq),
            executeController(getServiceAttendance, mockReq),
            executeController(getSoulsWon, mockReq)
        ]);

        const responseData = {
            events: eventsPayload.data || [],
            workflowStats,
            kpiStats,
            attendanceData,
            soulsData
        };

        // Update the cache
        bootstrapCache = {
            data: responseData,
            expiresAt: Date.now() + CACHE_TTL_MS,
            manifestId
        };

        res.json(responseData);
    } catch (error: any) {
        console.error('[BOOTSTRAP] Failed to aggregate dashboard data:', error);
        res.status(500).json({ error: 'Failed to bootstrap dashboard data' });
    }
};
