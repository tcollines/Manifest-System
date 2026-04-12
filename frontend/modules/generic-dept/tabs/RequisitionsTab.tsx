import React, { useState, useEffect } from 'react';
import { Department, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { X, Plus, FileText, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { Requisition } from '../../../types';
import { RequisitionStore } from '../../../database/requisitionStore';
import RequisitionForm from '../../../components/RequisitionForm';
import { resolveDepartment } from '../../../constants/departmentMap';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

/**
 * RequisitionsTab — self-contained copy of RequisitionsView that uses local
 * useState (not useSearchParams) for its Pending/Approved sub-tab toggle,
 * so it never clobbers the department dashboard's ?tab=requisitions URL param.
 */
const RequisitionsTab: React.FC<Props> = ({ user }) => {
    const { showToast, confirm: askConfirm } = useNotification();

    // ── Local sub-tab (NOT useSearchParams — avoids clobbering URL) ──────────
    const [activeTab, setActiveTab] = useState<'Pending' | 'Approved'>('Pending');
    const [viewMode, setViewMode]   = useState<'list' | 'create'>('list');
    const [editingReq, setEditingReq]   = useState<Requisition | null>(null);
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [isLoading, setIsLoading]      = useState(false);

    useEffect(() => { if (user) fetchRequisitions(); }, [user]);

    if (!user) return null;

    const isAdmin      = user.role === 'Administrator' || user.role === 'Super Admin';
    const isTeamLeader = user.role === 'TeamLeader';
    const isFinance    = user.role === 'Finance' || resolveDepartment(user.departmentId || '')?.slug === 'finance';

    async function fetchRequisitions() {
        setIsLoading(true);
        try {
            let data: Requisition[] = [];
            if (user?.departmentId) {
                data = await RequisitionStore.getByDepartment(user.departmentId);
            } else {
                data = await RequisitionStore.getAll();
            }
            setRequisitions(data);
        } catch (e) {
            console.error('Failed to fetch requisitions', e);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredRequisitions = requisitions.filter(r => {
        if (activeTab === 'Pending') {
            if (isTeamLeader) return r.status === 'Pending Team Leader';
            return r.status === 'Pending' || r.status === 'Rejected' ||
                   r.status === 'Pending Finance' || r.status === 'Pending Team Leader';
        }
        if (activeTab === 'Approved') return r.status === 'Approved' || r.status === 'Paid';
        return true;
    });

    const handleApprove = async (req: Requisition) => {
        if (!await askConfirm('Approve Request?', `Approve "${req.title}"?`)) return;
        try {
            let nextStatus: 'Pending Team Leader' | 'Pending Finance' | 'Approved' = 'Approved';
            if (req.status === 'Pending') nextStatus = 'Pending Team Leader';
            else if (req.status === 'Pending Team Leader') nextStatus = 'Pending Finance';
            else if (req.status === 'Pending Finance') nextStatus = 'Approved';
            await RequisitionStore.updateStatus(req.id, nextStatus);
            showToast('Requisition status updated.', 'success');
            fetchRequisitions();
        } catch (e: any) {
            showToast('Error updating status: ' + e.message, 'error');
        }
    };

    const handleReject = async (req: Requisition) => {
        const reason = prompt(`Reason for rejection for "${req.title}":`);
        if (!reason) return;
        try {
            await RequisitionStore.updateStatus(req.id, 'Rejected', reason);
            showToast('Requisition rejected.', 'success');
            fetchRequisitions();
        } catch (e: any) {
            showToast('Error rejecting requisition: ' + e.message, 'error');
        }
    };

    const handleCreateSuccess = () => {
        setViewMode('list');
        setEditingReq(null);
        fetchRequisitions();
    };

    const handleEdit = (req: Requisition) => {
        setEditingReq(req);
        setViewMode('create');
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            {viewMode === 'create' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex-1 overflow-hidden flex flex-col">
                    <RequisitionForm
                        onClose={() => { setViewMode('list'); setEditingReq(null); }}
                        onSuccess={handleCreateSuccess}
                        currentUser={user}
                        initialData={editingReq || undefined}
                    />
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-ministry-text flex items-center gap-2">
                                <FileText className="text-ministry-orange" size={32} />
                                {isTeamLeader ? 'Review Requisitions' : 'Requisitions'}
                            </h1>
                            <p className="text-gray-500">
                                {isTeamLeader
                                    ? 'Departmental requests waiting for your approval.'
                                    : 'Manage funding requests for your department.'}
                            </p>
                        </div>
                        {activeTab === 'Pending' && !isTeamLeader && (
                            <button
                                onClick={() => { setEditingReq(null); setViewMode('create'); }}
                                className="bg-ministry-text text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg flex items-center space-x-2"
                            >
                                <Plus className="w-5 h-5" />
                                <span>New Requisition</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                        {/* Sub-tabs — pure local state, never touches URL */}
                        <div className="flex items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('Pending')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Pending &amp; Rejected
                                </button>
                                <button
                                    onClick={() => setActiveTab('Approved')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Approved' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Approved &amp; Paid
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange" />
                                </div>
                            ) : filteredRequisitions.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No requisitions found</h3>
                                    <p className="text-gray-500">No {activeTab.toLowerCase()} requisitions to display.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRequisitions.map((req) => (
                                        <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-default group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 p-2 rounded-lg ${
                                                        req.status === 'Approved'      ? 'bg-green-100 text-green-600'  :
                                                        req.status === 'Paid'          ? 'bg-blue-100 text-blue-600'   :
                                                        req.status === 'Rejected'      ? 'bg-red-100 text-red-600'     :
                                                        req.status === 'Pending Finance' ? 'bg-purple-100 text-purple-600' :
                                                        'bg-yellow-100 text-yellow-600'
                                                    }`}>
                                                        {req.status === 'Approved'         && <CheckCircle className="w-5 h-5" />}
                                                        {req.status === 'Paid'             && <DollarSign className="w-5 h-5" />}
                                                        {req.status === 'Rejected'         && <AlertCircle className="w-5 h-5" />}
                                                        {req.status === 'Pending'          && <Clock className="w-5 h-5" />}
                                                        {req.status === 'Pending Finance'  && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Finance</span>
                                                            </div>
                                                        )}
                                                        {req.status === 'Pending Team Leader' && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Team Leader</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-gray-900 text-lg">{req.title}</h4>
                                                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{req.requisitionNumber}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{req.notes || 'No additional notes'}</p>
                                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                                            <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                                            <span>•</span>
                                                            <span>{(req.items || []).length} Items</span>
                                                        </div>
                                                        {req.status === 'Rejected' && req.rejectionReason && (
                                                            <div className="mt-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">
                                                                <strong>Rejected:</strong> {req.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount</p>
                                                    <p className="text-xl font-black text-gray-900">UGX {req.totalAmount.toLocaleString()}</p>

                                                    {req.status === 'Rejected' && (
                                                        <button
                                                            onClick={() => handleEdit(req)}
                                                            className="mt-2 text-sm text-ministry-orange font-bold hover:text-orange-700 border border-ministry-orange rounded px-3 py-1 hover:bg-orange-50 transition-colors"
                                                        >
                                                            Edit &amp; Resubmit
                                                        </button>
                                                    )}

                                                    {isAdmin && req.status === 'Pending' && (
                                                        <div className="flex gap-2 mt-2">
                                                            <button onClick={() => handleReject(req)} className="text-sm bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors shadow-sm whitespace-nowrap">Reject</button>
                                                            <button onClick={() => handleApprove(req)} className="text-sm bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap">Approve to Team Leader</button>
                                                        </div>
                                                    )}
                                                    {isTeamLeader && req.status === 'Pending Team Leader' && (
                                                        <div className="flex gap-2 mt-2">
                                                            <button onClick={() => handleReject(req)} className="text-sm bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors shadow-sm whitespace-nowrap">Reject</button>
                                                            <button onClick={() => handleApprove(req)} className="text-sm bg-ministry-text text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap">Approve to Finance</button>
                                                        </div>
                                                    )}
                                                    {isFinance && req.status === 'Pending Finance' && (
                                                        <button onClick={() => handleApprove(req)} className="mt-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap">Approve &amp; Pay</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RequisitionsTab;
