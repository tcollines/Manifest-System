import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import { ROLES } from '../constants/roles';

export const requireRole = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(401).json({ error: 'Unauthorized: Missing User Session' });
        }
        
        // Resolve generic Supabase JWT role to actual application role
        let actualRole = user.role;
        if (actualRole === 'authenticated') {
            const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
            if (data && data.role) actualRole = data.role;
        }

        if (!allowedRoles.includes(actualRole)) {
            return res.status(403).json({ error: 'Access denied: Insufficient role permissions.' });
        }
        
        next();
    };
};

export const requireDepartmentOwnership = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const manifestId = (req as any).manifestId;

    if (!user || !manifestId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Resolve generic Supabase JWT role to actual application role
    let actualRole = user.role;
    if (actualRole === 'authenticated') {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (data && data.role) actualRole = data.role;
    }

    // Admins and TLs bypass ownership checks since they hold global operational scope
    if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEAM_LEADER, ROLES.FINANCE].includes(actualRole)) {
        return next();
    }

    // If they are a standard Department, enforce strict resource ownership mapping
    if (actualRole === ROLES.DEPARTMENT) {
        // Find their assigned departmentId
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('department_id')
            .eq('id', user.id)
            .single();
            
        if (userError || !userData?.department_id) {
             return res.status(403).json({ error: 'Access denied: No department mapping attached to user.' });
        }

        const userDeptId = userData.department_id;
        
        // We typically find the workplanId in req.params
        const workplanId = req.params.workplanId;
        if (!workplanId) {
             return res.status(400).json({ error: 'Bad Request: Missing workplan identifier' });
        }

        const { data: wp, error: wpError } = await supabase
            .from('monthly_workplans')
            .select('department_id')
            .eq('id', workplanId)
            .eq('manifest_id', manifestId)
            .single();

        if (wpError || !wp) {
            return res.status(404).json({ error: 'Workplan not found' });
        }

        if (wp.department_id !== userDeptId) {
            return res.status(403).json({ error: 'Access denied: You do not own this department resource.' });
        }
    }

    next();
};
