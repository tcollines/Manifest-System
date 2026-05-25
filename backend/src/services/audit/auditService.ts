import { supabase } from '../../supabase';
import { AuditLogParams } from './auditTypes';

/**
 * Global Audit Logger
 * Designed to be non-blocking. It logs asynchronously and catches its own exceptions
 * to ensure that business logic transactions never fail due to an audit logging error.
 */
export const logAudit = async (params: AuditLogParams): Promise<void> => {
    try {
        const { error } = await supabase.from('audit_logs').insert([{
            manifest_id: params.manifestId,
            actor_id: params.actorId || null,
            actor_name: params.actorName || null,
            actor_role: params.actorRole || null,
            action_type: params.actionType,
            module_name: params.moduleName,
            entity_name: params.entityName,
            entity_id: params.entityId || null,
            before_values: params.beforeValues || null,
            after_values: params.afterValues || null,
            changed_fields: params.changedFields || null,
            ip_address: params.ipAddress || null,
            user_agent: params.userAgent || null,
            request_id: params.requestId || null
        }]);

        if (error) {
            console.error('[AUDIT LOG ERROR]', error.message, 'Payload:', JSON.stringify(params));
        }
    } catch (err: any) {
        // Critical: Catch everything so we don't crash the main Express request
        console.error('[AUDIT LOG EXCEPTION]', err.message || err);
    }
};

/**
 * Utility to compute the changed fields between two JSON objects (before and after)
 */
export const computeChangedFields = (before: any, after: any): string[] => {
    if (!before || !after) return [];
    
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    for (const key of allKeys) {
        // Simple equality check. For deep objects, this might report changes if references differ,
        // but for standard DB row payloads, primitive comparison is sufficient.
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            changes.push(key);
        }
    }
    
    return changes;
};
