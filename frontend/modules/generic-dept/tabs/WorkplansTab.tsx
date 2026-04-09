import React, { useEffect, useState, useCallback } from 'react';
import { Department, MonthlyWorkplan, WorkplanActivity, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { WorkplanStore } from '../../../database/workplanStore';
import { getWorkplanNextAction } from '../../../domain/workplanRules';
import { useNotification } from '../../../components/ui/NotificationSystem';
import Badge, { statusVariant } from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDate } from '../../../shared/formatters';
import { ClipboardList, Plus, X, ChevronDown, ChevronUp, Trash2, Pencil } from 'lucide-react';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

// ─── Blank activity row ────────────────────────────────────────────────────────

const blankActivity = (): Partial<WorkplanActivity> => ({
    activity: '', item: '', objective: '', dateNeeded: '', duration: 'Once',
    unitCost: 0, quantity: 1, totalAmount: 0, departmentalContribution: '',
});

// ─── New Workplan Form ────────────────────────────────────────────────────────

interface NewWorkplanFormProps {
    department: Department;
    onSaved: () => void;
    onCancel: () => void;
}

const DURATION_OPTIONS = ['Once', 'Monthly', 'Weekly', 'Quarterly', 'Annually'];

// Hides the native up/down spinner on number inputs
const NO_SPINNER = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const NewWorkplanForm: React.FC<NewWorkplanFormProps> = ({ department, onSaved, onCancel }) => {
    const { showToast } = useNotification();
    const [saving, setSaving]         = useState(false);
    const [title, setTitle]           = useState('');
    const [month, setMonth]           = useState('');
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const [activities, setActivities] = useState<Partial<WorkplanActivity>[]>([blankActivity()]);

    const addRow = () => setActivities(a => [...a, blankActivity()]);
    const removeRow = (i: number) => setActivities(a => a.filter((_, idx) => idx !== i));

    const updateRow = (i: number, field: keyof WorkplanActivity, value: string | number) => {
        setActivities(prev => prev.map((row, idx) => {
            if (idx !== i) return row;
            const updated = { ...row, [field]: value };
            // Auto-calculate total when unit cost or quantity changes
            if (field === 'unitCost' || field === 'quantity') {
                const uc = field === 'unitCost' ? Number(value) : Number(row.unitCost ?? 0);
                const qty = field === 'quantity' ? Number(value) : Number(row.quantity ?? 1);
                updated.totalAmount = uc * qty;
            }
            return updated;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !month) { showToast('Title and month are required.', 'error'); return; }
        const filledActivities = activities.filter(a => a.activity?.trim()) as WorkplanActivity[];
        if (filledActivities.length === 0) { showToast('Add at least one activity with a name.', 'error'); return; }
        setSaving(true);
        const res = await WorkplanStore.create({
            departmentId: department.id,
            title: title.trim(),
            month,
            objectives: `Submitted: ${today}`,
            activities: filledActivities,
        });
        setSaving(false);
        if (res.status === 'success') { showToast('Workplan created!', 'success'); onSaved(); }
        else showToast(res.message ?? 'Failed to create workplan', 'error');
    };

    const grandTotal = activities.reduce((sum, r) => sum + Number(r.totalAmount ?? 0), 0);

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">New Monthly Activity Work Plan</h3>
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Meta fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange/30"
                        placeholder="e.g. April 2026 Workplan" required />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Month *</label>
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange/30"
                        required />
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border border-gray-100">
                <div><span className="text-gray-400 font-medium">Manifest Centre:</span> <span className="text-gray-700">Entebbe</span></div>
                <div><span className="text-gray-400 font-medium">Department:</span> <span className="text-gray-700">{department.name}</span></div>
                {month && <div><span className="text-gray-400 font-medium">Month:</span> <span className="text-gray-700">{new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span></div>}
                <div><span className="text-gray-400 font-medium">Date of Submission:</span> <span className="text-gray-700 font-semibold">{today}</span></div>
            </div>

            {/* Activities — card-per-row form */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activities</label>
                    <button type="button" onClick={addRow}
                        className="text-xs text-ministry-orange font-semibold flex items-center gap-1 hover:underline">
                        <Plus className="w-3 h-3" /> Add Activity
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {activities.map((row, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3">
                            {/* Card header */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-ministry-orange uppercase tracking-wide">
                                    Activity {i + 1}
                                </span>
                                {activities.length > 1 && (
                                    <button type="button" onClick={() => removeRow(i)}
                                        className="text-gray-300 hover:text-red-500 transition-colors flex items-center gap-1 text-xs">
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                )}
                            </div>

                            {/* Row 1: Activity, Item, Objective */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">ACTIVITY</label>
                                    <input value={row.activity ?? ''} onChange={e => updateRow(i, 'activity', e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30"
                                        placeholder="e.g. System development" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">ITEM</label>
                                    <input value={row.item ?? ''} onChange={e => updateRow(i, 'item', e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30"
                                        placeholder="e.g. MTN 10Mbps Subscription" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">OBJECTIVE</label>
                                    <input value={row.objective ?? ''} onChange={e => updateRow(i, 'objective', e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30"
                                        placeholder="e.g. Internet for developers" />
                                </div>
                            </div>

                            {/* Row 2: Date Needed, Duration, Unit Cost, Qty, Total, Dept Contribution */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500">DATE NEEDED</label>
                                    <input type="date" value={row.dateNeeded ?? ''} onChange={e => updateRow(i, 'dateNeeded', e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">DURATION</label>
                                    <select value={row.duration ?? 'Once'} onChange={e => updateRow(i, 'duration', e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30">
                                        {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">UNIT COST</label>
                                    <input type="number" min={0} value={row.unitCost ?? 0}
                                        onChange={e => updateRow(i, 'unitCost', Number(e.target.value))}
                                        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                        onWheel={e => e.currentTarget.blur()}
                                        className={`border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30 text-right ${NO_SPINNER}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">QTY</label>
                                    <input type="number" min={1} value={row.quantity ?? 1}
                                        onChange={e => updateRow(i, 'quantity', Number(e.target.value))}
                                        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                        onWheel={e => e.currentTarget.blur()}
                                        className={`border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30 text-center ${NO_SPINNER}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">TOTAL AMOUNT</label>
                                    <div className="border border-ministry-orange/30 bg-orange-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 text-right">
                                        {Number(row.totalAmount ?? 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Departmental Contribution (full width) */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-500">DEPARTMENTAL CONTRIBUTION <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input value={row.departmentalContribution ?? ''} onChange={e => updateRow(i, 'departmentalContribution', e.target.value)}
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange/30 max-w-sm"
                                    placeholder="e.g. USD 20 or 50,000" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grand Total */}
                <div className="flex justify-end">
                    <div className="bg-ministry-orange/10 border border-ministry-orange/20 rounded-xl px-5 py-3 flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-700">GRAND TOTAL</span>
                        <span className="text-lg font-bold text-gray-900">{grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Cancel
                </button>
                <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create Workplan'}
                </button>
            </div>
        </form>
    );
};

// ─── Edit Workplan Form ────────────────────────────────────────────────────────

interface EditWorkplanFormProps {
    wp: MonthlyWorkplan;
    department: Department;
    onSaved: () => void;
    onCancel: () => void;
}

const EditWorkplanForm: React.FC<EditWorkplanFormProps> = ({ wp, department, onSaved, onCancel }) => {
    const { showToast } = useNotification();
    const [saving, setSaving]   = useState(false);
    const [title, setTitle]     = useState(wp.title);
    const [month, setMonth]     = useState(wp.month.substring(0, 7));
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const [activities, setActivities] = useState<Partial<WorkplanActivity>[]>(
        (wp.activities as Partial<WorkplanActivity>[]).length > 0
            ? (wp.activities as Partial<WorkplanActivity>[])
            : [blankActivity()]
    );

    const addRow    = () => setActivities(a => [...a, blankActivity()]);
    const removeRow = (i: number) => setActivities(a => a.filter((_, idx) => idx !== i));
    const updateRow = (i: number, field: keyof WorkplanActivity, value: string | number) => {
        setActivities(prev => prev.map((row, idx) => {
            if (idx !== i) return row;
            const updated = { ...row, [field]: value };
            if (field === 'unitCost' || field === 'quantity') {
                const uc  = field === 'unitCost'  ? Number(value) : Number(row.unitCost  ?? 0);
                const qty = field === 'quantity'  ? Number(value) : Number(row.quantity  ?? 1);
                updated.totalAmount = uc * qty;
            }
            return updated;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !month) { showToast('Title and month are required.', 'error'); return; }
        const filledActivities = activities.filter(a => a.activity?.trim()) as WorkplanActivity[];
        if (filledActivities.length === 0) { showToast('Add at least one activity with a name.', 'error'); return; }
        setSaving(true);
        const res = await WorkplanStore.update(wp.id, {
            title: title.trim(),
            objectives: `Submitted: ${today}`,
            activities: filledActivities,
        });
        setSaving(false);
        if (res.status === 'success') { showToast('Workplan updated!', 'success'); onSaved(); }
        else showToast(res.message ?? 'Failed to update workplan', 'error');
    };

    const grandTotal = activities.reduce((sum, r) => sum + Number(r.totalAmount ?? 0), 0);

    const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-blue-200 rounded-2xl p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-blue-500" />
                    <h3 className="text-base font-bold text-gray-900">Edit Workplan</h3>
                </div>
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. April 2026 Workplan" required />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Month *</label>
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputCls} required />
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 rounded-xl px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border border-blue-100">
                <div><span className="text-gray-400 font-medium">Manifest Centre:</span> <span className="text-gray-700">Entebbe</span></div>
                <div><span className="text-gray-400 font-medium">Department:</span> <span className="text-gray-700">{department.name}</span></div>
                {month && <div><span className="text-gray-400 font-medium">Month:</span> <span className="text-gray-700">{new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span></div>}
                <div><span className="text-gray-400 font-medium">Date of Submission:</span> <span className="font-semibold text-gray-700">{today}</span></div>
            </div>

            {/* Activities */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activities</label>
                    <button type="button" onClick={addRow} className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                        <Plus className="w-3 h-3" /> Add Activity
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {activities.map((row, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Activity {i + 1}</span>
                                {activities.length > 1 && (
                                    <button type="button" onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 transition-colors flex items-center gap-1 text-xs">
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">ACTIVITY</label>
                                    <input value={row.activity ?? ''} onChange={e => updateRow(i, 'activity', e.target.value)} className={inputCls} placeholder="e.g. System development" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">ITEM</label>
                                    <input value={row.item ?? ''} onChange={e => updateRow(i, 'item', e.target.value)} className={inputCls} placeholder="e.g. MTN 10Mbps Subscription" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">OBJECTIVE</label>
                                    <input value={row.objective ?? ''} onChange={e => updateRow(i, 'objective', e.target.value)} className={inputCls} placeholder="e.g. Internet for developers" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500">DATE NEEDED</label>
                                    <input type="date" value={row.dateNeeded ?? ''} onChange={e => updateRow(i, 'dateNeeded', e.target.value)} className={inputCls} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">DURATION</label>
                                    <select value={row.duration ?? 'Once'} onChange={e => updateRow(i, 'duration', e.target.value)} className={inputCls}>
                                        {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">UNIT COST</label>
                                    <input type="number" min={0} value={row.unitCost ?? 0}
                                        onChange={e => updateRow(i, 'unitCost', Number(e.target.value))}
                                        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                        onWheel={e => e.currentTarget.blur()}
                                        className={`${inputCls} text-right ${NO_SPINNER}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">QTY</label>
                                    <input type="number" min={1} value={row.quantity ?? 1}
                                        onChange={e => updateRow(i, 'quantity', Number(e.target.value))}
                                        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                        onWheel={e => e.currentTarget.blur()}
                                        className={`${inputCls} text-center ${NO_SPINNER}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">TOTAL AMOUNT</label>
                                    <div className="border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 text-right">
                                        {Number(row.totalAmount ?? 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-500">DEPARTMENTAL CONTRIBUTION <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input value={row.departmentalContribution ?? ''} onChange={e => updateRow(i, 'departmentalContribution', e.target.value)} className={`${inputCls} max-w-sm`} placeholder="e.g. USD 20 or 50,000" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-700">GRAND TOTAL</span>
                        <span className="text-lg font-bold text-gray-900">{grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

// ─── Expanded Workplan Detail ─────────────────────────────────────────────────

interface DetailProps { wp: MonthlyWorkplan; department: Department; }

const WorkplanDetail: React.FC<DetailProps> = ({ wp, department }) => {
    const activities = (wp.activities ?? []) as WorkplanActivity[];
    const grandTotal = activities.reduce((sum, a) => sum + Number(a.totalAmount ?? 0), 0);

    // Extract submission date from objectives field if stored there
    const submissionDate = wp.objectives?.startsWith('Submitted:')
        ? wp.objectives.replace('Submitted:', '').trim()
        : null;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Workplan Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Monthly Activity Work Plan</h3>
                        <p className="text-sm text-gray-500">{wp.title}</p>
                    </div>
                    <Badge label={wp.status} variant={statusVariant(wp.status) as any} dot />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-400 font-medium">MANIFEST CENTRE</p>
                        <p className="font-semibold text-gray-800">Entebbe</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-400 font-medium">DEPARTMENT</p>
                        <p className="font-semibold text-gray-800">{department.name}</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-400 font-medium">MONTH</p>
                        <p className="font-semibold text-gray-800">{formatDate(wp.month)}</p>
                    </div>
                    {submissionDate && (
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <p className="text-xs text-gray-400 font-medium">DATE OF SUBMISSION</p>
                            <p className="font-semibold text-gray-800">{submissionDate}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Activities Table */}
            {activities.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[800px]">
                        <thead>
                            <tr className="bg-ministry-orange text-white">
                                <th className="px-3 py-3 text-left font-semibold">S/N</th>
                                <th className="px-3 py-3 text-left font-semibold">ACTIVITY</th>
                                <th className="px-3 py-3 text-left font-semibold">ITEM</th>
                                <th className="px-3 py-3 text-left font-semibold">OBJECTIVE</th>
                                <th className="px-3 py-3 text-left font-semibold">DATE NEEDED</th>
                                <th className="px-3 py-3 text-left font-semibold">DURATION</th>
                                <th className="px-3 py-3 text-right font-semibold">UNIT COST</th>
                                <th className="px-3 py-3 text-right font-semibold">TOTAL AMOUNT</th>
                                <th className="px-3 py-3 text-left font-semibold">DEPT CONTRIBUTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activities.map((act, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                    <td className="px-3 py-3 font-medium text-gray-500">{i + 1}</td>
                                    <td className="px-3 py-3 text-gray-800 font-medium">{act.activity}</td>
                                    <td className="px-3 py-3 text-gray-600">{act.item}</td>
                                    <td className="px-3 py-3 text-gray-600">{act.objective}</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                                        {act.dateNeeded ? new Date(act.dateNeeded).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            act.duration === 'Monthly' ? 'bg-blue-100 text-blue-700'
                                            : act.duration === 'Once' ? 'bg-gray-100 text-gray-600'
                                            : act.duration === 'Weekly' ? 'bg-green-100 text-green-700'
                                            : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {act.duration}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right text-gray-700 font-medium">
                                        {Number(act.unitCost).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-gray-900">
                                        {Number(act.totalAmount).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600">
                                        {act.departmentalContribution || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-orange-50 border-t-2 border-ministry-orange/30">
                                <td colSpan={7} className="px-3 py-3 font-bold text-gray-700 text-right text-sm">GRAND TOTAL</td>
                                <td className="px-3 py-3 font-bold text-gray-900 text-right text-sm">{grandTotal.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No activities recorded for this workplan.</div>
            )}
        </div>
    );
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────

const WorkplansTab: React.FC<Props> = ({ department, user, deptRole, systemRole }) => {
    const { showToast } = useNotification();
    const [workplans, setWorkplans] = useState<MonthlyWorkplan[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showForm, setShowForm]   = useState(false);
    const [expanded, setExpanded]   = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await WorkplanStore.getByDepartment(department.id);
        if (res.status === 'success') setWorkplans(res.data);
        setLoading(false);
    }, [department.id]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (wp: MonthlyWorkplan) => {
        const action = getWorkplanNextAction(wp.status, deptRole, systemRole);
        if (!action) return;
        const res = await WorkplanStore.update(wp.id, { status: action.nextStatus });
        if (res.status === 'success') { showToast(`Workplan ${action.nextStatus.toLowerCase()}!`, 'success'); load(); }
        else showToast(res.message ?? 'Failed', 'error');
    };

    const canCreate = deptRole === 'HOD' || deptRole === 'Dept Admin' || deptRole === 'Dept Finance' ||
        ['Super Admin', 'Administrator', 'TeamLeader'].includes(systemRole ?? '');

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Monthly Workplans</h2>
                    <p className="text-sm text-gray-500">Financial activity work plans for {department.name}</p>
                </div>
                {canCreate && !showForm && (
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
                        <Plus className="w-4 h-4" />
                        New Workplan
                    </button>
                )}
            </div>

            {showForm && (
                <NewWorkplanForm
                    department={department}
                    onSaved={() => { setShowForm(false); load(); }}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {loading ? (
                <LoadingSpinner fullPage message="Loading workplans…" />
            ) : workplans.length === 0 ? (
                <EmptyState
                    title="No workplans yet"
                    message="Create your first monthly financial work plan to track department activities and budgets."
                    icon={ClipboardList}
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {workplans.map(wp => {
                        const isExpanded = expanded === wp.id;
                        const action = getWorkplanNextAction(wp.status, deptRole, systemRole);
                        const activities = (wp.activities ?? []) as WorkplanActivity[];
                        const grandTotal = activities.reduce((s, a) => s + Number(a.totalAmount ?? 0), 0);

                        return (
                            <div key={wp.id} className="flex flex-col gap-3">
                                {/* Row card */}
                                <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-gray-300 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                            onClick={() => setExpanded(isExpanded ? null : wp.id)}
                                            className="flex items-center gap-2 text-gray-800 font-semibold hover:text-ministry-orange transition-colors text-left"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                                            <span className="truncate">{wp.title}</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <span className="text-sm text-gray-500 hidden md:block">{formatDate(wp.month)}</span>
                                        {grandTotal > 0 && (
                                            <span className="text-sm font-bold text-gray-800 hidden md:block">
                                                {grandTotal.toLocaleString()}
                                            </span>
                                        )}
                                        <Badge label={wp.status} variant={statusVariant(wp.status) as any} dot />
                                        {wp.status === 'Draft' && canCreate && (
                                            <button
                                                onClick={() => { setExpanded(wp.id); setEditingId(editingId === wp.id ? null : wp.id); }}
                                                className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap">
                                                <Pencil className="w-3 h-3" /> Edit
                                            </button>
                                        )}
                                        {action && (
                                            <button onClick={() => handleAction(wp)}
                                                className="text-xs bg-ministry-orange/10 text-ministry-orange px-3 py-1.5 rounded-lg font-semibold hover:bg-ministry-orange/20 whitespace-nowrap">
                                                {action.label}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded: edit form or read-only detail */}
                                {isExpanded && (
                                    editingId === wp.id
                                        ? <EditWorkplanForm
                                            wp={wp}
                                            department={department}
                                            onSaved={() => { setEditingId(null); load(); }}
                                            onCancel={() => setEditingId(null)}
                                          />
                                        : <WorkplanDetail wp={wp} department={department} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WorkplansTab;
