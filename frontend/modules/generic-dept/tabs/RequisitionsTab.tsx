import React, { useState, useEffect } from 'react';
import { Department, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { X, Plus, FileText, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { Requisition } from '../../../types';
import { RequisitionStore } from '../../../database/requisitionStore';
import { REQUISITION_STATUS } from '../../../shared/constants';
import RequisitionForm from '../../../components/RequisitionForm';

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

    const isTeamLeader = user.role === 'TeamLeader';

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
            return [REQUISITION_STATUS.DRAFT, REQUISITION_STATUS.PENDING, REQUISITION_STATUS.REJECTED, REQUISITION_STATUS.FINANCE_BATCH, REQUISITION_STATUS.TL_APPROVAL].includes(r.status as any);
        }
        if (activeTab === 'Approved') return r.status === REQUISITION_STATUS.APPROVED || r.status === REQUISITION_STATUS.PAID;
        return true;
    });



    const handleSubmit = async (req: Requisition) => {
        setIsLoading(true);
        try {
            await RequisitionStore.updateStatus(req.id, REQUISITION_STATUS.PENDING);
            showToast('Requisition submitted successfully!', 'success');
            fetchRequisitions();
        } catch (e: any) {
            showToast(e.message || 'Failed to submit requisition', 'error');
            setIsLoading(false);
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
                                Requisitions
                            </h1>
                            <p className="text-gray-500">
                                Manage funding requests for your department.
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
                                                        req.status === REQUISITION_STATUS.APPROVED      ? 'bg-green-100 text-green-600'  :
                                                        req.status === REQUISITION_STATUS.PAID          ? 'bg-blue-100 text-blue-600'   :
                                                        req.status === REQUISITION_STATUS.REJECTED      ? 'bg-red-100 text-red-600'     :
                                                        req.status === REQUISITION_STATUS.FINANCE_BATCH ? 'bg-purple-100 text-purple-600' :
                                                        'bg-yellow-100 text-yellow-600'
                                                    }`}>
                                                        {req.status === REQUISITION_STATUS.APPROVED && (
                                                            <div className="flex items-center gap-1">
                                                                <CheckCircle className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Approved</span>
                                                            </div>
                                                        )}
                                                        {req.status === REQUISITION_STATUS.PAID && (
                                                            <div className="flex items-center gap-1">
                                                                <DollarSign className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Paid</span>
                                                            </div>
                                                        )}
                                                        {req.status === REQUISITION_STATUS.REJECTED && (
                                                            <div className="flex items-center gap-1">
                                                                <AlertCircle className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Rejected</span>
                                                            </div>
                                                        )}
                                                        {req.status === REQUISITION_STATUS.PENDING && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Pending</span>
                                                            </div>
                                                        )}
                                                        {req.status === REQUISITION_STATUS.DRAFT && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Draft</span>
                                                            </div>
                                                        )}
                                                        {req.status === REQUISITION_STATUS.FINANCE_BATCH  && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Finance</span>
                                                            </div>
                                                        )}
                                                        {req.status === REQUISITION_STATUS.TL_APPROVAL && (
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
                                                        {req.status === REQUISITION_STATUS.REJECTED && req.rejectionReason && (
                                                            <div className="mt-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">
                                                                <strong>Rejected:</strong> {req.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount</p>
                                                    <p className="text-xl font-black text-gray-900">UGX {req.totalAmount.toLocaleString()}</p>

                                                    {req.status === REQUISITION_STATUS.REJECTED && (
                                                        <button
                                                            onClick={() => handleEdit(req)}
                                                            className="mt-2 text-sm text-ministry-orange font-bold hover:text-orange-700 border border-ministry-orange rounded px-3 py-1 hover:bg-orange-50 transition-colors block w-full text-center"
                                                        >
                                                            Edit &amp; Resubmit
                                                        </button>
                                                    )}
                                                    {req.status === REQUISITION_STATUS.DRAFT && (
                                                        <button
                                                            onClick={() => handleSubmit(req)}
                                                            className="mt-2 text-sm bg-ministry-orange text-white font-bold hover:bg-orange-600 rounded px-3 py-1.5 transition-colors block w-full text-center shadow"
                                                        >
                                                            Submit
                                                        </button>
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
