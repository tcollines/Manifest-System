import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { RequisitionStore } from '../database/requisitionStore';
import { RequisitionBatch } from '../types';
import { REQUISITION_STATUS } from '../shared/constants';
import { CheckCircle, XCircle, FileText, Clock, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { DepartmentStore } from '../database/departmentStore';

interface TeamLeaderRequisitionsProps {
    currentUser: any;
}

const TeamLeaderRequisitions: React.FC<TeamLeaderRequisitionsProps> = ({ currentUser }) => {
    const { showToast, confirm: askConfirm, prompt: askPrompt } = useNotification();
    const [batches, setBatches] = useState<RequisitionBatch[]>([]);
    const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
    const [departments, setDepartments] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setIsLoading(true);
        try {
            const deptsRes = await DepartmentStore.getAll();
            if (deptsRes.status === 'success' && deptsRes.data) {
                const deptMap = deptsRes.data.reduce((acc, obj) => {
                     acc[obj.id] = obj.name;
                     return acc;
                }, {} as Record<string, string>);
                setDepartments(deptMap);
            }

            const data = await RequisitionStore.getQueue();
            setBatches([...data.tl.pending_approval, ...data.tl.history]);
        } catch (e) {
            console.error(e);
            showToast('Failed to load requisitions', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const pendingCount = batches.filter(b => [REQUISITION_STATUS.TL_APPROVAL, REQUISITION_STATUS.PENDING].includes(b.status as any)).length;
    
    const filteredBatches = batches.filter(b => {
        if (activeTab === 'Pending') {
            return b.status === REQUISITION_STATUS.TL_APPROVAL || b.status === REQUISITION_STATUS.PENDING; 
        } else {
            return [REQUISITION_STATUS.APPROVED, REQUISITION_STATUS.PAID, REQUISITION_STATUS.REJECTED].includes(b.status as any);
        }
    });

    const toggleExpand = (batchId: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(batchId)) next.delete(batchId);
            else next.add(batchId);
            return next;
        });
    };

    const handleApproveItem = async (req: any, batch: any) => {
        if (!await askConfirm("Approve Item?", `Approve "${req.title}"?`)) return;
        try {
            await RequisitionStore.updateStatus(req.id, REQUISITION_STATUS.APPROVED);
            showToast(`Item ${req.title} approved!`, 'success');
            
            // Auto-finalize batch
            const pendingItems = batch.requisitions.filter((r: any) => 
                r.id !== req.id && 
                r.status !== REQUISITION_STATUS.APPROVED && 
                r.status !== REQUISITION_STATUS.REJECTED
            );
            if (pendingItems.length === 0) {
                const allRejected = batch.requisitions.every((r: any) => 
                    r.id === req.id ? false : r.status === REQUISITION_STATUS.REJECTED
                );
                if (allRejected) {
                    await RequisitionStore.updateBatchStatus(batch.id, REQUISITION_STATUS.REJECTED, "All items rejected");
                } else {
                    await RequisitionStore.updateBatchStatus(batch.id, REQUISITION_STATUS.APPROVED);
                }
            }

            fetchBatches();
        } catch (e: any) {
            showToast('Error approving item: ' + e.message, 'error');
        }
    };

    const handleRejectItem = async (req: any, batch: any) => {
        const reason = await askPrompt(`Please provide a reason for rejecting "${req.title}":`, { title: "Reject Item" });
        if (!reason) return;
        try {
            await RequisitionStore.updateStatus(req.id, REQUISITION_STATUS.REJECTED, reason);
            showToast(`Item ${req.title} rejected.`, 'success');

            // Auto-finalize batch
            const pendingItems = batch.requisitions.filter((r: any) => 
                r.id !== req.id && 
                r.status !== REQUISITION_STATUS.APPROVED && 
                r.status !== REQUISITION_STATUS.REJECTED
            );
            if (pendingItems.length === 0) {
                const allRejected = batch.requisitions.every((r: any) => 
                    r.id === req.id ? true : r.status === REQUISITION_STATUS.REJECTED
                );
                if (allRejected) {
                    await RequisitionStore.updateBatchStatus(batch.id, REQUISITION_STATUS.REJECTED, "All items rejected");
                } else {
                    await RequisitionStore.updateBatchStatus(batch.id, REQUISITION_STATUS.APPROVED);
                }
            }

            fetchBatches();
        } catch (e: any) {
            showToast('Error rejecting item: ' + e.message, 'error');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
    };

    return (
        <div className="p-8 animate-in fade-in duration-500 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-ministry-text flex items-center gap-2">
                    <FileText className="text-ministry-orange" size={32} />
                    Review Requisitions
                </h1>
                <p className="text-gray-500">Approve or reject compiled departmental funding batches.</p>
            </div>

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('Pending')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'Pending'
                        ? 'border-ministry-orange text-ministry-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Pending Approval ({pendingCount})
                </button>
                <button
                    onClick={() => setActiveTab('History')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'History'
                        ? 'border-ministry-orange text-ministry-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    History
                </button>
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading batches...</div>
            ) : filteredBatches.length === 0 ? (
                <div className="py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <Layers className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No batches found</h3>
                    <p className="text-gray-500">
                        {activeTab === 'Pending'
                            ? "You're all caught up! No batches waiting for approval."
                            : "No past batch history available."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredBatches.map(batch => {
                        const activeReqs = batch.requisitions?.filter(req => req.status !== REQUISITION_STATUS.REJECTED) || [];
                        const totalAmount = activeReqs.reduce((sum, req) => sum + Number(req.totalAmount), 0);
                        const isExpanded = expandedBatches.has(batch.id);

                        return (
                            <div key={batch.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:border-ministry-orange transition-colors group">
                                {/* Batch Header */}
                                <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <StatusBadge status={batch.status} />
                                            <span className="text-sm text-gray-400 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(batch.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(batch.id)}>
                                            <Layers className="text-ministry-orange" size={24} />
                                            {batch.batchNumber}
                                            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                        </h3>
                                        <div className="text-sm text-gray-500 mt-1 font-medium">
                                            Contains {batch.requisitions?.length || 0} requests
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
                                                    <th className="pb-3 pr-4">Department</th>
                                                    <th className="pb-3 px-4">Subject</th>
                                                    <th className="pb-3 px-4 text-center">Type</th>
                                                    <th className="pb-3 px-4 text-right">Dept Contr</th>
                                                    <th className="pb-3 pl-4 text-right">Amount (UGX)</th>
                                                    <th className="pb-3 px-4 text-center">Status</th>
                                                    {activeTab === 'Pending' && <th className="pb-3 pl-4 text-right">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {batch.requisitions.map(req => (
                                                    <tr key={req.id} className="group/row hover:bg-gray-50/50">
                                                        <td className="py-3 pr-4 text-gray-500 font-medium text-sm">{departments[req.departmentId] || 'Unknown'}</td>
                                                        <td className="py-3 px-4">
                                                            <p className="font-bold text-gray-900">{req.title}</p>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                           <span className={`text-xs font-bold px-2 py-1 rounded-full ${req.type === 'WORKPLAN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                             {req.type}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-gray-500 font-medium">
                                                            {req.deptContribution ? req.deptContribution.toLocaleString() : '—'}
                                                        </td>
                                                        <td className="py-3 pl-4 text-right font-black text-gray-900">{Number(req.totalAmount).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <StatusBadge status={req.status} />
                                                        </td>
                                                        {activeTab === 'Pending' && (
                                                            <td className="py-3 pl-4 text-right">
                                                                {req.status === REQUISITION_STATUS.TL_APPROVAL || req.status === REQUISITION_STATUS.PENDING ? (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleApproveItem(req, batch); }} className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                                                            <CheckCircle className="w-5 h-5" />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleRejectItem(req, batch); }} className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                                                            <XCircle className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 font-bold uppercase">{req.status}</span>
                                                                )}
                                                            </td>
                                                        )}
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
            )}
        </div>
    );
};

export default TeamLeaderRequisitions;
