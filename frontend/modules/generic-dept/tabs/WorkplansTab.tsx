import React, { useEffect, useState, useCallback } from 'react';
import { Department, MonthlyWorkplan, WorkplanActivity, WorkplanItem, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { WorkplanStore } from '../../../database/workplanStore';
import { useNotification } from '../../../components/ui/NotificationSystem';
import Badge, { statusVariant } from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDate } from '../../../shared/formatters';
import { ClipboardList, Plus, X, ChevronDown, ChevronUp, Trash2, CheckCircle2, XCircle, Settings2 } from 'lucide-react';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

// ─── Blank activity row (for create) ──────────────────────────────────────────
const blankActivity = (): any => ({
    activity: '', item: '', objective: '', dateNeeded: '', duration: 'Once',
    unitCost: '' as any, quantity: '' as any, totalAmount: 0, deptContribution: '' as any,
});

// ─── New Workplan Populate Form ────────────────────────────────────────────────────────
interface PopulateWorkplanFormProps { workplan: MonthlyWorkplan; department: Department; onSaved: () => void; onCancel: () => void; }
const DURATION_OPTIONS = ['Once', 'Monthly', 'Weekly', 'Quarterly', 'Annually'];
const NO_SPINNER = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const PopulateWorkplanForm: React.FC<PopulateWorkplanFormProps> = ({ workplan, department, onSaved, onCancel }) => {
    const { showToast } = useNotification();
    const [saving, setSaving]         = useState(false);
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const initialActivities = (!workplan.items || workplan.items.length === 0)
        ? [blankActivity()]
        : workplan.items.map(i => ({
            ...blankActivity(),
            id: i.id,
            status: i.status,
            adminComment: i.adminComment,
            tlComment: i.tlComment,
            activity: i.activity,
            item: i.item || '',
            objective: i.objective || '',
            dateNeeded: i.dateNeeded || '',
            duration: i.duration || 'Once',
            deptContribution: i.deptContribution || ('' as any),
            quantity: i.quantity || ('' as any),
            totalAmount: (Number(i.unitCost || 0) * Number(i.quantity || 1)) || Number(i.amount),
            unitCost: i.unitCost || (i.quantity ? (Number(i.amount) / Number(i.quantity)) : ('' as any))
        }));
    const [activities, setActivities] = useState<any[]>(initialActivities);

    const addRow = () => setActivities(a => [...a, blankActivity()]);
    const removeRow = (i: number) => setActivities(a => a.filter((_, idx) => idx !== i));
    const updateRow = (i: number, field: string, value: string | number) => {
        setActivities(prev => prev.map((row, idx) => {
            if (idx !== i) return row;
            const updated = { ...row, [field]: value };
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
        const filledActivities = activities.filter(a => a.activity?.trim());
        if (filledActivities.length === 0) { showToast('Add at least one activity with a name.', 'error'); return; }
        setSaving(true);
        const payloadActivities = filledActivities.map(a => {
            return {
                id: a.id,
                name: a.activity,
                item: a.item,
                objective: a.objective,
                date_needed: a.dateNeeded,
                duration: a.duration,
                unit_cost: a.unitCost || 0,
                dept_contribution: a.deptContribution || 0,
                quantity: a.quantity || 1,
                amount: a.totalAmount // Send Gross Request to Backend securely
            };
        });
        const res = await WorkplanStore.populateDraft(workplan.id, payloadActivities);
        setSaving(false);
        if (res.status === 'success') { showToast('Workplan populated!', 'success'); onSaved(); }
        else showToast(res.message ?? 'Failed to populate workplan', 'error');
    };

    const grandTotal = activities.reduce((sum, r) => sum + Number(r.totalAmount ?? 0), 0);
    const grandRequested = activities.reduce((sum, r) => sum + Math.max(0, Number(r.totalAmount ?? 0) - Number(r.deptContribution ?? 0)), 0);

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Populate Monthly Activity Work Plan</h3>
                    <p className="text-sm text-gray-500 font-medium">{workplan.title} ({formatDate(workplan.month)})</p>
                </div>
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activities</label>
                    <button type="button" onClick={addRow} className="text-xs text-ministry-orange font-semibold flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add Activity</button>
                </div>
                <div className="flex flex-col gap-3">
                    {activities.map((row, i) => (
                        <div key={i} className={`border rounded-xl p-4 flex flex-col gap-3 transition-all ${row.adminComment ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-ministry-orange uppercase tracking-wide">
                                        Activity {i + 1}
                                        { (row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED') && (
                                            <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px]">APPROVED</span>
                                        )}
                                    </span>
                                    {activities.length > 1 && row.status !== 'ADMIN_APPROVED' && row.status !== 'TL_APPROVED' && (
                                        <button type="button" onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 flex items-center gap-1 text-xs"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                                    )}
                                </div>
                                {row.adminComment && (
                                    <div className="text-xs text-red-700 bg-red-100/50 p-2 rounded flex items-start gap-1 font-medium italic border border-red-100">
                                        "{row.adminComment}"
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">ACTIVITY</label>
                                    <input required disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} value={row.activity ?? ''} onChange={e => updateRow(i, 'activity', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="e.g. System development" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">ITEM</label>
                                    <input required disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} value={row.item ?? ''} onChange={e => updateRow(i, 'item', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="e.g. MTN 10 Mbps" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">OBJECTIVE</label>
                                    <input required disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} value={row.objective ?? ''} onChange={e => updateRow(i, 'objective', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="e.g. To allow internet access" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mt-1 relative">
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500">DATE NEEDED</label>
                                    <input type="date" required disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} value={row.dateNeeded ?? ''} onChange={e => updateRow(i, 'dateNeeded', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">DURATION</label>
                                    <select required disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} value={row.duration ?? 'Once'} onChange={e => updateRow(i, 'duration', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500">
                                        {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">UNIT COST</label>
                                    <input type="text" inputMode="numeric" disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} required value={row.unitCost ? Number(row.unitCost).toLocaleString('en-US') : ''} onChange={e => {
                                        const raw = e.target.value.replace(/,/g, '');
                                        if (/^\d*$/.test(raw)) updateRow(i, 'unitCost', raw === '' ? '' : Number(raw));
                                    }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-right disabled:bg-gray-100 disabled:text-gray-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">QTY</label>
                                    <input type="text" inputMode="numeric" disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} required value={row.quantity ? Number(row.quantity).toLocaleString('en-US') : ''} onChange={e => {
                                        const raw = e.target.value.replace(/,/g, '');
                                        if (/^\d*$/.test(raw)) updateRow(i, 'quantity', raw === '' ? '' : Number(raw));
                                    }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-center disabled:bg-gray-100 disabled:text-gray-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500" title="Departmental Contribution">DEPT CONTRIB</label>
                                    <input type="text" inputMode="numeric" disabled={row.status === 'ADMIN_APPROVED' || row.status === 'TL_APPROVED'} value={row.deptContribution ? Number(row.deptContribution).toLocaleString('en-US') : ''} onChange={e => {
                                        const raw = e.target.value.replace(/,/g, '');
                                        if (/^\d*$/.test(raw)) updateRow(i, 'deptContribution', raw === '' ? '' : Number(raw));
                                    }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-right disabled:bg-gray-100 disabled:text-gray-500" placeholder="Optional" />
                                </div>
                                <div className="flex flex-col gap-1 p-1 bg-gray-50 border border-gray-200 rounded-lg justify-center relative">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase absolute -top-2 left-2 bg-white px-1">TOTAL</label>
                                    <div className="text-sm font-bold text-gray-600 text-right pr-2 mt-1">{Number(row.totalAmount ?? 0).toLocaleString()}</div>
                                </div>
                                <div className="flex flex-col gap-1 p-1 bg-green-50 border border-green-200 rounded-lg justify-center relative">
                                    <label className="text-[10px] font-bold text-green-700 uppercase absolute -top-2 left-2 bg-white px-1 whitespace-nowrap">TO REQUEST</label>
                                    <div className="text-sm font-bold text-gray-900 text-right pr-2 mt-1">{Math.max(0, Number(row.totalAmount ?? 0) - Number(row.deptContribution ?? 0)).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-4 mr-4">
                        <span className="text-sm font-semibold text-gray-500">CUMULATIVE TOTAL</span>
                        <span className="text-sm font-bold text-gray-600">{grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-4">
                        <span className="text-sm font-semibold text-green-800">TOTAL REQUEST AMOUNT</span>
                        <span className="text-lg font-bold text-gray-900">{grandRequested.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Activities'}</button>
            </div>
        </form>
    );
};

// ─── Expanded Workplan Detail (Item-Level Actions) ────────────────────────────

interface DetailProps { 
    wp: MonthlyWorkplan; 
    department: Department; 
    systemRole: string | undefined;
    deptRole: string | undefined;
    onReload: () => void;
    onEdit?: () => void;
}

const WorkplanDetail: React.FC<DetailProps> = ({ wp, department, systemRole, deptRole, onReload, onEdit }) => {
    const { showToast } = useNotification();
    const items = wp.items || [];
    const grandTotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0) - (Number(item.deptContribution) || 0)), 0);
    const approvedTotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.approvedAmount ?? Math.max(0, Number(item.amount) - (Number(item.deptContribution) || 0)))), 0);

    const isSystemAdmin = systemRole === 'Administrator' || systemRole === 'Super Admin';
    const isTeamLeader = systemRole === 'TeamLeader';
    const isHODorAdmin = deptRole === 'HOD' || deptRole === 'Dept Admin' || deptRole === 'Dept Finance';

    // Allow Admin Review actions if workplan is Submitted
    const canAdminAction = isSystemAdmin && !wp.isLocked && wp.status === 'Submitted';
    
    // Allow TL Review actions if workplan is TL_Review
    const canTLAction = isTeamLeader && !wp.isLocked && wp.status === 'TL_Review';

    const handleItemAction = async (item: WorkplanItem, role: 'ADMIN' | 'TL', decision: any, adjustPayload?: any) => {
        let res;
        if (role === 'ADMIN') {
            res = await WorkplanStore.processAdminDecision(wp.id, item.id, decision);
        } else {
            res = await WorkplanStore.processTLDecision(wp.id, item.id, decision, undefined, adjustPayload?.qty, adjustPayload?.amt);
        }
        
        if (res?.status === 'success') {
            showToast('Item status updated', 'success');
            onReload();
        } else {
            showToast(res?.message || 'Failed to update item', 'error');
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-3">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-400 font-medium">DEPARTMENT</p>
                        <p className="font-semibold text-gray-800">{department.name}</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-400 font-medium">MONTH</p>
                        <p className="font-semibold text-gray-800">{formatDate(wp.month)}</p>
                    </div>
                </div>
            </div>

            {items.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[800px]">
                        <thead>
                            <tr className="bg-ministry-orange text-white">
                                <th className="px-3 py-3 text-left font-semibold">S/N</th>
                                <th className="px-3 py-3 text-left font-semibold">ACTIVITY</th>
                                <th className="px-3 py-3 text-center font-semibold">QTY</th>
                                <th className="px-3 py-3 text-right font-semibold">COST</th>
                                <th className="px-3 py-3 text-right font-semibold">DEPT CONTR</th>
                                <th className="px-3 py-3 text-right font-semibold">BALANCE</th>
                                <th className="px-3 py-3 text-center font-semibold">APP. QTY</th>
                                <th className="px-3 py-3 text-right font-semibold">APP. BALANCE</th>
                                <th className="px-3 py-3 text-center font-semibold">STATUS</th>
                                <th className="px-3 py-3 text-left font-semibold">SYSTEM ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, i) => (
                                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                    <td className="px-3 py-4 font-medium text-gray-500">{i + 1}</td>
                                    <td className="px-3 py-4 text-gray-800 font-medium">{item.activity}</td>
                                    <td className="px-3 py-4 text-gray-700 text-center">{item.quantity}</td>
                                    <td className="px-3 py-4 text-gray-700 font-medium text-right">{Number(item.amount || 0).toLocaleString()}</td>
                                    <td className="px-3 py-4 text-gray-500 font-medium text-right">{Number(item.deptContribution || 0).toLocaleString()}</td>
                                    <td className="px-3 py-4 text-gray-800 font-bold text-right">{Math.max(0, Number(item.amount) - (Number(item.deptContribution) || 0)).toLocaleString()}</td>
                                    <td className="px-3 py-4 text-gray-700 text-center">{item.approvedQuantity ?? item.quantity}</td>
                                    <td className="px-3 py-4 text-gray-700 font-bold text-right text-green-700">{Math.max(0, Number(item.approvedAmount ?? Math.max(0, Number(item.amount) - (Number(item.deptContribution) || 0)))).toLocaleString()}</td>
                                    <td className="px-3 py-4 text-center">
                                        <Badge label={item.status} variant={statusVariant(item.status) as any} />
                                    </td>
                                    <td className="px-3 py-4">
                                        <div className="flex items-center gap-2">
                                            {canAdminAction && item.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => handleItemAction(item, 'ADMIN', 'ADMIN_APPROVED')} className="text-green-600 bg-green-50 p-1.5 rounded hover:bg-green-100" title="Approve">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleItemAction(item, 'ADMIN', 'ADMIN_REJECTED')} className="text-red-600 bg-red-50 p-1.5 rounded hover:bg-red-100" title="Reject">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {isHODorAdmin && ['ADMIN_REJECTED', 'TL_REJECTED'].includes(item.status) && (
                                                <button onClick={() => {
                                                    if (onEdit) onEdit();
                                                }} className="text-blue-600 bg-blue-50 p-1.5 rounded hover:bg-blue-100" title="Edit Rejected Item">
                                                    <Settings2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canTLAction && ['ADMIN_APPROVED', 'PENDING'].includes(item.status) && (
                                                <>
                                                    <button onClick={() => handleItemAction(item, 'TL', 'TL_APPROVED')} className="text-green-600 bg-green-50 p-1.5 rounded hover:bg-green-100" title="TL Approve">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => {
                                                        const newAmt = prompt("Enter adjusted amount:", item.amount.toString());
                                                        if (newAmt && !isNaN(Number(newAmt))) {
                                                            handleItemAction(item, 'TL', 'TL_ADJUSTED', { amt: Number(newAmt) });
                                                        }
                                                    }} className="text-blue-600 bg-blue-50 p-1.5 rounded hover:bg-blue-100" title="TL Adjust">
                                                        <Settings2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleItemAction(item, 'TL', 'TL_REJECTED')} className="text-red-600 bg-red-50 p-1.5 rounded hover:bg-red-100" title="TL Reject">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {!canAdminAction && !canTLAction && (
                                                <span className="text-gray-400 italic text-[10px]">No Actions</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-orange-50 border-t-2 border-ministry-orange/30">
                                <td colSpan={3} className="px-3 py-3 font-bold text-gray-700 text-right text-sm">REQUESTED TOTAL</td>
                                <td className="px-3 py-3 font-bold text-gray-900 text-right text-sm">{grandTotal.toLocaleString()}</td>
                                <td className="px-3 py-3 font-bold text-gray-700 text-right text-sm">APPROVED TOTAL</td>
                                <td className="px-3 py-3 font-bold text-green-700 text-right text-sm">{approvedTotal.toLocaleString()}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No items recorded for this workplan.</div>
            )}
        </div>
    );
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────

const WorkplansTab: React.FC<Props> = ({ department, user, deptRole, systemRole }) => {
    const { showToast } = useNotification();
    const [workplans, setWorkplans] = useState<MonthlyWorkplan[]>([]);
    const [loading, setLoading]     = useState(true);
    const [populatingWp, setPopulatingWp] = useState<MonthlyWorkplan | null>(null);
    const [expanded, setExpanded]   = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await WorkplanStore.getByDepartment(department.id);
        if (res.status === 'success') setWorkplans(res.data);
        setLoading(false);
    }, [department.id]);

    useEffect(() => { load(); }, [load]);

    const handleWorkflowTransition = async (wp: MonthlyWorkplan, actionType: 'submit' | 'finalize' | 'delete' | 'resubmit') => {
        let res;
        switch(actionType) {
            case 'submit': res = await WorkplanStore.submit(wp.id); break;
            case 'finalize': res = await WorkplanStore.finalize(wp.id); break;
            case 'delete': res = await WorkplanStore.delete(wp.id); break;
            case 'resubmit': res = await WorkplanStore.resubmitWorkplan(wp.id); break;
        }
        if (res?.status === 'success') { showToast(`Action successful`, 'success'); load(); }
        else showToast(res?.message ?? 'Failed to execute', 'error');
    };

    const isHODorAdmin = deptRole === 'HOD' || deptRole === 'Dept Admin' || deptRole === 'Dept Finance';
    const isSystemAdmin = systemRole === 'Administrator' || systemRole === 'Super Admin';
    const isTeamLeader = systemRole === 'TeamLeader';

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Monthly Workplans</h2>
                    <p className="text-sm text-gray-500">Wait for System Admin to generate the draft for the month, then populate it.</p>
                </div>
            </div>

            {populatingWp && (
                <PopulateWorkplanForm
                    workplan={populatingWp}
                    department={department}
                    onSaved={() => { setPopulatingWp(null); load(); }}
                    onCancel={() => setPopulatingWp(null)}
                />
            )}

            {loading ? (
                <LoadingSpinner fullPage message="Loading workplans…" />
            ) : workplans.length === 0 ? (
                <EmptyState title="No workplans yet" message="Create your first monthly financial work plan to track department activities and budgets." icon={ClipboardList} />
            ) : (
                <div className="flex flex-col gap-3">
                    {workplans.map(wp => {
                        const isExpanded = expanded === wp.id;
                        const items = wp.items || [];
                        const grandTotal = items.reduce((s, a) => s + Number(a.amount ?? 0), 0);

                        return (
                            <div key={wp.id} className="flex flex-col gap-0">
                                <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-gray-300 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button onClick={() => setExpanded(isExpanded ? null : wp.id)} className="flex items-center gap-2 text-gray-800 font-semibold hover:text-ministry-orange transition-colors text-left">
                                            {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                                            <span className="truncate">{wp.title}</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <span className="text-sm text-gray-500 hidden md:block">{formatDate(wp.month)}</span>
                                        {grandTotal > 0 && <span className="text-sm font-bold text-gray-800 hidden md:block">{grandTotal.toLocaleString()}</span>}
                                        <Badge label={wp.isLocked ? wp.status + ' (Locked)' : wp.status} variant={statusVariant(wp.status) as any} dot />
                                        
                                        {!wp.isLocked && wp.status === 'Draft' && isHODorAdmin && (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); setPopulatingWp(wp); }} className="text-xs bg-ministry-orange text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-orange-600 whitespace-nowrap">
                                                    {items.length === 0 ? 'Populate Items' : 'Edit Workplan'}
                                                </button>
                                                {items.length > 0 && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleWorkflowTransition(wp, 'submit'); }} className="text-xs bg-ministry-orange/10 text-ministry-orange px-3 py-1.5 rounded-lg font-semibold hover:bg-ministry-orange/20 whitespace-nowrap">Submit</button>
                                                )}
                                            </div>
                                        )}

                                        {!wp.isLocked && items.some(i => ['ADMIN_REJECTED', 'TL_REJECTED'].includes(i.status)) && isHODorAdmin && (
                                            <button onClick={() => handleWorkflowTransition(wp, 'resubmit')} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 whitespace-nowrap">Resubmit Edits</button>
                                        )}

                                        {!wp.isLocked && wp.status === 'TL_Review' && isTeamLeader && (
                                            <button onClick={() => handleWorkflowTransition(wp, 'finalize')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-100 whitespace-nowrap">Finalize & Generate Requisitions</button>
                                        )}
                                    </div>
                                </div>
                                {isExpanded && <WorkplanDetail wp={wp} department={department} systemRole={systemRole} deptRole={deptRole as any} onReload={load} onEdit={() => setPopulatingWp(wp)} />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WorkplansTab;
