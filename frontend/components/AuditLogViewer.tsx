import React, { useEffect, useState } from 'react';
import { auditService } from '../services/auditService';
import { Clock, User as UserIcon } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    previous_status: string | null;
    new_status: string;
    details: any;
    created_at: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

interface AuditLogViewerProps {
    entityId: string;
    entityType: 'workplan_item' | 'requisition' | 'batch';
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ entityId, entityType }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            let data = [];
            if (entityType === 'workplan_item') {
                data = await auditService.fetchWorkplanItemLogs(entityId);
            } else {
                data = await auditService.fetchRequisitionLogs(entityId, entityType);
            }
            setLogs(data);
            setIsLoading(false);
        };

        if (entityId) {
            fetchLogs();
        }
    }, [entityId, entityType]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ministry-orange"></div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center p-4 text-gray-500 text-sm">
                No audit logs found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 text-sm mb-4">Activity History</h4>
            <div className="relative border-l border-gray-200 ml-3 space-y-6">
                {logs.map((log) => (
                    <div key={log.id} className="relative pl-6">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></div>
                        <div className="flex flex-col gap-1 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{log.action}</span>
                                <div className="flex items-center text-xs text-gray-500 gap-1">
                                    <Clock size={12} />
                                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                                    <UserIcon size={12} />
                                    {log.user?.name || 'System'} <span className="text-gray-400">({log.user?.role || 'System'})</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                {log.previous_status && (
                                    <>
                                        <StatusBadge status={log.previous_status} />
                                        <span className="text-gray-400">→</span>
                                    </>
                                )}
                                <StatusBadge status={log.new_status} />
                            </div>

                            {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-2 bg-gray-50 p-2 rounded text-xs text-gray-600 font-mono">
                                    {log.details.comment && <div className="italic text-gray-700">"{log.details.comment}"</div>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuditLogViewer;
