import React, { useState, useEffect } from 'react';
import { RequisitionStore } from '../database/requisitionStore';
import { Requisition } from '../types';
import { CheckCircle, XCircle, FileText, ChevronRight, Filter, Clock } from 'lucide-react';

interface TeamLeaderRequisitionsProps {
    currentUser: any;
}

const TeamLeaderRequisitions: React.FC<TeamLeaderRequisitionsProps> = ({ currentUser }) => {
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        setIsLoading(true);
        try {
            // Fetch all, we will filter locally. 
            // Ideally, we'd have a specific query for 'Pending Team Leader' but 'getAll' is fine for now.
            const data = await RequisitionStore.getAll();
            setRequisitions(data);
        } catch (e) {
            console.error("Failed to fetch requisitions", e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRequisitions = requisitions.filter(req => {
        if (activeTab === 'Pending') {
            return req.status === 'Pending Team Leader';
        } else {
            // History: Approved (passed TL stage) or Rejected (by TL or others)
            // Wait, 'Approved' means fully approved? Or just passed TL?
            // Let's assume History shows anything THAT WAS PROCESSED by TL.
            // Actually simpler: Show 'Pending Finance', 'Approved', 'Paid', 'Rejected'.
            return ['Pending Finance', 'Approved', 'Paid', 'Rejected'].includes(req.status);
        }
    });

    const handleApprove = async (req: Requisition) => {
        if (!confirm(`Approve "${req.title}" and forward to Finance?`)) return;
        try {
            await RequisitionStore.updateStatus(req.id, 'Pending Finance');
            fetchRequisitions();
        } catch (e: any) {
            alert('Error approving requisition: ' + e.message);
        }
    };

    const handleReject = async (req: Requisition) => {
        const reason = prompt(`Reason for rejection for "${req.title}":`);
        if (!reason) return;
        try {
            await RequisitionStore.updateStatus(req.id, 'Rejected', reason);
            fetchRequisitions();
        } catch (e: any) {
            alert('Error rejecting requisition: ' + e.message);
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
                <p className="text-gray-500">Approve or reject departmental funding requests.</p>
            </div>

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('Pending')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'Pending'
                        ? 'border-ministry-orange text-ministry-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Pending Approval ({requisitions.filter(r => r.status === 'Pending Team Leader').length})
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
                <div className="py-12 text-center text-gray-500">Loading requests...</div>
            ) : filteredRequisitions.length === 0 ? (
                <div className="py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No requisitions found</h3>
                    <p className="text-gray-500">
                        {activeTab === 'Pending'
                            ? "You're all caught up! No requests waiting for approval."
                            : "No past requisition history available."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequisitions.map(req => (
                        <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-ministry-orange transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${req.status === 'Pending Team Leader' ? 'bg-orange-100 text-orange-700' :
                                            req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                req.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                                                    req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-600'
                                            }`}>
                                            {req.status}
                                        </span>
                                        <span className="text-sm text-gray-400 flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(req.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{req.title}</h3>
                                    <p className="text-gray-500 mb-4">{req.description}</p>

                                    <div className="flex items-center gap-6 text-sm text-gray-600">
                                        <div className="font-mono font-bold text-ministry-text bg-gray-100 px-3 py-1 rounded-lg">
                                            {formatCurrency(req.amount)}
                                        </div>
                                        <div>Requested by: <span className="font-bold">{req.requestedBy || 'Head of Dept'}</span></div>
                                    </div>

                                    {req.reason && (
                                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                            <strong>Rejection Reason:</strong> {req.reason}
                                        </div>
                                    )}
                                </div>

                                {activeTab === 'Pending' && req.status === 'Pending Team Leader' && (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="flex items-center justify-center gap-2 bg-ministry-text text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-900 transition-colors shadow-sm w-40"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(req)}
                                            className="flex items-center justify-center gap-2 bg-white border-2 border-red-100 text-red-600 px-6 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors w-40"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeamLeaderRequisitions;
