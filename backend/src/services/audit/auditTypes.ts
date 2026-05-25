export interface AuditLogParams {
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    manifestId: string;
    actionType: string;
    moduleName: string;
    entityName: string;
    entityId?: string;
    beforeValues?: any;
    afterValues?: any;
    changedFields?: string[];
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
}
