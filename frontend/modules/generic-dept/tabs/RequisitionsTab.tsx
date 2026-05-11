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
            // WORKPLAN requisitions bypass the ADHOC approval pipeline since they are pre-approved
            const nextStatus = req.type === 'WORKPLAN' ? REQUISITION_STATUS.APPROVED : REQUISITION_STATUS.PENDING;
            await RequisitionStore.updateStatus(req.id, nextStatus);
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
                    <div className="flex flex-row justify-between items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-2">
                                <FileText className="text-ministry-orange hidden md:block" size={32} />
                                Requisitions
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Manage funding requests.
                            </p>
                        </div>
                        {activeTab === 'Pending' && !isTeamLeader && (
                            <button
                                onClick={() => { setEditingReq(null); setViewMode('create'); }}
                                className="w-12 h-12 md:w-14 md:h-14 bg-ministry-text text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg flex-shrink-0"
                            >
                                <Plus className="w-6 h-6 md:w-8 md:h-8 text-ministry-neon" strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden -mx-4 md:mx-0">
                        {/* Sub-tabs */}
                        <div className="flex items-center px-4 md:px-0 py-2 mb-4">
                            <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('Pending')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Pending &amp; Rejected
                                </button>
                                <button
                                    onClick={() => setActiveTab('Approved')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'Approved' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Approved &amp; Paid
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-0 pb-20">
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
                                <div className="overflow-x-auto pb-4">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                                <th className="py-4 px-4 font-semibold">Status</th>
                                                <th className="py-4 px-4 font-semibold">Requisition Details</th>
                                                <th className="py-4 px-4 font-semibold">Date &amp; Items</th>
                                                <th className="py-4 px-4 font-semibold text-right">Amount</th>
                                                <th className="py-4 px-4 font-semibold text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredRequisitions.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="py-4 px-4 whitespace-nowrap">
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                                                            req.status === REQUISITION_STATUS.APPROVED      ? 'bg-green-100 text-green-700'  :
                                                            req.status === REQUISITION_STATUS.PAID          ? 'bg-blue-100 text-blue-700'   :
                                                            req.status === REQUISITION_STATUS.REJECTED      ? 'bg-red-100 text-red-700'     :
                                                            req.status === REQUISITION_STATUS.FINANCE_BATCH ? 'bg-purple-100 text-purple-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {req.status === REQUISITION_STATUS.APPROVED && <><CheckCircle className="w-4 h-4" /><span className="text-xs font-bold">Approved</span></>}
                                                            {req.status === REQUISITION_STATUS.PAID && <><DollarSign className="w-4 h-4" /><span className="text-xs font-bold">Paid</span></>}
                                                            {req.status === REQUISITION_STATUS.REJECTED && <><AlertCircle className="w-4 h-4" /><span className="text-xs font-bold">Rejected</span></>}
                                                            {req.status === REQUISITION_STATUS.PENDING && <><Clock className="w-4 h-4" /><span className="text-xs font-bold">Pending</span></>}
                                                            {req.status === REQUISITION_STATUS.DRAFT && <><Clock className="w-4 h-4" /><span className="text-xs font-bold">Draft</span></>}
                                                            {req.status === REQUISITION_STATUS.FINANCE_BATCH && <><Clock className="w-4 h-4" /><span className="text-xs font-bold">Finance</span></>}
                                                            {req.status === REQUISITION_STATUS.TL_APPROVAL && <><Clock className="w-4 h-4" /><span className="text-xs font-bold">Team Leader</span></>}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-gray-900 text-base">{req.title}</h4>
                                                            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{req.requisitionNumber}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 line-clamp-1">{req.notes || 'No additional notes'}</p>
                                                        {req.status === REQUISITION_STATUS.REJECTED && req.rejectionReason && (
                                                            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 inline-block">
                                                                <strong>Reason:</strong> {req.rejectionReason}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div>{new Date(req.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-xs mt-0.5">{(req.items || []).length} Items</div>
                                                    </td>
                                                    <td className="py-4 px-4 whitespace-nowrap text-right">
                                                        <div className="text-lg font-black text-gray-900">UGX {req.totalAmount.toLocaleString()}</div>
                                                    </td>
                                                    <td className="py-4 px-4 whitespace-nowrap text-center">
                                                        {req.status === REQUISITION_STATUS.REJECTED ? (
                                                            <button
                                                                onClick={() => handleEdit(req)}
                                                                className="text-xs text-ministry-orange font-bold hover:text-orange-700 border border-ministry-orange rounded px-3 py-1.5 hover:bg-orange-50 transition-colors inline-block"
                                                            >
                                                                Edit &amp; Resubmit
                                                            </button>
                                                        ) : req.status === REQUISITION_STATUS.DRAFT ? (
                                                            <button
                                                                onClick={() => handleSubmit(req)}
                                                                className="text-xs bg-ministry-orange text-white font-bold hover:bg-orange-600 rounded px-3 py-1.5 transition-colors shadow-sm inline-block"
                                                            >
                                                                Submit
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
