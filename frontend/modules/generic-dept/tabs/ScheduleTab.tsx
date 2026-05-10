import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Department, ServiceSchedule, DeptChurchMember, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { ServiceScheduleStore } from '../../../database/serviceScheduleStore';
import { DeptChurchMemberStore } from '../../../database/deptChurchMemberStore';
import { canEditSchedule, canPublishSchedule, isSchedulePublishable } from '../../../domain/scheduleRules';
import { useNotification } from '../../../components/ui/NotificationSystem';
import Badge, { statusVariant } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { formatDate, formatDayLabel } from '../../../shared/formatters';
import {
    Plus, Send, Trash2, ChevronDown, ChevronUp,
    Users, CheckCircle2, Search, X, Calendar, Clock, Pencil
} from 'lucide-react';
import SubmissionStatusWidget from '../../../components/SubmissionStatusWidget';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

// ─────────────────────────────────────────────────────────────────────────────
// MemberPicker — fixed-position dropdown that escapes overflow-hidden parents
// ─────────────────────────────────────────────────────────────────────────────
interface MemberPickerProps {
    teamMembers: DeptChurchMember[];
    value: string;
    selectedId: string | undefined;
    onChange: (name: string, memberId?: string) => void;
    placeholder?: string;
}

const MemberPicker: React.FC<MemberPickerProps> = ({ teamMembers, value, selectedId, onChange, placeholder }) => {
    const [open, setOpen]       = useState(false);
    const [warn, setWarn]       = useState(false);
    const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRef              = useRef<HTMLInputElement>(null);
    const containerRef          = useRef<HTMLDivElement>(null);
    const didSelectRef          = useRef(false);

    const filtered = value.trim().length >= 1
        ? teamMembers.filter(m =>
            (m.memberName ?? '').toLowerCase().includes(value.toLowerCase()) ||
            (m.servingRole ?? '').toLowerCase().includes(value.toLowerCase())
          )
        : teamMembers;

    const openDrop = () => {
        if (!inputRef.current) return;
        const r = inputRef.current.getBoundingClientRect();
        setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
        setOpen(true);
    };

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
    }, [open]);

    return (
        <div ref={containerRef} className="relative flex-1">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                {selectedId
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    : <Search className="w-3.5 h-3.5 text-gray-400" />}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                autoComplete="off"
                onFocus={openDrop}
                onClick={openDrop}
                onChange={e => { setWarn(false); didSelectRef.current = false; onChange(e.target.value, undefined); openDrop(); }}
                onBlur={() => {
                    // Give onMouseDown on a list item time to fire first
                    setTimeout(() => {
                        if (!didSelectRef.current && value.trim() && !selectedId) {
                            // User typed something but never selected — clear it
                            onChange('', undefined);
                            setWarn(true);
                        }
                        setOpen(false);
                    }, 150);
                }}
                placeholder={placeholder ?? (teamMembers.length > 0 ? `Search ${teamMembers.length} members…` : 'Member name')}
                className={`w-full border rounded-lg pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    selectedId
                        ? 'border-green-400 bg-green-50 focus:ring-green-200'
                        : 'border-gray-200 focus:ring-blue-200'
                }`}
            />
            {value && (
                <button type="button" onClick={() => { onChange('', undefined); setOpen(false); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                </button>
            )}

            {open && filtered.length > 0 && dropPos && (
                <ul style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
                    className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto max-h-52">
                    {filtered.map(m => (
                        <li key={m.id}
                            onMouseDown={e => { e.preventDefault(); didSelectRef.current = true; setWarn(false); onChange(m.memberName ?? '', m.memberId); setOpen(false); }}
                            className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 cursor-pointer gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                    {(m.memberName ?? '?')[0]}
                                </div>
                                <span className="text-sm font-medium text-gray-800 truncate">{m.memberName}</span>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">{m.servingRole}</span>
                        </li>
                    ))}
                </ul>
            )}
            {open && filtered.length === 0 && value.trim().length >= 1 && dropPos && (
                <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
                    className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-sm text-gray-500">
                    No team member matches "<strong>{value}</strong>"
                </div>
            )}
            {warn && (
                <p className="text-xs text-amber-600 mt-1">⚠ Select a member from the list — free text is not accepted</p>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TimePicker — clock-style 24h hour/minute selector
// ─────────────────────────────────────────────────────────────────────────────
interface TimePickerProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_H  = 36;
const COL_H   = 180;

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, placeholder, className }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos]   = useState<{ top: number; left: number } | null>(null);
    const triggerRef      = useRef<HTMLButtonElement>(null);
    const panelRef        = useRef<HTMLDivElement>(null);
    const hourRef         = useRef<HTMLDivElement>(null);
    const minRef          = useRef<HTMLDivElement>(null);

    const parts = value ? value.split(':') : [];
    const selH  = parts[0] ?? '';
    const selM  = parts[1] ?? '';

    const openPicker = () => {
        if (!triggerRef.current) return;
        const r       = triggerRef.current.getBoundingClientRect();
        const PANEL_H = COL_H + 115;
        const top = r.bottom + 4 + PANEL_H > window.innerHeight
            ? r.top - PANEL_H - 4
            : r.bottom + 4;
        setPos({ top, left: r.left });
        setOpen(true);
    };

    // Scroll to selected values after panel mounts
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            if (hourRef.current) {
                const idx = selH ? parseInt(selH, 10) : 0;
                hourRef.current.scrollTop = idx * ITEM_H - COL_H / 2 + ITEM_H / 2;
            }
            if (minRef.current) {
                const idx = selM ? parseInt(selM, 10) : 0;
                minRef.current.scrollTop = idx * ITEM_H - COL_H / 2 + ITEM_H / 2;
            }
        }, 20);
        return () => clearTimeout(t);
    }, [open]);

    // Close only when clicking OUTSIDE the panel AND trigger
    useEffect(() => {
        if (!open) return;
        const handle = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node)) return;
            if (panelRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    const pick = (h: string, m: string) => {
        onChange(`${h !== '' ? h : (selH || '00')}:${m !== '' ? m : (selM || '00')}`);
    };

    const colStyle: React.CSSProperties = {
        height: COL_H,
        overflowY: 'scroll',
        borderRadius: 10,
        border: '1px solid #f0f0f0',
        background: '#fafafa',
    };

    return (
        <div className={`relative ${className ?? ''}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={open ? () => setOpen(false) : openPicker}
                className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm transition-colors focus:outline-none whitespace-nowrap ${
                    value
                        ? 'border-blue-300 bg-blue-50 text-blue-800 font-medium'
                        : 'border-gray-200 text-gray-400'
                }`}
            >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{value || (placeholder ?? 'Arrival time')}</span>
            </button>

            {open && pos && (
                <div
                    ref={panelRef}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
                    className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 w-44"
                >
                    <p className="text-[11px] font-bold text-gray-400 text-center tracking-widest uppercase">24-hour</p>

                    <div className="flex gap-2 items-start">
                        {/* Hours */}
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-semibold text-gray-400 mb-1">HH</span>
                            <div ref={hourRef} style={colStyle}>
                                {HOURS.map(h => (
                                    <div
                                        key={h}
                                        onClick={() => pick(h, '')}
                                        style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        className={`text-sm font-medium cursor-pointer select-none transition-colors rounded-lg mx-0.5 ${
                                            selH === h ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-blue-50'
                                        }`}
                                    >
                                        {h}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-gray-300 text-xl font-light pt-7">:</div>

                        {/* Minutes */}
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-semibold text-gray-400 mb-1">MM</span>
                            <div ref={minRef} style={colStyle}>
                                {MINUTES.map(m => (
                                    <div
                                        key={m}
                                        onClick={() => pick('', m)}
                                        style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        className={`text-sm font-medium cursor-pointer select-none transition-colors rounded-lg mx-0.5 ${
                                            selM === m ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-blue-50'
                                        }`}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        {value && (
                            <button
                                onClick={() => { onChange(''); }}
                                className="flex-1 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-xl py-1.5 hover:bg-red-50 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            className="flex-1 bg-gray-900 text-white text-xs font-semibold rounded-xl py-1.5 hover:bg-gray-700 transition-colors"
                        >
                            {value ? `✓ ${value}` : 'Done'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


interface DraftMember { _key: string; role: string; memberName: string; memberId?: string; }
const newMember   = (): DraftMember  => ({ _key: crypto.randomUUID(), role: '', memberName: '', memberId: undefined });

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleTab
// ─────────────────────────────────────────────────────────────────────────────
const ScheduleTab: React.FC<Props> = ({ department, user, deptRole, systemRole }) => {
    const { showToast, confirm } = useNotification();
    const canEdit    = canEditSchedule(deptRole, systemRole);
    const canPublish = canPublishSchedule(deptRole, systemRole);

    const [schedules, setSchedules]     = useState<ServiceSchedule[]>([]);
    const [teamMembers, setTeamMembers] = useState<DeptChurchMember[]>([]);
    const [loading, setLoading]         = useState(true);
    const [expanded, setExpanded]       = useState<string | null>(null);
    const [rosterSessionId, setRosterSessionId] = useState<string | null>(null);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editWeekStart, setEditWeekStart] = useState('');

    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editSessionLabel, setEditSessionLabel] = useState('');
    const [editSessionDate, setEditSessionDate] = useState('');
    const [editArrivalTime, setEditArrivalTime] = useState('');

    // ── Adding sessions inline ──────────────────────────────────────────────────
    const [addingSessionScheduleId, setAddingSessionScheduleId] = useState<string | null>(null);
    const [newSessionLabel, setNewSessionLabel] = useState('');
    const [newSessionDate, setNewSessionDate] = useState('');
    const [newSessionArrival, setNewSessionArrival] = useState('');
    const [savingNewSession, setSavingNewSession] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [schedRes, teamRes] = await Promise.all([
            ServiceScheduleStore.getByDepartment(department.id),
            DeptChurchMemberStore.getByDepartment(department.id),
        ]);
        if (schedRes.status === 'success') setSchedules(schedRes.data);
        if (teamRes.status === 'success')  setTeamMembers(teamRes.data);
        setLoading(false);
    }, [department.id]);

    useEffect(() => { load(); }, [load]);



    // ── Adding sessions inline handler ───────────────────────────────────────
    const handleAddSession = async (scheduleId: string) => {
        if (!newSessionLabel.trim() || !newSessionDate || !newSessionArrival.trim()) {
            showToast('All session fields are required', 'error'); return;
        }
        setSavingNewSession(true);
        const res = await ServiceScheduleStore.addSession(scheduleId, {
            sessionLabel: newSessionLabel.trim(),
            sessionDate: newSessionDate,
            arrivalTime: newSessionArrival.trim(),
        });
        setSavingNewSession(false);
        if (res.status === 'success') {
            showToast('Session added!', 'success');
            setAddingSessionScheduleId(null);
            setNewSessionLabel(''); setNewSessionDate(''); setNewSessionArrival('');
            load();
        } else {
            showToast(res.message, 'error');
        }
    };

    // ── Other handlers ───────────────────────────────────────────────────────
    const handlePublish = async (scheduleId: string, sess: any[]) => {
        if (!isSchedulePublishable(sess)) {
            showToast('Add at least one session with an assignment before publishing.', 'error'); return;
        }
        const res = await ServiceScheduleStore.update(scheduleId, { status: 'Published' });
        if (res.status === 'success') { showToast('Published!', 'success'); load(); }
        else showToast(res.message, 'error');
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm('Delete this schedule and all its sessions?');
        if (!ok) return;
        const res = await ServiceScheduleStore.delete(id);
        if (res.status === 'success') { showToast('Schedule deleted', 'success'); load(); }
        else showToast(res.message, 'error');
    };

    const handleSaveEdit = async (id: string) => {
        if (!editTitle.trim() || !editWeekStart) {
            showToast('Title and Week Start are required', 'error');
            return;
        }
        const res = await ServiceScheduleStore.update(id, { title: editTitle.trim(), weekStart: editWeekStart });
        if (res.status === 'success') {
            showToast('Schedule updated', 'success');
            setEditingScheduleId(null);
            load();
        } else {
            showToast(res.message, 'error');
        }
    };

    const handleSaveSessionEdit = async (scheduleId: string, sessionId: string) => {
        if (!editSessionLabel.trim() || !editSessionDate || !editArrivalTime.trim()) {
            showToast('All session fields are required', 'error');
            return;
        }
        const res = await ServiceScheduleStore.updateSession(scheduleId, sessionId, {
            sessionLabel: editSessionLabel.trim(),
            sessionDate: editSessionDate,
            arrivalTime: editArrivalTime.trim(),
        });
        if (res.status === 'success') {
            showToast('Session updated', 'success');
            setEditingSessionId(null);
            load();
        } else {
            showToast(res.message, 'error');
        }
    };

    // Save extra assignments to an existing session
    const handleSaveRoster = async (sessionId: string, rows: Array<{ role: string; memberName: string; memberId?: string }>) => {
        let ok = 0;
        for (const row of rows) {
            const res = await ServiceScheduleStore.addAssignment(sessionId, {
                roleLabel: row.role, ministerName: row.memberName, memberId: row.memberId,
            });
            if (res.status === 'success') ok++;
        }
        showToast(`${ok} assignment${ok !== 1 ? 's' : ''} saved`, ok > 0 ? 'success' : 'error');
        setRosterSessionId(null);
        load();
    };

    if (loading) return <LoadingSpinner fullPage message="Loading schedules…" />;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-5">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Service Schedules</h2>
                    {teamMembers.length > 0 && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3.5 h-3.5" />
                            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} available
                        </p>
                    )}
                </div>
            </div>

            <SubmissionStatusWidget type="schedule" periodId={schedules[0]?.weekStart ?? ''} />

            {/* ── Schedule list ───────────────────────────────────────────── */}
            {schedules.length === 0 ? <EmptyState variant="schedule" /> : (
                <div className="flex flex-col gap-4">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">

                            {/* Schedule header */}
                            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 rounded-2xl"
                                onClick={() => {
                                   if (expanded === schedule.id) {
                                       setExpanded(null); setEditingScheduleId(null);
                                   } else {
                                       setExpanded(schedule.id);
                                   }
                                }}>
                                <div className="flex items-center gap-3">
                                    <Badge label={schedule.status} variant={statusVariant(schedule.status)} dot />
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{schedule.title}</p>
                                        <p className="text-xs text-gray-400">Week of {formatDate(schedule.weekStart)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canPublish && schedule.status === 'Draft' && (
                                        <button onClick={e => { e.stopPropagation(); handlePublish(schedule.id, schedule.sessions ?? []); }}
                                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200 flex items-center gap-1">
                                            <Send className="w-3.5 h-3.5" /> Publish
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button onClick={e => { e.stopPropagation(); handleDelete(schedule.id); }}
                                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {expanded === schedule.id
                                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                            </div>

                            {/* Sessions */}
                            {expanded === schedule.id && (
                                <div className="border-t border-gray-100">
                                    {/* Editable Info Section */}
                                    {canEdit && editingScheduleId === schedule.id ? (
                                        <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex gap-3 flex-wrap items-end" onClick={e => e.stopPropagation()}>
                                            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Title</label>
                                                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Week Start</label>
                                                <input type="date" value={editWeekStart} onChange={e => setEditWeekStart(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingScheduleId(null)} className="text-gray-500 text-xs hover:bg-gray-200 px-3 py-2 rounded-lg font-semibold">Cancel</button>
                                                <button onClick={() => handleSaveEdit(schedule.id)} className="bg-gray-900 text-white text-xs hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold">Save Info</button>
                                            </div>
                                        </div>
                                    ) : (
                                        canEdit && (
                                            <div className="px-5 py-2 border-b border-gray-100 flex justify-end">
                                                <button onClick={e => {
                                                    e.stopPropagation();
                                                    setEditTitle(schedule.title);
                                                    setEditWeekStart(schedule.weekStart);
                                                    setEditingScheduleId(schedule.id);
                                                }} className="text-xs text-blue-600 font-semibold hover:underline border border-transparent hover:bg-blue-50 px-2 py-1 rounded">Edit Schedule Info</button>
                                            </div>
                                        )
                                    )}

                                    {(schedule.sessions ?? []).length === 0 && (
                                        <p className="px-5 py-4 text-sm text-gray-400">No sessions yet.</p>
                                    )}
                                    {(schedule.sessions ?? []).map(session => (
                                        <div key={session.id} className="px-5 py-4 border-b border-gray-50 last:border-b-0">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    {canEdit && editingSessionId === session.id ? (
                                                        <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm" onClick={e => e.stopPropagation()}>
                                                            <div className="flex flex-wrap gap-2">
                                                                <input type="text" value={editSessionLabel} onChange={e => setEditSessionLabel(e.target.value)} placeholder="Label" className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1 min-w-[150px]" />
                                                                <input type="date" value={editSessionDate} onChange={e => setEditSessionDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                                                                <TimePicker value={editArrivalTime} onChange={setEditArrivalTime} placeholder="Arrival" />
                                                            </div>
                                                            <div className="flex gap-2 justify-end mt-1">
                                                                <button onClick={() => setEditingSessionId(null)} className="text-gray-500 text-xs hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold">Cancel</button>
                                                                <button onClick={() => handleSaveSessionEdit(schedule.id, session.id)} className="bg-blue-600 text-white text-xs hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold">Save Session</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="group flex items-start gap-2">
                                                            <div>
                                                                <p className="font-semibold text-gray-700 text-sm">{session.sessionLabel}</p>
                                                                <p className="text-xs text-gray-400">{formatDayLabel(session.sessionDate)} · Arrive by {session.arrivalTime}</p>
                                                            </div>
                                                            {canEdit && (
                                                                <button onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditSessionLabel(session.sessionLabel);
                                                                    setEditSessionDate(session.sessionDate);
                                                                    setEditArrivalTime(session.arrivalTime);
                                                                    setEditingSessionId(session.id);
                                                                }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Session Info">
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {canEdit && rosterSessionId !== session.id && editingSessionId !== session.id && (
                                                    <button onClick={() => setRosterSessionId(session.id)}
                                                        className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100">
                                                        <Users className="w-3.5 h-3.5" /> + Members
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline roster adder for existing sessions */}
                                            {rosterSessionId === session.id && (
                                                <InlineRosterAdder
                                                    sessionId={session.id}
                                                    teamMembers={teamMembers}
                                                    onSave={handleSaveRoster}
                                                    onClose={() => setRosterSessionId(null)}
                                                />
                                            )}

                                            {/* Assignment table */}
                                            {(session.assignments ?? []).length > 0 ? (
                                                <div className="rounded-xl overflow-hidden border border-gray-100 mt-2">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-gray-50 border-b border-gray-100">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Role</th>
                                                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Member</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {session.assignments!.map(a => (
                                                                <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                                                    <td className="px-3 py-2.5 text-gray-500 font-medium">{a.roleLabel}</td>
                                                                    <td className="px-3 py-2.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                                                {(a.ministerName ?? '?')[0]}
                                                                            </div>
                                                                            <span className="text-gray-800">{a.ministerName}</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : !rosterSessionId && (
                                                <p className="text-xs text-gray-400 italic mt-1">No members assigned yet — click "+ Members"</p>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Session UI */}
                                    {canEdit && (
                                        <div className="px-5 py-3 bg-white">
                                            {addingSessionScheduleId === schedule.id ? (
                                                <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm" onClick={e => e.stopPropagation()}>
                                                    <p className="text-xs font-bold text-gray-700 mb-1">Add New Session</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <input type="text" value={newSessionLabel} onChange={e => setNewSessionLabel(e.target.value)} placeholder="Label (e.g. Sunday Service)" className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1 min-w-[150px]" />
                                                        <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                                                        <TimePicker value={newSessionArrival} onChange={setNewSessionArrival} placeholder="Arrival" />
                                                    </div>
                                                    <div className="flex gap-2 justify-end mt-1">
                                                        <button onClick={() => { setAddingSessionScheduleId(null); setNewSessionLabel(''); setNewSessionDate(''); setNewSessionArrival(''); }} className="text-gray-500 text-xs hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold">Cancel</button>
                                                        <button onClick={() => handleAddSession(schedule.id)} disabled={savingNewSession} className="bg-blue-600 text-white text-xs hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                                                            {savingNewSession ? 'Adding...' : 'Add Session'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAddingSessionScheduleId(schedule.id);
                                                    setNewSessionLabel(''); setNewSessionDate(''); setNewSessionArrival('');
                                                }} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-blue-200 w-full justify-center">
                                                    <Plus className="w-3.5 h-3.5" /> Add Session
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helper: add extra member assignments to an existing session
// ─────────────────────────────────────────────────────────────────────────────
interface InlineRosterAdderProps {
    sessionId: string;
    teamMembers: DeptChurchMember[];
    onSave: (sessionId: string, rows: Array<{ role: string; memberName: string; memberId?: string }>) => Promise<void>;
    onClose: () => void;
}

const InlineRosterAdder: React.FC<InlineRosterAdderProps> = ({ sessionId, teamMembers, onSave, onClose }) => {
    const [rows, setRows]   = useState<DraftMember[]>([newMember()]);
    const [saving, setSaving] = useState(false);

    const update = (key: string, patch: Partial<DraftMember>) =>
        setRows(rs => rs.map(r => r._key === key ? { ...r, ...patch } : r));

    const valid = rows.filter(r => r.role.trim() && r.memberName.trim());

    const handleSave = async () => {
        if (valid.length === 0) return;
        setSaving(true);
        await onSave(sessionId, valid.map(r => ({ role: r.role, memberName: r.memberName, memberId: r.memberId })));
        setSaving(false);
    };

    return (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 mb-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">Add Members</p>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
                <span className="text-xs font-semibold text-gray-400">Role</span>
                <span className="text-xs font-semibold text-gray-400">Member</span>
                <span className="w-5" />
            </div>
            {rows.map(row => (
                <div key={row._key} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input type="text" value={row.role}
                        onChange={e => update(row._key, { role: e.target.value })}
                        placeholder="e.g. Worship Leader"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                    <MemberPicker teamMembers={teamMembers} value={row.memberName} selectedId={row.memberId}
                        onChange={(name, id) => update(row._key, { memberName: name, memberId: id })} />
                    <button onClick={() => setRows(rs => rs.length > 1 ? rs.filter(r => r._key !== row._key) : rs)}
                        className="text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
            ))}
            <button onClick={() => setRows(rs => [...rs, newMember()])}
                className="self-start text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add another
            </button>
            <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving || valid.length === 0}
                    className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-gray-700">
                    {saving ? 'Saving…' : `Save ${valid.length || ''}`}
                </button>
                <button onClick={onClose} className="text-gray-400 text-xs px-3 py-1.5 hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>
        </div>
    );
};

export default ScheduleTab;
