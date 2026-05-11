import React, { useEffect, useState, useCallback } from 'react';
import { Requisition, RequisitionBatch } from '../types';
import { RequisitionStore } from '../database/requisitionStore';
import { useNotification } from './ui/NotificationSystem';
import { REQUISITION_STATUS } from '../shared/constants';
import Badge, { statusVariant } from './ui/Badge';
import LoadingSpinner from './ui/LoadingSpinner';
import EmptyState from './ui/EmptyState';
import { formatDate } from '../shared/formatters';
import { Layers, CheckSquare, Square, FileText, CheckCircle, Clock, ChevronDown, ChevronUp, DollarSign, History } from 'lucide-react';
import { DepartmentStore } from '../database/departmentStore';

interface Props { 
    systemRole: any;
}

const RequisitionQueue: React.FC<Props> = ({ systemRole }) => {
    const { showToast, confirm: askConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState<'Queue' | 'PendingTL' | 'Approved' | 'History'>('Queue');
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [allRequisitions, setAllRequisitions] = useState<Requisition[]>([]);
    const [batches, setBatches] = useState<RequisitionBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [batching, setBatching] = useState(false);
    const [departments, setDepartments] = useState<Record<string, string>>({});
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const deptsRes = await DepartmentStore.getAll();
            if (deptsRes.status === 'success' && deptsRes.data) {
                const deptMap = deptsRes.data.reduce((acc, obj) => {
                     acc[obj.id] = obj.name;
                     return acc;
                }, {} as Record<string, string>);
                setDepartments(deptMap);
            }

            const queueData = await RequisitionStore.getQueue();
            
            // Set based on the new unified backend
            setRequisitions(queueData.finance.unbatched || []);
            setBatches([...queueData.finance.batched_pending_tl, ...queueData.finance.approved_pending_payment]);
            setAllRequisitions(queueData.finance.history || []);
            
            setSelectedIds([]);
        } catch (e: any) {
             showToast('Failed to load requisitions', 'error');
        }
        setLoading(false);
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBatchSubmit = async () => {
        if (selectedIds.length === 0) return;
        setBatching(true);
        const res = await RequisitionStore.createBatch(selectedIds);
        setBatching(false);
        if (res.status === 'success') {
            showToast(`Batch generated: ${res.data?.batchId}`, 'success');
            load();
        } else {
            showToast(res.message || 'Failed to create batch', 'error');
        }
    };

    const handleMarkReqPaid = async (req: Requisition) => {
        if (!await askConfirm("Mark Requisition as Paid?", `Mark "${req.title}" as PAID?`)) return;
        try {
            await RequisitionStore.updateStatus(req.id, REQUISITION_STATUS.PAID);
            showToast(`Requisition marked as PAID!`, 'success');
            load();
        } catch (e: any) {
            showToast('Error marking requisition as paid: ' + e.message, 'error');
        }
    };

    const toggleExpand = (batchId: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(batchId)) next.delete(batchId);
            else next.add(batchId);
            return next;
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
    };

    const awaitingPaymentBatches = batches.filter(b => b.status === REQUISITION_STATUS.APPROVED);
    const pendingTLBatches = batches.filter(b => b.status === REQUISITION_STATUS.TL_APPROVAL || b.status === REQUISITION_STATUS.PENDING);
    const historyItems = allRequisitions;

    const getBatchDisplayStatus = (batch: RequisitionBatch) => {
        if (batch.status === REQUISITION_STATUS.PAID) return 'PAID';
        if (batch.status === REQUISITION_STATUS.REJECTED) return 'REJECTED';
        if (batch.requisitions?.length && batch.requisitions.every(r => r.status === REQUISITION_STATUS.PAID)) return 'PAID';
        return batch.status;
    };

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mt-20">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Finance Processing Queue</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Compile unbatched requests, and process payments for approved batches.</p>
                </div>
            </div>

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('Queue')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'Queue'
                        ? 'border-ministry-orange text-ministry-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Processing Queue ({requisitions.length})
                </button>
                <button
                    onClick={() => setActiveTab('PendingTL')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'PendingTL'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Pending TL Approval ({pendingTLBatches.length})
                </button>
                <button
                    onClick={() => setActiveTab('Approved')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'Approved'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Approved Batches awaiting Payment ({awaitingPaymentBatches.length})
                </button>
                <button
                    onClick={() => setActiveTab('History')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'History'
                        ? 'border-ministry-orange text-ministry-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    History ({historyItems.length})
                </button>
            </div>

            {loading ? (
                <LoadingSpinner fullPage message="Loading global queue…" />
            ) : activeTab === 'Queue' ? (
                /* Unbatched Queue Tab */
                requisitions.length === 0 ? (
                    <EmptyState title="Queue Empty" message="There are no unbatched requisitions awaiting processing." icon={FileText} />
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-300">
                        <div className="p-4 bg-gray-50 flex justify-between items-center border-b border-gray-200">
                            <span className="text-sm font-bold text-gray-500">Select items to batch:</span>
                            {selectedIds.length > 0 && (
                                <button onClick={handleBatchSubmit} disabled={batching} className="bg-ministry-orange text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    {batching ? 'Batching...' : `Group into Batch (${selectedIds.length})`}
                                </button>
                            )}
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-xs">
                                 <tr>
                                     <th className="px-5 py-4 w-12 text-center">
                                          <button onClick={() => setSelectedIds(selectedIds.length === requisitions.length ? [] : requisitions.map(r => r.id))} className="text-gray-400 hover:text-gray-600">
                                              {selectedIds.length === requisitions.length && requisitions.length > 0 ? <CheckSquare className="w-5 h-5 text-ministry-orange" /> : <Square className="w-5 h-5" />}
                                          </button>
                                     </th>
                                     <th className="px-5 py-4">Requisition</th>
                                     <th className="px-5 py-4">Department</th>
                                     <th className="px-5 py-4 text-center">Date Required</th>
                                     <th className="px-5 py-4 text-right">Amount (UGX)</th>
                                     <th className="px-5 py-4 text-center">Status</th>
                                     <th className="px-5 py-4 text-right">Type</th>
                                 </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                 {requisitions.map(r => (
                                     <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(r.id) ? 'bg-orange-50/30' : ''}`}>
                                         <td className="px-5 py-4 text-center">
                                             <button onClick={() => toggleSelection(r.id)} className="text-gray-400 hover:text-gray-600">
                                                 {selectedIds.includes(r.id) ? <CheckSquare className="w-5 h-5 text-ministry-orange" /> : <Square className="w-5 h-5" />}
                                             </button>
                                         </td>
                                         <td className="px-5 py-4">
                                             <p className="font-bold text-gray-900">{r.title}</p>
                                         </td>
                                         <td className="px-5 py-4 text-gray-600 font-medium">
                                            {r.departmentName || departments[r.departmentId] || 'General'}
                                         </td>
                                         <td className="px-5 py-4 text-center text-sm font-medium text-gray-500">
                                             {r.dateRequired ? formatDate(r.dateRequired) : 'Not specified'}
                                         </td>
                                         <td className="px-5 py-4 text-right font-black text-gray-900">{Number(r.totalAmount).toLocaleString()}</td>
                                         <td className="px-5 py-4 text-center">
                                              <Badge label={r.status} variant={statusVariant(r.status) as any} />
                                         </td>
                                         <td className="px-5 py-4 text-right">
                                             <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.type === 'WORKPLAN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {r.type === 'ADHOC' ? 'SPECIAL REQUEST' : r.type}
                                             </span>
                                         </td>
                                     </tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : activeTab === 'PendingTL' ? (
                /* Pending TL Batches Tab */
                pendingTLBatches.length === 0 ? (
                    <EmptyState title="No Batches Pending" message="There are no batches currently waiting for Team Leader approval." icon={Clock} />
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {pendingTLBatches.map(batch => {
                            const activeReqs = batch.requisitions?.filter(req => req.status !== REQUISITION_STATUS.REJECTED) || [];
                            const totalAmount = activeReqs.reduce((sum, req) => sum + Number(req.totalAmount), 0);
                            const isExpanded = expandedBatches.has(batch.id);

                            return (
                                <div key={batch.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:border-blue-500 transition-colors group">
                                    <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700`}>
                                                    PENDING TL APPROVAL
                                                </span>
                                                <span className="text-sm text-gray-400 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(batch.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(batch.id)}>
                                                <Layers className="text-blue-600" size={24} />
                                                {batch.batchNumber}
                                                {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                            </h3>
                                            <div className="text-sm text-gray-500 mt-1 font-medium">
                                                Contains {batch.requisitions?.length || 0} requested units
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right w-full md:w-auto mt-4 md:mt-0 flex flex-col gap-3">
                                            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm self-start md:self-end">
                                                <span className="text-xl font-black text-gray-900">{formatCurrency(totalAmount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-white">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                                    <tr>
                                                        <th className="px-6 py-3">Requisition</th>
                                                        <th className="px-6 py-3">Type</th>
                                                        <th className="px-6 py-3">Date Required</th>
                                                        <th className="px-6 py-3 text-right">Amount (UGX)</th>
                                                        <th className="px-6 py-3 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {batch.requisitions?.map(req => (
                                                        <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-gray-900">{req.title}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${req.type === 'WORKPLAN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {req.type === 'ADHOC' ? 'SPECIAL REQUEST' : req.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                                                {req.dateRequired ? formatDate(req.dateRequired) : 'Not specified'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-gray-900">{Number(req.totalAmount).toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <Badge label={req.status} variant={statusVariant(req.status) as any} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : activeTab === 'Approved' ? (
                /* Approved Batches Tab */
                awaitingPaymentBatches.length === 0 ? (
                    <EmptyState title="No Approvals" message="There are no approved batches waiting to be paid." icon={CheckCircle} />
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {awaitingPaymentBatches.map(batch => {
                            const activeReqs = batch.requisitions?.filter(req => req.status !== REQUISITION_STATUS.REJECTED) || [];
                            const totalAmount = activeReqs.reduce((sum, req) => sum + Number(req.totalAmount), 0);
                            const isExpanded = expandedBatches.has(batch.id);

                            return (
                                <div key={batch.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:border-green-500 transition-colors group">
                                    <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getBatchDisplayStatus(batch) === 'PAID' ? 'bg-green-100 text-green-700' : getBatchDisplayStatus(batch) === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {getBatchDisplayStatus(batch)}
                                                </span>
                                                <span className="text-sm text-gray-400 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(batch.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(batch.id)}>
                                                <Layers className="text-green-600" size={24} />
                                                {batch.batchNumber}
                                                {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                            </h3>
                                            <div className="text-sm text-gray-500 mt-1 font-medium">
                                                Contains {batch.requisitions?.length || 0} requested units
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-3">
                                            <div className="font-mono text-2xl font-black text-ministry-text">
                                                {formatCurrency(totalAmount)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nested Requisitions */}
                                    {isExpanded && batch.requisitions && batch.requisitions.length > 0 && (
                                        <div className="border-t border-gray-100 p-6 bg-white overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-gray-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                                                    <tr>
                                                        <th className="pb-3 pr-4">Date Required</th>
                                                        <th className="pb-3 px-4">Subject</th>
                                                        <th className="pb-3 px-4">Department</th>
                                                        <th className="pb-3 px-4 text-center">Type</th>
                                                        <th className="pb-3 px-4 text-center">Status</th>
                                                        <th className="pb-3 pl-4 text-right">Amount (UGX)</th>
                                                        <th className="pb-3 pl-4 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {batch.requisitions.map(req => (
                                                        <tr key={req.id} className="group/row hover:bg-gray-50/50">
                                                            <td className="py-3 pr-4 text-gray-500 font-medium text-xs">{req.dateRequired ? formatDate(req.dateRequired) : '-'}</td>
                                                            <td className="py-3 px-4">
                                                                <p className="font-bold text-gray-900">{req.title}</p>
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-600 font-medium">
                                                                {departments[req.departmentId] || req.departmentName || 'General'}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                               <span className={`text-xs font-bold px-2 py-1 rounded-full ${req.type === 'WORKPLAN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                 {req.type}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${req.status === REQUISITION_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                    {req.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 pl-4 text-right font-black text-gray-900">{Number(req.totalAmount).toLocaleString()}</td>
                                                            <td className="py-3 pl-4 text-right">
                                                                {req.status !== REQUISITION_STATUS.PAID && req.status !== REQUISITION_STATUS.REJECTED && batch.status !== REQUISITION_STATUS.REJECTED && (
                                                                    <button
                                                                        onClick={() => handleMarkReqPaid(req)}
                                                                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm ml-auto"
                                                                    >
                                                                        <DollarSign className="w-3 h-3" />
                                                                        Pay
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                /* History Tab (Items instead of Batches) */
                historyItems.length === 0 ? (
                    <EmptyState title="No History Items" message="There are no paid or rejected items in the history." icon={History} />
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-300">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-xs">
                                 <tr>
                                     <th className="px-5 py-4">Requisition</th>
                                     <th className="px-5 py-4">Department</th>
                                     <th className="px-5 py-4 text-center">Date Required</th>
                                     <th className="px-5 py-4 text-right">Amount (UGX)</th>
                                     <th className="px-5 py-4 text-center">Status</th>
                                     <th className="px-5 py-4 text-right">Type</th>
                                 </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                 {historyItems.map(r => (
                                     <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                         <td className="px-5 py-4">
                                             <p className="font-bold text-gray-900">{r.title}</p>
                                             <span className="text-xs text-gray-500 font-mono">{r.batchNumber ? `Batch: ${r.batchNumber}` : ''}</span>
                                         </td>
                                         <td className="px-5 py-4 text-gray-600 font-medium">
                                            {r.departmentName || departments[r.departmentId] || 'General'}
                                         </td>
                                         <td className="px-5 py-4 text-center text-sm font-medium text-gray-500">
                                             {r.dateRequired ? formatDate(r.dateRequired) : 'Not specified'}
                                         </td>
                                         <td className="px-5 py-4 text-right font-black text-gray-900">{Number(r.totalAmount).toLocaleString()}</td>
                                         <td className="px-5 py-4 text-center">
                                              <Badge label={r.status} variant={statusVariant(r.status) as any} />
                                         </td>
                                         <td className="px-5 py-4 text-right">
                                             <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.type === 'WORKPLAN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {r.type}
                                             </span>
                                         </td>
                                     </tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
};

export default RequisitionQueue;
