import React, { useState, useEffect } from 'react';
import { procurementService } from '../../../services/sales/procurementService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesProcurementRequest, SalesSupplier } from '../types';

const ProcurementPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [requests, setRequests] = useState<SalesProcurementRequest[]>([]);
 const [suppliers, setSuppliers] = useState<SalesSupplier[]>([]);

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const reqs = await procurementService.getProcurementRequests(manifestId);
 const supps = await procurementService.getSuppliers(manifestId);
 setRequests(reqs);
 setSuppliers(supps);
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handleAddSupplier = async () => {
 const name = prompt('Supplier Name:');
 if (!name) return;
 try {
 await procurementService.createSupplier(manifestId, { name });
 loadData();
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handleStatusChange = async (id: string, newStatus: string) => {
 try {
 await procurementService.updateRequestStatus(id, newStatus);
 showToast('Status updated', 'success');
 loadData();
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Procurement & Suppliers</h1>
 <button onClick={handleAddSupplier} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity">
 Add Supplier
 </button>
 </div>
 
 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4">Request ID</th>
 <th className="p-4">Supplier</th>
 <th className="p-4">Order Ref</th>
 <th className="p-4">Status</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {requests.map(r => (
 <tr key={r.id}>
 <td className="p-4 font-mono">{r.id.split('-')[0].toUpperCase()}</td>
 <td className="p-4 font-medium">{(r as any).sales_suppliers?.name}</td>
 <td className="p-4 font-mono text-gray-500">{r.order_id ? r.order_id.split('-')[0].toUpperCase() : '-'}</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}>
 {r.status}
 </span>
 </td>
 <td className="p-4 text-right">
 <select 
 className="border border-gray-300 rounded bg-transparent px-2 py-1"
 value={r.status}
 onChange={(e) => handleStatusChange(r.id, e.target.value)}
 >
 <option value="NOT_ORDERED">Not Ordered</option>
 <option value="ORDERED">Ordered</option>
 <option value="SUPPLIER_OUT_OF_STOCK">Out of Stock</option>
 <option value="WAITING_SUPPLIER">Waiting</option>
 <option value="IN_TRANSIT">In Transit</option>
 <option value="RECEIVED">Received</option>
 </select>
 </td>
 </tr>
 ))}
 {requests.length === 0 && (
 <tr><td colSpan={5} className="p-8 text-center text-gray-400">No procurement requests found.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
};

export default ProcurementPage;
