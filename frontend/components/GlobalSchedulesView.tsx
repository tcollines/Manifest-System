import React, { useState, useEffect, useMemo } from 'react';
import { ServiceSchedule, Department } from '../types';
import { ServiceScheduleStore } from '../database/serviceScheduleStore';
import { DepartmentStore } from '../database/departmentStore';
import { Calendar, ChevronDown, ChevronUp, Clock, AlertCircle, Trash2 } from 'lucide-react';
import Badge, { statusVariant } from './ui/Badge';
import { formatDateOrdinal, formatDayLabel } from '../shared/formatters';
import { useNotification } from './ui/NotificationSystem';

const getCurrentMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
};

const GlobalSchedulesView: React.FC = () => {
  const { showToast, confirm } = useNotification();
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Nested expansion state
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showMissingForWeek, setShowMissingForWeek] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWeekStart, setNewWeekStart] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schedRes, deptRes] = await Promise.all([
          ServiceScheduleStore.getAll(),
          DepartmentStore.getAll()
      ]);
      
      if (schedRes.status === 'success') {
        setSchedules(schedRes.data || []);
      } else {
        console.error("Failed to load schedules", schedRes.message);
      }

      if (deptRes.status === 'success') {
        setDepartments(deptRes.data || []);
      } else {
        console.error("Failed to load departments", deptRes.message);
      }
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async () => {
      if (!newTitle || !newWeekStart) return;
      setIsGenerating(true);
      try {
          const res = await ServiceScheduleStore.generateGlobal({ title: newTitle, weekStart: newWeekStart });
          if (res.status === 'success') {
              const msg = res.data?.message || '';
              if (msg.includes('already have a schedule')) {
                  showToast('A schedule has already been generated for this week.', 'error');
              } else {
                  showToast(msg || 'Schedules generated successfully!', 'success');
                  setNewTitle('');
                  setNewWeekStart('');
                  fetchData();
              }
          } else {
              showToast(res.message || 'Failed to generate schedules', 'error');
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsGenerating(false);
      }
  };

  
  const handleDeleteWeek = async (e: React.MouseEvent, week: string, weekSchedules: ServiceSchedule[]) => {
      e.stopPropagation();
      const confirmed = await confirm(`Are you sure you want to delete ALL ${weekSchedules.length} schedules for the week of ${formatDateOrdinal(week)}? This cannot be undone.`, {
          title: 'Delete Week Schedules',
          confirmText: 'Delete All',
          isDestructive: true
      });
      if (!confirmed) return;
      
      setIsGenerating(true);
      try {
          await Promise.all(weekSchedules.map(s => ServiceScheduleStore.delete(s.id)));
          showToast('Schedules for the week deleted successfully.', 'success');
          fetchData();
      } catch (err) {
          console.error(err);
          showToast('Failed to delete some schedules.', 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleDeleteSchedule = async (e: React.MouseEvent, id: string, deptName: string) => {
      e.stopPropagation();
      const confirmed = await confirm(`Are you sure you want to delete the schedule for ${deptName}? This cannot be undone.`, {
          title: 'Delete Schedule',
          confirmText: 'Delete',
          isDestructive: true
      });
      if (!confirmed) return;
      
      try {
          const res = await ServiceScheduleStore.delete(id);
          if (res.status === 'success') {
              showToast('Schedule deleted successfully.', 'success');
              fetchData();
          } else {
              showToast(res.message || 'Failed to delete schedule.', 'error');
          }
      } catch (err) {
          console.error(err);
          showToast('An error occurred while deleting the schedule.', 'error');
      }
  };

  // Group schedules by Week
  const groupedByWeek = useMemo<Record<string, ServiceSchedule[]>>(() => {
    const groups: Record<string, ServiceSchedule[]> = {};
    schedules.forEach(s => {
       if (!groups[s.weekStart]) groups[s.weekStart] = [];
       groups[s.weekStart].push(s);
    });
    // Sort weeks descending (newest week first)
    return Object.fromEntries(
       Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    ) as Record<string, ServiceSchedule[]>;
  }, [schedules]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Global Service Schedules</h1>
          <p className="text-gray-500">Review weekly schedules and rosters created by all departments.</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-3 w-full xl:w-auto">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
            <input 
              type="text" 
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-40 bg-gray-50 text-gray-500 cursor-not-allowed outline-none" 
              placeholder="Auto-generated" 
              value={newTitle}
              readOnly
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Week Start (Mon)</label>
            <input 
              type="date" 
              className="px-3 py-2 border rounded-lg text-sm w-40" 
              value={newWeekStart}
              onChange={e => {
                  const val = e.target.value;
                  setNewWeekStart(val);
                  if (val) {
                      const d = new Date(val);
                      const month = d.toLocaleString('default', { month: 'long' });
                      const week = Math.ceil(d.getDate() / 7);
                      setNewTitle(`${month} Week ${week}`);
                  }
              }}
              step="7"
              min={getCurrentMonday()}
            />
          </div>
          <button 
            className="bg-ministry-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
            onClick={handleGenerate}
            disabled={isGenerating || !newTitle || !newWeekStart}
          >
            {isGenerating ? 'Generating...' : 'Generate Schedules'}
          </button>
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
            {Object.entries(groupedByWeek).map(([week, weekSchedulesList]) => {
                const weekSchedules = weekSchedulesList as ServiceSchedule[];
                const actualSubmittedCount = weekSchedules.filter(s => s.status !== 'Draft').length;
                const submittedDeptIds = new Set(weekSchedules.map(s => s.departmentId));
                const missingDepts = departments.filter(d => d.status.toLowerCase() === 'active' && !submittedDeptIds.has(d.id));
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
                                <h3 className="text-lg font-bold text-gray-800">Week of {formatDateOrdinal(week)}</h3>
                                <p className="text-sm font-medium mt-0.5 text-ministry-orange">
                                    {actualSubmittedCount === 0 ? 'No department has submitted' : `${actualSubmittedCount} Department${actualSubmittedCount !== 1 ? 's' : ''} Submitted`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    onClick={(e) => handleDeleteWeek(e, week, weekSchedules)}
                                    title="Delete all schedules for this week"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                    {isWeekExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                </div>
                            </div>
                        </div>

                        {/* 2. Expanded Week Content */}
                        {isWeekExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex flex-col gap-5">
                                
                                {/* Header Toggle for Missing Depts */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                        Generated Schedules
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
                                        {showMissingForWeek === week ? 'Hide Missing' : `${missingDepts.length} Missing Schedule${missingDepts.length !== 1 ? 's' : ''}`}
                                    </button>
                                </div>

                                {/* Missing Departments Panel */}
                                {showMissingForWeek === week && (
                                    <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-5 mb-2 animate-in slide-in-from-top-2 duration-300">
                                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Schedules Not Generated ({missingDepts.length})
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
                                                <div className="flex items-center gap-2 p-1">
                                                    <button 
                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                        onClick={(e) => handleDeleteSchedule(e, schedule.id, schedule.departmentName || 'Unknown Dept')}
                                                        title="Delete schedule"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex items-center justify-center">
                                                        {expandedScheduleId === schedule.id ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                    </div>
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
