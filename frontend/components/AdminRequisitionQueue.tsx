import React, { useEffect, useState, useCallback } from 'react';
import { Requisition } from '../types';
import { RequisitionStore } from '../database/requisitionStore';
import { useNotification } from './ui/NotificationSystem';
import { REQUISITION_STATUS } from '../shared/constants';
import Badge, { statusVariant } from './ui/Badge';
import { StatusBadge } from './ui/StatusBadge';
import LoadingSpinner from './ui/LoadingSpinner';
import EmptyState from './ui/EmptyState';
import { formatDate } from '../shared/formatters';
import { FileText, CheckCircle, XCircle, Edit } from 'lucide-react';
import { DepartmentStore } from '../database/departmentStore';
import RequisitionForm from './RequisitionForm';

interface Props {
    currentUser: any;
}

const AdminRequisitionQueue: React.FC<Props> = ({ currentUser }) => {
    const { showToast, confirm: askConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<Record<string, string>>({});
    
    // Modal states
    const [editingReq, setEditingReq] = useState<Requisition | null>(null);
    const [rejectingReq, setRejectingReq] = useState<Requisition | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

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
            
            // For now, keep history locally if admin.queue doesn't have history
            // Since the queue primarily gives pending items for admin:
            const allReqs = await RequisitionStore.getAll();
            const adhocReqs = allReqs.filter(r => r.type === 'ADHOC');
            setRequisitions(adhocReqs);
        } catch (e: any) {
             showToast('Failed to load requisitions', 'error');
        }
        setLoading(false);
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (req: Requisition) => {
        if (!await askConfirm("Approve Requisition?", `Approve "${req.title}" and send to Finance?`)) return;
        try {
            await RequisitionStore.updateStatus(req.id, REQUISITION_STATUS.APPROVED);
            showToast(`Requisition approved!`, 'success');
            load();
        } catch (e: any) {
            showToast('Error approving: ' + e.message, 'error');
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectingReq) return;
        if (!rejectionReason.trim()) {
            showToast("Rejection reason is required.", "error");
            return;
        }
        try {
            await RequisitionStore.updateStatus(rejectingReq.id, REQUISITION_STATUS.REJECTED as any, rejectionReason);
            showToast(`Requisition rejected.`, 'success');
            setRejectingReq(null);
            setRejectionReason('');
            load();
        } catch (e: any) {
            showToast('Error rejecting: ' + e.message, 'error');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
    };

    const pendingItems = requisitions.filter(r => r.status === REQUISITION_STATUS.PENDING);
    const historyItems = requisitions.filter(r => r.status !== REQUISITION_STATUS.PENDING && r.status !== REQUISITION_STATUS.DRAFT);

    const displayItems = activeTab === 'Pending' ? pendingItems : historyItems;

    if (editingReq) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 m-4 md:m-8 overflow-hidden flex flex-col">
                <RequisitionForm
                    onClose={() => setEditingReq(null)}
                    onSuccess={() => { setEditingReq(null); load(); }}
                    currentUser={currentUser}
                    initialData={editingReq}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Global Requisitions</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Review and approve Adhoc requisitions from all departments.</p>
                </div>
            </div>

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('Pending')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'Pending'
                        ? 'border-ministry-orange text-ministry-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Pending Review ({pendingItems.length})
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
                <LoadingSpinner fullPage message="Loading global requisitions…" />
            ) : displayItems.length === 0 ? (
                <EmptyState title="No Requisitions" message={`There are no ${activeTab.toLowerCase()} adhoc requisitions.`} icon={FileText} />
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
                                 <th className="px-5 py-4 text-right">Actions</th>
                             </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {displayItems.map(r => (
                                 <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                     <td className="px-5 py-4">
                                         <p className="font-bold text-gray-900">{r.title}</p>
                                         {r.requisitionNumber && <span className="text-xs text-gray-500 font-mono">{r.requisitionNumber}</span>}
                                     </td>
                                     <td className="px-5 py-4 text-gray-600 font-medium">
                                        {r.departmentName || departments[r.departmentId] || 'General'}
                                     </td>
                                     <td className="px-5 py-4 text-center text-sm font-medium text-gray-500">
                                         {r.dateRequired ? formatDate(r.dateRequired) : 'Not specified'}
                                     </td>
                                     <td className="px-5 py-4 text-right font-black text-gray-900">{Number(r.totalAmount).toLocaleString()}</td>
                                     <td className="px-5 py-4 text-center">
                                          <StatusBadge status={r.status as any} />
                                     </td>
                                     <td className="px-5 py-4 text-right">
                                         {r.status === REQUISITION_STATUS.PENDING ? (
                                             <div className="flex items-center justify-end gap-2">
                                                 <button onClick={() => setEditingReq(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                     <Edit className="w-4 h-4" />
                                                 </button>
                                                 <button onClick={() => handleApprove(r)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                                     <CheckCircle className="w-5 h-5" />
                                                 </button>
                                                 <button onClick={() => setRejectingReq(r)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                                     <XCircle className="w-5 h-5" />
                                                 </button>
                                             </div>
                                         ) : (
                                            <span className="text-xs text-gray-400">No actions</span>
                                         )}
                                     </td>
                                 </tr>
                             ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectingReq && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-lg font-bold text-ministry-text">Reject Requisition</h3>
                            <button onClick={() => { setRejectingReq(null); setRejectionReason(''); }} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Rejection
                            </label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                rows={4}
                                placeholder="Please provide details so the department can make necessary corrections..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => { setRejectingReq(null); setRejectionReason(''); }}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectSubmit}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm"
                                    disabled={!rejectionReason.trim()}
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRequisitionQueue;
