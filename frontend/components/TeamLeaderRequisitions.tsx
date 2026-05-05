import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { RequisitionStore } from '../database/requisitionStore';
import { RequisitionBatch } from '../types';
import { REQUISITION_STATUS } from '../shared/constants';
import { CheckCircle, XCircle, FileText, Clock, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';

interface TeamLeaderRequisitionsProps {
    currentUser: any;
}

const TeamLeaderRequisitions: React.FC<TeamLeaderRequisitionsProps> = ({ currentUser }) => {
    const { showToast, confirm: askConfirm } = useNotification();
    const [batches, setBatches] = useState<RequisitionBatch[]>([]);
    const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setIsLoading(true);
        try {
            const data = await RequisitionStore.getQueue();
            setBatches([...data.tl.pending_approval, ...data.tl.history]);
        } catch (e) {
            console.error("Failed to fetch batches", e);
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

    const handleApproveBatch = async (batch: RequisitionBatch) => {
        if (!await askConfirm("Approve Batch?", `Approve Batch "${batch.batchNumber}"? This will natively finalize all ${batch.requisitions?.length || 0} nested requests.`)) return;
        try {
            await RequisitionStore.updateBatchStatus(batch.id, REQUISITION_STATUS.APPROVED);
            showToast(`Batch ${batch.batchNumber} approved!`, 'success');
            fetchBatches();
        } catch (e: any) {
            showToast('Error approving batch: ' + e.message, 'error');
        }
    };

    const handleRejectBatch = async (batch: RequisitionBatch) => {
        const reason = prompt(`Reason for rejecting Batch "${batch.batchNumber}":`);
        if (!reason) return;
        try {
            await RequisitionStore.updateBatchStatus(batch.id, REQUISITION_STATUS.REJECTED, reason);
            showToast(`Batch ${batch.batchNumber} rejected.`, 'success');
            fetchBatches();
        } catch (e: any) {
            showToast('Error rejecting batch: ' + e.message, 'error');
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
                        const totalAmount = batch.requisitions?.reduce((sum, req) => sum + Number(req.totalAmount), 0) || 0;
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
                                        {activeTab === 'Pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRejectBatch(batch)}
                                                    className="flex items-center gap-2 bg-white border-2 border-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-50 transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApproveBatch(batch)}
                                                    className="flex items-center gap-2 bg-ministry-text text-white px-5 py-2 rounded-xl font-bold hover:bg-gray-900 transition-colors shadow-sm"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Approve Batch
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Nested Requisitions */}
                                {isExpanded && batch.requisitions && batch.requisitions.length > 0 && (
                                    <div className="border-t border-gray-100 p-6 bg-white overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-gray-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                                                <tr>
                                                    <th className="pb-3 pr-4">Requisition</th>
                                                    <th className="pb-3 px-4">Subject</th>
                                                    <th className="pb-3 px-4 text-center">Type</th>
                                                    <th className="pb-3 pl-4 text-right">Amount (UGX)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {batch.requisitions.map(req => (
                                                    <tr key={req.id} className="group/row hover:bg-gray-50/50">
                                                        <td className="py-3 pr-4 text-gray-500 font-mono text-xs">{req.requisitionNumber || '-'}</td>
                                                        <td className="py-3 px-4">
                                                            <p className="font-bold text-gray-900">{req.title}</p>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                           <span className={`text-xs font-bold px-2 py-1 rounded-full ${req.type === 'WORKPLAN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                             {req.type}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pl-4 text-right font-black text-gray-900">{Number(req.totalAmount).toLocaleString()}</td>
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
