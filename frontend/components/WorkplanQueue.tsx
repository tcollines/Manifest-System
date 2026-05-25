import React, { useEffect, useState, useCallback } from 'react';
import { MonthlyWorkplan, Department } from '../types';
import { WorkplanStore } from '../database/workplanStore';
import { useNotification } from './ui/NotificationSystem';
import Badge, { statusVariant } from './ui/Badge';
import LoadingSpinner from './ui/LoadingSpinner';
import EmptyState from './ui/EmptyState';
import { formatDate } from '../shared/formatters';
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle2, XCircle, Settings2, Trash2, MessageCircle } from 'lucide-react';

interface Props { 
    systemRole: any;
    // For global mapping, we receive a flattened structure and do not bind to specific department
}

const WorkplanQueue: React.FC<Props> = ({ systemRole }) => {
    const { showToast } = useNotification();
    const [workplans, setWorkplans] = useState<MonthlyWorkplan[]>([]);
    const [loading, setLoading]     = useState(true);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
    const [expandedDept, setExpandedDept]   = useState<string | null>(null);
    const [expandedItem, setExpandedItem]   = useState<string | null>(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    
    const [rejectionModalItem, setRejectionModalItem] = useState<{ wpId: string, itemId: string } | null>(null);
    const [itemModalConfig, setItemModalConfig] = useState<{ isOpen: boolean, mode: 'add' | 'edit', initialData?: any, wpId?: string, itemId?: string, actor?: 'admin' | 'tl', availableWorkplans?: any[] }>({ isOpen: false, mode: 'add' });

    const load = useCallback(async () => {
        setLoading(true);
        const res = await WorkplanStore.getAllGlobal();
        if (res.status === 'success') {
            setWorkplans(res.data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const isFinance = ['Dept Finance', 'Finance', 'Head of Dept', 'HOD', 'Dept Admin'].includes(systemRole);
    const isStrictAdmin = systemRole === 'Administrator' || systemRole === 'Super Admin';
    const isSystemAdmin = isStrictAdmin || isFinance;
    const isTeamLeader = systemRole === 'TeamLeader';

    const groupedWorkplans = React.useMemo(() => {
        const groups: Record<string, { month: string, title: string, workplans: MonthlyWorkplan[], totalCost: number }> = {};
        workplans.forEach(wp => {
            // Finance should only see workplans that have passed Admin approval (TL_Review or Finalized)
            if (isFinance && !isStrictAdmin) {
                if (!['TL_Review', 'Finalized'].includes(wp.status as string)) return;
            }

            const key = `${wp.title}|${wp.month}`;
            if (!groups[key]) groups[key] = { month: wp.month, title: wp.title, workplans: [], totalCost: 0 };
            groups[key].workplans.push(wp);
            
            const validItems = isTeamLeader 
                ? (wp.items || []).filter(a => !['PENDING', 'RESUBMITTED'].includes(a.status as string))
                : (wp.items || []);
            groups[key].totalCost += validItems.reduce((s, a) => s + Math.max(0, Number(a.amount ?? 0) - (Number(a.deptContribution) || 0)), 0);
        });
        
        // Filter out groups that ended up with no workplans after the Finance filter
        return Object.values(groups)
            .filter(g => {
                if (g.workplans.length > 0) {
                    g.workplans.sort((a, b) => {
                        const aIsDraft = a.status === 'Draft' ? 1 : 0;
                        const bIsDraft = b.status === 'Draft' ? 1 : 0;
                        if (aIsDraft !== bIsDraft) return aIsDraft - bIsDraft;

                        const dateA = new Date((a as any).updatedAt || (a as any).createdAt || 0).getTime();
                        const dateB = new Date((b as any).updatedAt || (b as any).createdAt || 0).getTime();
                        return dateB - dateA;
                    });
                    return true;
                }
                return false;
            })
            .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
    }, [workplans, isFinance, isStrictAdmin]);

    const handleDeleteMonth = async (monthDate: string, title: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete ALL drafts for ${title}? This cannot be undone.`)) {
            const drafts = workplans.filter(w => w.month === monthDate && w.title === title && w.status === 'Draft');
            let success = 0;
            for (const wp of drafts) {
                const res = await WorkplanStore.deleteWorkplan(wp.id);
                if (res && res.status === 'success') success++;
            }
            if (success > 0) {
                showToast(`Deleted ${success} drafts successfully`, 'success');
                load();
            }
        }
    };

    const handleFinalizeMonth = async (groupWorkplans: MonthlyWorkplan[], e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to finalize all evaluated departments?`)) {
            let success = 0;
            for (const wp of groupWorkplans) {
                if (wp.status === 'TL_Review') {
                    const res = await WorkplanStore.finalize(wp.id);
                    if (res && res.status === 'success') success++;
                }
            }
            showToast(`Finalized ${success} departments`, 'success');
            load();
        }
    };

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mt-20">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Global Workplan Queue</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Centralized processing for Admin and Team Leader approvals</p>
                </div>
                {isSystemAdmin && (
                    <button 
                        onClick={() => setShowGenerateModal(true)}
                        className="bg-ministry-orange hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                        + Generate Monthly Workplans
                    </button>
                )}
            </div>

            {showGenerateModal && (
                <GlobalWorkplanModal 
                    onClose={() => setShowGenerateModal(false)}
                    onSuccess={() => { setShowGenerateModal(false); load(); }}
                />
            )}

            {loading ? (
                <LoadingSpinner fullPage message="Loading global queue…" />
            ) : groupedWorkplans.length === 0 ? (
                <EmptyState title="Queue Empty" message="There are no workplans pending approval." icon={ClipboardList} />
            ) : (
                <div className="flex flex-col gap-4">
                    {groupedWorkplans.map(group => {
                        const isMonthExpanded = expandedMonth === `${group.title}|${group.month}`;
                        const flatItems = group.workplans.flatMap(wp => (wp.items || []).map(item => ({...item, wp})));

                        return (
                            <div key={`${group.title}|${group.month}`} className="flex flex-col shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                                {/* MASTER CARD HEADER */}
                                <div className="bg-white px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                     onClick={() => setExpandedMonth(isMonthExpanded ? null : `${group.title}|${group.month}`)}>
                                    <div className="flex items-center gap-3">
                                        {isMonthExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">{group.title}</h3>
                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{formatDate(group.month)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Global Budget</p>
                                            <p className="text-lg font-black text-gray-800">{group.totalCost.toLocaleString()}</p>
                                        </div>
                                        {isStrictAdmin && (
                                            <button onClick={(e) => handleDeleteMonth(group.month, group.title, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent" title="Delete Entire Month Drafts">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* EXPANDED VIEW AREA */}
                                {isMonthExpanded && (
                                    <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6 shadow-inner">
                                        
                                        {/* TEAM LEADER FLAT VIEW */}
                                        {isTeamLeader && (
                                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-xs tracking-wide">
                                                            <th className="px-4 py-3 text-left">DEPARTMENT</th>
                                                            <th className="px-4 py-3 text-left">ACTIVITY</th>
                                                            <th className="px-4 py-3 text-center">QTY</th>
                                                            <th className="px-4 py-3 text-right">COST</th>
                                                            <th className="px-4 py-3 text-right">DEPT CONTR</th>
                                                            <th className="px-4 py-3 text-right">BALANCE</th>
                                                            <th className="px-4 py-3 text-right">ACTIONS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {(() => {
                                                            const validItems = flatItems.filter(item => 
                                                                ['TL_Review', 'Finalized'].includes(item.wp.status as string) && 
                                                                !['PENDING', 'RESUBMITTED'].includes(item.status as string)
                                                            );
                                                            
                                                            if (validItems.length === 0) {
                                                                return <tr><td colSpan={7} className="text-center py-6 text-gray-500">No items available for review.</td></tr>;
                                                            }
                                                            
                                                            const itemsByDept = validItems.reduce((acc, item) => {
                                                                const dept = item.wp.departmentName;
                                                                if (!acc[dept]) acc[dept] = [];
                                                                acc[dept].push(item);
                                                                return acc;
                                                            }, {} as Record<string, typeof validItems>);
                                                            
                                                            return Object.entries(itemsByDept).flatMap(([deptName, rawItems]) => {
                                                                const items = rawItems as typeof validItems;
                                                                const rows = items.map(item => {
                                                                    const canTLAct = item.wp.status === 'TL_Review' && ['ADMIN_APPROVED', 'TL_APPROVED', 'TL_ADJUSTED', 'TL_REJECTED'].includes(item.status);
                                                                    const processAction = async (decision: any, adj?: any) => {
                                                                        await WorkplanStore.processTLDecision(item.wp.id, item.id, decision, undefined, adj);
                                                                        load();
                                                                    };
                                                                    
                                                                    return (
                                                                        <tr key={item.id} className="hover:bg-gray-50/50">
                                                                            <td className="px-4 py-3">
                                                                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{deptName}</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 font-medium text-gray-800">{item.activity}</td>
                                                                            <td className="px-4 py-3 text-center text-gray-500">{item.approvedQuantity ?? item.quantity}</td>
                                                                            <td className="px-4 py-3 text-right font-semibold text-gray-700">{Number(item.amount || 0).toLocaleString()}</td>
                                                                            <td className="px-4 py-3 text-right text-gray-500 font-semibold">{Number(item.deptContribution || 0).toLocaleString()}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-gray-800">{Number(item.approvedAmount ?? Math.max(0, Number(item.amount) - (Number(item.deptContribution) || 0))).toLocaleString()}</td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <div className="flex items-center justify-end gap-3">
                                                                                    {item.status !== 'ADMIN_APPROVED' && (
                                                                                        <Badge label={item.status.replace('TL_', '').replace('_', ' ')} variant={statusVariant(item.status) as any} />
                                                                                    )}
                                                                                    {canTLAct ? (
                                                                                        <div className={`flex items-center gap-1 ${item.status !== 'ADMIN_APPROVED' ? 'border-l pl-3 border-gray-200' : ''}`}>
                                                                                            <button onClick={() => processAction('TL_APPROVED')} className="text-green-600 bg-green-50 p-1.5 rounded hover:bg-green-100 transition-colors" title="Approve Item"><CheckCircle2 className="w-4 h-4" /></button>
                                                                                            <button onClick={() => setItemModalConfig({ isOpen: true, mode: 'edit', initialData: item, wpId: item.wp.id, itemId: item.id, actor: 'tl' })} className="text-blue-600 bg-blue-50 p-1.5 rounded hover:bg-blue-100 transition-colors" title="Edit Item"><Settings2 className="w-4 h-4" /></button>
                                                                                            <button onClick={() => processAction('TL_REJECTED')} className="text-red-600 bg-red-50 p-1.5 rounded hover:bg-red-100 transition-colors" title="Reject Item"><XCircle className="w-4 h-4" /></button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-xs text-gray-400 ml-auto">-</span>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                });

                                                                const deptCost = items.reduce((s, a) => s + Number(a.amount || 0), 0);
                                                                const deptContr = items.reduce((s, a) => s + Number(a.deptContribution || 0), 0);
                                                                const deptBalance = items.reduce((s, a) => s + Number(a.approvedAmount ?? Math.max(0, Number(a.amount) - (Number(a.deptContribution) || 0))), 0);

                                                                rows.push(
                                                                    <tr key={`${deptName}-total`} className="bg-gray-50 border-y border-gray-200">
                                                                        <td colSpan={3} className="px-4 py-3 text-right font-black uppercase text-xs text-gray-700 tracking-wider bg-gray-100/50">{deptName} TOTAL</td>
                                                                        <td className="px-4 py-3 text-right font-black text-gray-800 bg-gray-100/50">{deptCost.toLocaleString()}</td>
                                                                        <td className="px-4 py-3 text-right font-bold text-gray-600 bg-gray-100/50">{deptContr.toLocaleString()}</td>
                                                                        <td className="px-4 py-3 text-right font-black text-blue-900 bg-gray-100/50">{deptBalance.toLocaleString()}</td>
                                                                        <td className="bg-gray-100/50"></td>
                                                                    </tr>
                                                                );
                                                                return rows;
                                                            });
                                                        })()}
                                                        {group.workplans.some(w => w.status === 'TL_Review') && (
                                                            <tr>
                                                                <td colSpan={7} className="px-4 py-3 bg-white border-t border-gray-100">
                                                                    <button 
                                                                        onClick={() => setItemModalConfig({ isOpen: true, mode: 'add', actor: 'tl', availableWorkplans: group.workplans.filter(w => w.status === 'TL_Review') })}
                                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                                                                    >
                                                                        + Add Ad-hoc Item
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* ADMIN NESTED VIEW */}
                                        {isSystemAdmin && (
                                            <div className="flex flex-col gap-3">
                                                {group.workplans.map(wp => {
                                                    const isDeptExpanded = expandedDept === wp.id;
                                                    const items = wp.items || [];
                                                    const deptTotal = items.reduce((s, a) => s + Math.max(0, Number(a.amount ?? 0) - (Number(a.deptContribution) || 0)), 0);
                                                    
                                                    const pendingCount = items.filter(i => ['PENDING', 'RESUBMITTED'].includes(i.status as string)).length;
                                                    const isAdminPhase = ['Admin_Review', 'Submitted'].includes(wp.status as string);
                                                    const canCompleteReview = isAdminPhase && pendingCount === 0;

                                                    const handleCompleteReview = async (e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        await WorkplanStore.completeAdminReview(wp.id);
                                                        load();
                                                    };

                                                    return (
                                                        <div key={wp.id} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                            <div className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                                                 onClick={() => setExpandedDept(isDeptExpanded ? null : wp.id)}>
                                                                <div className="flex items-center gap-3">
                                                                    {isDeptExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                                    <span className="font-bold text-gray-800">{wp.departmentName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    {deptTotal > 0 && <span className="text-sm font-black text-gray-700">{deptTotal.toLocaleString()}</span>}
                                                                    <Badge label={wp.isLocked ? wp.status + ' (Locked)' : wp.status} variant={statusVariant(wp.status) as any} dot />
                                                                    {isAdminPhase && (
                                                                        <button 
                                                                            onClick={handleCompleteReview} 
                                                                            disabled={!canCompleteReview}
                                                                            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${canCompleteReview ? 'bg-ministry-orange text-white hover:bg-orange-600 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                                                                        >
                                                                            {canCompleteReview ? 'Complete Evaluation' : `Review items (${pendingCount} left)`}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {isDeptExpanded && (
                                                                <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                                                                    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                                                        <table className="w-full text-sm">
                                                                            <thead>
                                                                                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs tracking-wide">
                                                                                    <th className="px-4 py-3 text-left w-6"></th>
                                                                                    <th className="px-2 py-3 text-left">ITEM</th>
                                                                                    <th className="px-4 py-3 text-left">OBJECTIVE</th>
                                                                                    <th className="px-4 py-3 text-right">COST</th>
                                                                                    <th className="px-4 py-3 text-right">DEPT CONTR</th>
                                                                                    <th className="px-4 py-3 text-right">BALANCE</th>
                                                                                    <th className="px-4 py-3 text-center">STATUS</th>
                                                                                    <th className="px-4 py-3 text-right">ACTIONS</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100">
                                                                                {items.length === 0 ? (
                                                                                    <tr><td colSpan={7} className="text-center py-4 text-gray-500 text-xs">No items</td></tr>
                                                                                ) : items.map(item => {
                                                                                    const canAdminAct = isAdminPhase && ['PENDING', 'RESUBMITTED'].includes(item.status);
                                                                                    const isItemExpanded = expandedItem === item.id;
                                                                                    const processAction = async (decision: any, e?: React.MouseEvent) => {
                                                                                        if (e) e.stopPropagation();
                                                                                        if (decision === 'ADMIN_REJECTED') {
                                                                                            setRejectionModalItem({ wpId: wp.id, itemId: item.id });
                                                                                            return;
                                                                                        }
                                                                                        await WorkplanStore.processAdminDecision(wp.id, item.id, decision);
                                                                                        load();
                                                                                    };

                                                                                    return (
                                                                                        <React.Fragment key={item.id}>
                                                                                            <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedItem(isItemExpanded ? null : item.id)}>
                                                                                                <td className="px-4 py-3 text-gray-400">
                                                                                                    {isItemExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                                                </td>
                                                                                                <td className="px-2 py-3 font-medium text-gray-800">{item.item || '-'}</td>
                                                                                                <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{item.objective || '-'}</td>
                                                                                                <td className="px-4 py-3 text-right font-semibold text-gray-700">{Number(item.amount || 0).toLocaleString()}</td>
                                                                                                <td className="px-4 py-3 text-right text-gray-500">{Number(item.deptContribution ?? 0).toLocaleString()}</td>
                                                                                                <td className="px-4 py-3 text-right font-bold text-gray-800">{Math.max(0, Number(item.amount) - (Number(item.deptContribution) || 0)).toLocaleString()}</td>
                                                                                                <td className="px-4 py-3 text-center">
                                                                                                    <Badge label={item.status} variant={statusVariant(item.status) as any} />
                                                                                                </td>
                                                                                                <td className="px-4 py-3">
                                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                                        {canAdminAct ? (
                                                                                                            <>
                                                                                                                <button onClick={(e) => processAction('ADMIN_APPROVED', e)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg border border-transparent hover:border-green-200 transition-all"><CheckCircle2 className="w-4 h-4" /></button>
                                                                                                                <button onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    setItemModalConfig({ isOpen: true, mode: 'edit', initialData: item, wpId: wp.id, itemId: item.id });
                                                                                                                }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg border border-transparent hover:border-blue-200 transition-all"><Settings2 className="w-4 h-4" /></button>
                                                                                                                <button onClick={(e) => processAction('ADMIN_REJECTED', e)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-all"><XCircle className="w-4 h-4" /></button>
                                                                                                            </>
                                                                                                        ) : (
                                                                                                            <span className="text-xs text-gray-400 ml-auto">-</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                            {isItemExpanded && (
                                                                                                <tr className="bg-gray-50/80 shadow-inner">
                                                                                                    <td colSpan={7} className="px-6 py-4">
                                                                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-xs text-gray-600">
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <span className="font-semibold text-gray-400 uppercase tracking-widest text-[10px]">Activity</span>
                                                                                                                <span className="font-medium text-gray-900 text-sm">{item.activity}</span>
                                                                                                            </div>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <span className="font-semibold text-gray-400 uppercase tracking-widest text-[10px]">Date Needed</span>
                                                                                                                <span className="font-medium text-gray-900">{item.dateNeeded ? formatDate(item.dateNeeded) : '-'}</span>
                                                                                                            </div>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <span className="font-semibold text-gray-400 uppercase tracking-widest text-[10px]">Duration</span>
                                                                                                                <span className="font-medium text-gray-900">{item.duration || 'Once'}</span>
                                                                                                            </div>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <span className="font-semibold text-gray-400 uppercase tracking-widest text-[10px]">Unit Cost</span>
                                                                                                                <span className="font-medium text-gray-900">{Number(item.unitCost ?? 0).toLocaleString()}</span>
                                                                                                            </div>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <span className="font-semibold text-gray-400 uppercase tracking-widest text-[10px]">Quantity</span>
                                                                                                                <span className="font-medium text-gray-900">{item.quantity}</span>
                                                                                                            </div>
                                                                                                            {item.adminComment && (
                                                                                                                <div className="flex flex-col gap-1 bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 col-span-2 md:col-span-1 shadow-sm">
                                                                                                                    <span className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1"><MessageCircle className="w-3 h-3"/> Rejection Reason</span>
                                                                                                                    <span className="text-xs italic">"{item.adminComment}"</span>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            )}
                                                                                        </React.Fragment>
                                                                                    )
                                                                                })}
                                                                                {isAdminPhase && (
                                                                                    <tr>
                                                                                        <td colSpan={7} className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                                                                                            <button 
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setItemModalConfig({ isOpen: true, mode: 'add', wpId: wp.id });
                                                                                                }}
                                                                                                className="text-xs font-bold text-ministry-blue hover:text-blue-800 transition-colors flex items-center gap-1"
                                                                                            >
                                                                                                + Add Ad-hoc Item
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {rejectionModalItem && (
                <RejectionModal 
                    isOpen={true} 
                    onClose={() => setRejectionModalItem(null)} 
                    onSubmit={async (comment) => {
                        await WorkplanStore.processAdminDecision(rejectionModalItem.wpId, rejectionModalItem.itemId, 'ADMIN_REJECTED', comment);
                        load();
                    }} 
                />
            )}

            {itemModalConfig.isOpen && (
                <WorkplanItemModal
                    isOpen={true}
                    mode={itemModalConfig.mode}
                    initialData={itemModalConfig.initialData}
                    availableWorkplans={itemModalConfig.availableWorkplans}
                    onClose={() => setItemModalConfig({...itemModalConfig, isOpen: false})}
                    onSubmit={async (payload) => {
                        let finalWpId = itemModalConfig.wpId || payload.wpId;
                        if (itemModalConfig.mode === 'add' && finalWpId) {
                            await WorkplanStore.addAdHocItem(finalWpId, payload);
                        } else if (itemModalConfig.mode === 'edit' && itemModalConfig.wpId && itemModalConfig.itemId) {
                            if (itemModalConfig.actor === 'tl') {
                                await WorkplanStore.processTLDecision(itemModalConfig.wpId, itemModalConfig.itemId, 'TL_ADJUSTED', undefined, payload);
                            } else {
                                await WorkplanStore.editRejectedItem(itemModalConfig.wpId, itemModalConfig.itemId, payload);
                            }
                        }
                        load();
                    }}
                />
            )}
        </div>
    );
};

const GlobalWorkplanModal: React.FC<{ onClose: () => void, onSuccess: () => void }> = ({ onClose, onSuccess }) => {
    const { showToast } = useNotification();
    const [title, setTitle] = useState('');
    const [month, setMonth] = useState('');
    const [objectives, setObjectives] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await WorkplanStore.generateGlobalWorkplans({ title, month, objectives });
        setSaving(false);
        if (res.status === 'success') {
            showToast((res as any).message || (res.data as any)?.message || 'Workplans generated!', 'success');
            onSuccess();
        } else {
            showToast(res.message || 'Generation failed', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
                <h3 className="text-lg font-black text-gray-900 mb-2">Generate Monthly Workplans</h3>
                <p className="text-sm text-gray-500 mb-6">This will automatically generate empty 'Draft' workplans for all active departments. If they already have a workplan for this month, they will be skipped (Sync safe).</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Global Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. May 2026 Workplan" className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-ministry-orange" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Month</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} required className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-ministry-orange" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Global Directive / Objectives (Optional)</label>
                        <textarea value={objectives} onChange={e => setObjectives(e.target.value)} rows={3} placeholder="Provide instructions or focus points for all departments..." className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-ministry-orange text-sm resize-none" />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-ministry-orange text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50">
                            {saving ? 'Generating...' : 'Generate Workplans'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkplanQueue;

const RejectionModal: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (comment: string) => Promise<void> }> = ({ isOpen, onClose, onSubmit }) => {
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSubmit(comment);
        setSaving(false);
        setComment('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="text-lg font-black text-red-600 mb-2 flex items-center gap-2"><XCircle className="w-5 h-5"/> Reject Item</h3>
                <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this item. This will be visible to the department.</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <textarea value={comment} onChange={e => setComment(e.target.value)} required rows={3} placeholder="Reason for rejection..." className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-500 text-sm resize-none" />
                    <div className="flex justify-end gap-2 mt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving || !comment.trim()} className="px-4 py-2 text-sm bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                            {saving ? 'Rejecting...' : 'Reject Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const WorkplanItemModal: React.FC<{ 
    isOpen: boolean; 
    initialData?: Partial<any>;
    availableWorkplans?: any[];
    onClose: () => void; 
    onSubmit: (payload: any) => Promise<void>; 
    mode: 'add' | 'edit';
}> = ({ isOpen, initialData, availableWorkplans, onClose, onSubmit, mode }) => {
    const [payload, setPayload] = useState<Partial<any>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const data = initialData || {};
            // For team leader global ad-hoc additions, default to first available workplan
            if (mode === 'add' && availableWorkplans && availableWorkplans.length > 0 && !data.wpId) {
                data.wpId = availableWorkplans[0].id;
            }
            setPayload(data);
        }
    }, [isOpen, initialData, availableWorkplans, mode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSubmit({ ...payload, amount: Number(payload.quantity || 0) * Number(payload.unitCost || 0) });
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl">
                <h3 className="text-lg font-black text-gray-900 mb-6">{mode === 'add' ? 'Add Ad-hoc Item' : 'Edit Item'}</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mode === 'add' && availableWorkplans && availableWorkplans.length > 0 && (
                            <div className="flex flex-col gap-1 text-sm md:col-span-2 mb-2">
                                <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Department</label>
                                <select value={payload.wpId || ''} onChange={e => setPayload({...payload, wpId: e.target.value})} required className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-bold text-gray-800">
                                    {availableWorkplans.map(wp => (
                                        <option key={wp.id} value={wp.id}>{wp.departmentName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-col gap-1 text-sm md:col-span-2">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Activity / Program</label>
                            <input value={payload.activity || ''} onChange={e => setPayload({...payload, activity: e.target.value})} required className="border border-gray-200 rounded-lg px-3 py-2" placeholder="e.g. First Timer Registration" />
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Item</label>
                            <input value={payload.item || ''} onChange={e => setPayload({...payload, item: e.target.value})} required className="border border-gray-200 rounded-lg px-3 py-2" placeholder="e.g. First timer cards" />
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Objective</label>
                            <input value={payload.objective || ''} onChange={e => setPayload({...payload, objective: e.target.value})} required className="border border-gray-200 rounded-lg px-3 py-2" placeholder="e.g. For follow up" />
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Unit Cost</label>
                            <input type="text" inputMode="numeric" required value={payload.unitCost ? Number(payload.unitCost).toLocaleString('en-US') : ''} onChange={e => {
                                const raw = e.target.value.replace(/,/g, '');
                                if (/^\d*$/.test(raw)) setPayload({...payload, unitCost: raw === '' ? '' : Number(raw)});
                            }} className="border border-gray-200 rounded-lg px-3 py-2" placeholder="0" />
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Quantity</label>
                            <input type="text" inputMode="numeric" required value={payload.quantity ? Number(payload.quantity).toLocaleString('en-US') : ''} onChange={e => {
                                const raw = e.target.value.replace(/,/g, '');
                                if (/^\d*$/.test(raw)) setPayload({...payload, quantity: raw === '' ? '' : Number(raw)});
                            }} className="border border-gray-200 rounded-lg px-3 py-2" placeholder="1" />
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Date Needed (Optional)</label>
                            <input type="date" value={payload.dateNeeded || ''} onChange={e => setPayload({...payload, dateNeeded: e.target.value})} className="border border-gray-200 rounded-lg px-3 py-2" />
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                            <label className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Duration</label>
                            <select value={payload.duration || 'Once'} onChange={e => setPayload({...payload, duration: e.target.value})} className="border border-gray-200 rounded-lg px-3 py-2">
                                <option>Once</option>
                                <option>Weekly</option>
                                <option>Monthly</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
