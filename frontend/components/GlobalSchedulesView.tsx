import React, { useState, useEffect, useMemo } from 'react';
import { ServiceSchedule } from '../types';
import { ServiceScheduleStore } from '../database/serviceScheduleStore';
import { Calendar, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import Badge, { statusVariant } from './ui/Badge';
import { formatDate, formatDayLabel } from '../shared/formatters';
import { DEPARTMENTS } from '../constants';

const GlobalSchedulesView: React.FC = () => {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Nested expansion state
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showMissingForWeek, setShowMissingForWeek] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      try {
        const result = await ServiceScheduleStore.getAll();
        if (result.status === 'success') {
          setSchedules(result.data || []);
        } else {
          console.error("Failed to load schedules", result.message);
        }
      } catch (error) {
        console.error("Error loading schedules", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  // Group schedules by Week
  const groupedByWeek = useMemo(() => {
    const groups: Record<string, ServiceSchedule[]> = {};
    schedules.forEach(s => {
       if (!groups[s.weekStart]) groups[s.weekStart] = [];
       groups[s.weekStart].push(s);
    });
    // Sort weeks descending (newest week first)
    return Object.fromEntries(
       Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    );
  }, [schedules]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Global Service Schedules</h1>
          <p className="text-gray-500">Review weekly schedules and rosters created by all departments.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange mx-auto mb-4"></div>
          <p className="text-gray-500">Loading schedules...</p>
        </div>
      ) : Object.keys(groupedByWeek).length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>No service schedules found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
            {Object.entries(groupedByWeek).map(([week, weekSchedules]) => {
                const submittedDeptIds = new Set(weekSchedules.map(s => s.departmentId));
                const missingDepts = DEPARTMENTS.filter(d => d.status === 'Active' && !submittedDeptIds.has(d.id));
                const isWeekExpanded = expandedWeek === week;

                return (
                    <div key={week} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* 1. Week Header */}
                        <div 
                            className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                                setExpandedWeek(isWeekExpanded ? null : week);
                                setExpandedScheduleId(null);
                                setShowMissingForWeek(null);
                            }}
                        >
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Week of {formatDate(week)}</h3>
                                <p className="text-sm text-gray-500 font-medium mt-0.5 text-ministry-orange">
                                    {weekSchedules.length} Department{weekSchedules.length !== 1 ? 's' : ''} Submitted
                                </p>
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                {isWeekExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                            </div>
                        </div>

                        {/* 2. Expanded Week Content */}
                        {isWeekExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex flex-col gap-5">
                                
                                {/* Header Toggle for Missing Depts */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                        Submitted Schedules
                                    </span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMissingForWeek(showMissingForWeek === week ? null : week);
                                        }}
                                        className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors border ${
                                            showMissingForWeek === week 
                                                ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-amber-600 hover:border-amber-200'
                                        }`}
                                    >
                                        <AlertCircle className={`w-3.5 h-3.5 ${showMissingForWeek === week ? 'text-amber-600' : 'text-gray-400'}`} />
                                        {showMissingForWeek === week ? 'Hide Missing' : `${missingDepts.length} Missing Departments`}
                                    </button>
                                </div>

                                {/* Missing Departments Panel */}
                                {showMissingForWeek === week && (
                                    <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-5 mb-2 animate-in slide-in-from-top-2 duration-300">
                                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Pending Submission ({missingDepts.length})
                                        </h4>
                                        {missingDepts.length === 0 ? (
                                            <p className="text-sm text-amber-700">All departments have submitted schedules for this week!</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {missingDepts.map(d => (
                                                    <span key={d.id} className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium shadow-sm">
                                                        {d.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Department Schedules */}
                                <div className="flex flex-col gap-3">
                                    {weekSchedules.map(schedule => (
                                        <div key={schedule.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm hover:border-blue-200 transition-colors">
                                            {/* Schedule Header */}
                                            <div 
                                                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors"
                                                onClick={() => setExpandedScheduleId(expandedScheduleId === schedule.id ? null : schedule.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Badge label={schedule.status} variant={statusVariant(schedule.status)} dot />
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                            {schedule.departmentName || 'Unknown Dept'}
                                                            <span className="text-gray-300 font-normal">|</span>
                                                            <span className="text-gray-600 font-medium">{schedule.title}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-center p-1">
                                                    {expandedScheduleId === schedule.id ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            </div>

                                            {/* Schedule Content */}
                                            {expandedScheduleId === schedule.id && (
                                                <div className="border-t border-gray-100 bg-gray-50/30">
                                                    {(schedule.sessions ?? []).length === 0 ? (
                                                        <p className="px-5 py-6 text-sm text-gray-400 italic text-center">No service sessions defined in this schedule.</p>
                                                    ) : (
                                                        (schedule.sessions ?? []).map((session, sidx) => (
                                                            <div key={session.id} className={`px-6 py-5 ${sidx !== (schedule.sessions?.length || 0) - 1 ? 'border-b border-gray-100' : ''}`}>
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-2 text-ministry-orange font-bold text-sm">
                                                                        <Calendar className="w-4 h-4" />
                                                                        <span>{session.sessionLabel}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                        {formatDayLabel(session.sessionDate)} · Arrive by {session.arrivalTime}
                                                                    </div>
                                                                </div>

                                                                {(session.assignments ?? []).length === 0 ? (
                                                                    <p className="text-xs text-gray-400 italic bg-white p-3 rounded-lg border border-gray-100">No team members assigned.</p>
                                                                ) : (
                                                                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm mt-3">
                                                                        <table className="w-full text-xs">
                                                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                                                <tr>
                                                                                    <th className="px-4 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider w-1/3">Responsibility / Role</th>
                                                                                    <th className="px-4 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider">Assigned Minister</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100">
                                                                                {(session.assignments ?? []).map(assign => (
                                                                                    <tr key={assign.id} className="hover:bg-blue-50/30 transition-colors">
                                                                                        <td className="px-4 py-3 font-semibold text-gray-700">{assign.roleLabel}</td>
                                                                                        <td className="px-4 py-3">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                                                    {(assign.ministerName ?? '?')[0]}
                                                                                                </div>
                                                                                                <span className="font-medium text-gray-900">{assign.ministerName}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};

export default GlobalSchedulesView;
