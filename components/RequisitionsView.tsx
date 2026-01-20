import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, CheckCircle, Clock, AlertCircle, ChevronRight, Filter, DollarSign } from 'lucide-react';
import { Requisition } from '../types';
import { RequisitionStore } from '../database/requisitionStore';
import RequisitionForm from './RequisitionForm';

interface RequisitionsViewProps {
    currentUser: any;
}

const RequisitionsView: React.FC<RequisitionsViewProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<'Pending' | 'Approved'>('Pending');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [editingReq, setEditingReq] = useState<Requisition | null>(null);

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        setIsLoading(true);
        try {
            let data: Requisition[] = [];
            if (currentUser?.departmentId) {
                data = await RequisitionStore.getByDepartment(currentUser.departmentId);
            } else {
                data = await RequisitionStore.getAll();
            }
            setRequisitions(data);
        } catch (e) {
            console.error("Failed to fetch requisitions", e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRequisitions = requisitions.filter(r => {
        if (activeTab === 'Pending') return r.status === 'Pending' || r.status === 'Rejected' || r.status === 'Pending Finance';
        if (activeTab === 'Approved') return r.status === 'Approved' || r.status === 'Paid';
        return true;
    });

    const handleCreateSuccess = () => {
        setViewMode('list');
        setEditingReq(null);
        fetchRequisitions();
    };

    const handleEdit = (req: Requisition) => {
        setEditingReq(req);
        setViewMode('create');
    };

    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500 h-full flex flex-col">
            {viewMode === 'create' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex-1 overflow-hidden flex flex-col">
                    <RequisitionForm
                        onClose={() => {
                            setViewMode('list');
                            setEditingReq(null);
                        }}
                        onSuccess={handleCreateSuccess}
                        currentUser={currentUser}
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
                            <p className="text-gray-500">Manage funding requests for your department.</p>
                        </div>
                        {activeTab === 'Pending' && (
                            <button
                                onClick={() => {
                                    setEditingReq(null);
                                    setViewMode('create');
                                }}
                                className="bg-ministry-text text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg flex items-center space-x-2"
                            >
                                <Plus className="w-5 h-5" />
                                <span>New Requisition</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                        {/* Tabs */}
                        <div className="flex items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('Pending')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Pending & Rejected
                                </button>
                                <button
                                    onClick={() => setActiveTab('Approved')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Approved' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Approved & Paid
                                </button>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div>
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
                                                    <div className={`mt-1 p-2 rounded-lg ${req.status === 'Approved' ? 'bg-green-100 text-green-600' :
                                                        req.status === 'Paid' ? 'bg-blue-100 text-blue-600' :
                                                            req.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                                                                req.status === 'Pending Finance' ? 'bg-purple-100 text-purple-600' :
                                                                    'bg-yellow-100 text-yellow-600'
                                                        }`}>
                                                        {req.status === 'Approved' && <CheckCircle className="w-5 h-5" />}
                                                        {req.status === 'Paid' && <DollarSign className="w-5 h-5" />}
                                                        {req.status === 'Rejected' && <AlertCircle className="w-5 h-5" />}
                                                        {req.status === 'Pending' && <Clock className="w-5 h-5" />}
                                                        {req.status === 'Pending Finance' && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-5 h-5" />
                                                                <span className="text-xs font-bold whitespace-nowrap">Finance</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-gray-900 text-lg">{req.title}</h4>
                                                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{req.requisitionNumber}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{req.notes || "No additional notes"}</p>
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
                                                            Edit & Resubmit
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

export default RequisitionsView;
