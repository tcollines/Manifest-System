import React, { useEffect, useState, useCallback } from 'react';
import { ServiceSchedule } from '../../types';
import { ServiceScheduleStore } from '../../database/serviceScheduleStore';
import Badge, { statusVariant } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate, formatDayLabel } from '../../shared/formatters';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const AdministrationSchedulesPage: React.FC = () => {
    const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await ServiceScheduleStore.getAll();
        if (res.status === 'success') {
            setSchedules(res.data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <div className="p-8">
                <LoadingSpinner fullPage={false} message="Loading global service schedules…" />
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen">
            <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Global Service Schedules</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Oversight of all department service schedules
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                {schedules.length === 0 ? (
                    <EmptyState 
                        variant="default"
                        title="No Schedules Found"
                        message="Departments have not created any service schedules yet." 
                        icon={Calendar} 
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        {schedules.map(schedule => (
                            <div key={schedule.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">

                                {/* Schedule header */}
                                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 rounded-2xl transition-colors"
                                    onClick={() => setExpanded(e => e === schedule.id ? null : schedule.id)}>
                                    <div className="flex items-center gap-4">
                                        <Badge label={schedule.status} variant={statusVariant(schedule.status)} dot />
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{schedule.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-gray-500">Week of {formatDate(schedule.weekStart)}</p>
                                                {schedule.departmentName && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-xs font-semibold text-ministry-orange bg-orange-50 px-2 py-0.5 rounded-md">
                                                            {schedule.departmentName}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {expanded === schedule.id
                                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                            : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Sessions */}
                                {expanded === schedule.id && (
                                    <div className="border-t border-gray-100">
                                        {(schedule.sessions ?? []).length === 0 && (
                                            <p className="px-5 py-4 text-sm text-gray-400">No sessions in this schedule.</p>
                                        )}
                                        {(schedule.sessions ?? []).map(session => (
                                            <div key={session.id} className="px-5 py-5 border-b border-gray-50 last:border-b-0 space-y-3">
                                                <div>
                                                    <p className="font-semibold text-gray-700 text-sm">{session.sessionLabel}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{formatDayLabel(session.sessionDate)} · Arrive by {session.arrivalTime}</p>
                                                </div>

                                                {/* Assignment table */}
                                                {(session.assignments ?? []).length > 0 ? (
                                                    <div className="rounded-xl overflow-hidden border border-gray-100 mt-2">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                                <tr>
                                                                    <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Role</th>
                                                                    <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Member</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {session.assignments!.map(a => (
                                                                    <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                                                        <td className="px-4 py-2.5 text-gray-600 font-medium">{a.roleLabel}</td>
                                                                        <td className="px-4 py-2.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                                    {(a.ministerName ?? '?')[0]}
                                                                                </div>
                                                                                <span className="text-gray-800 font-medium">{a.ministerName}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No members assigned to this session.</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdministrationSchedulesPage;
