import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { Check, Eye, X, FileText, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Requisition, RequisitionItem } from '../types';
import { RequisitionStore } from '../database/requisitionStore';
import { DEPARTMENTS } from '../constants';
import { useParams } from 'react-router-dom';

interface DepartmentRequestsProps {
  departmentId?: string;
}

const DepartmentRequests: React.FC<DepartmentRequestsProps> = ({ departmentId: propDepartmentId }) => {
  const { showToast } = useNotification();
  const [requests, setRequests] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionComment, setActionComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const { departmentId: paramDepartmentId } = useParams<{ departmentId: string }>();
  const targetDepartmentId = propDepartmentId || paramDepartmentId;

  useEffect(() => {
    fetchRequests();
  }, [targetDepartmentId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch all requisitions and filter for 'Pending'
      // In a larger app, we'd have a specific DB query for this.
      const allReqs = await RequisitionStore.getAll();
      let pending = allReqs.filter(r => r.status === 'Pending');

      if (targetDepartmentId) {
        pending = pending.filter(r => r.departmentId === targetDepartmentId);
      }

      setRequests(pending);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: 'Approved' | 'Rejected' | 'Pending Finance') => {
    if (!selectedReq) return;
    setProcessing(true);
    try {
      await RequisitionStore.updateStatus(selectedReq.id, status, actionComment);
      // Refresh list
      await fetchRequests();
      // Close modal
      setSelectedReq(null);
      setActionComment('');
    } catch (error) {
      console.error(`Failed to ${status} request:`, error);
      showToast(`Failed to ${status} request. Please try again.`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getDepartmentName = (id: string) => {
    return DEPARTMENTS.find(d => d.id === id)?.name || id;
  };

  return (
    <div className="bg-ministry-card rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-bold text-ministry-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-ministry-orange" />
            Departmental Requests
          </h3>
          <p className="text-sm text-gray-500">Review pending requisitions before forwarding to Finance</p>
        </div>
        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
          {requests.length} Pending
        </div>
      </div>

      <div className="overflow-x-auto min-h-[200px]">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No pending departmental requests.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Requisition Name</th>
                <th className="px-6 py-4 font-medium">No. of Items</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-ministry-text">{getDepartmentName(req.departmentId)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{req.title}</p>
                    <p className="text-xs text-gray-500 font-mono">{req.requisitionNumber}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {req.items?.length || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-ministry-text">UGX {req.totalAmount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedReq(req)}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedReq(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedReq.title}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <span className="font-mono bg-gray-200 px-2 py-0.5 rounded text-xs">{selectedReq.requisitionNumber}</span>
                  <span>•</span>
                  <span>{getDepartmentName(selectedReq.departmentId)}</span>
                </p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Item Description</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Cost</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedReq.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.unitCost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{item.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-gray-900">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">Total Amount</td>
                      <td className="px-4 py-3 text-right">UGX {selectedReq.totalAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Additional Notes */}
              {selectedReq.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Requester Notes</h4>
                  <p className="text-sm text-yellow-900">{selectedReq.notes}</p>
                </div>
              )}

              {/* Action Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a comment <span className="text-gray-400 font-normal">(Required for rejection)</span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-ministry-orange focus:border-transparent h-24 resize-none"
                  placeholder="Enter reason for rejection or approval note..."
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 transition-opacity">
              <button
                onClick={() => handleAction('Rejected')}
                disabled={processing}
                className="px-5 py-2.5 bg-white border border-red-200 text-red-700 font-medium rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('Pending Finance')}
                disabled={processing}
                className="px-5 py-2.5 bg-ministry-orange text-white font-medium rounded-xl hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? 'Processing...' : 'Approve & Forward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentRequests;