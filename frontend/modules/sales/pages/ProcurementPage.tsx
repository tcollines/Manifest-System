import React, { useState, useEffect } from 'react';
import { procurementService } from '../../../services/sales/procurementService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesProcurementRequest, SalesSupplier } from '../types';
import { X } from 'lucide-react';
import TextInput from '../../../components/ui/TextInput';

const ProcurementPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [requests, setRequests] = useState<SalesProcurementRequest[]>([]);
 const [suppliers, setSuppliers] = useState<SalesSupplier[]>([]);
 const [showModal, setShowModal] = useState(false);
 const [form, setForm] = useState({ name: '' });

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

 const handleAddSupplier = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.name) return showToast('Supplier Name is required', 'error');

 try {
 await procurementService.createSupplier(manifestId, { name: form.name });
 loadData();
 setShowModal(false);
 setForm({ name: '' });
 showToast('Supplier added successfully', 'success');
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
 <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-sm">
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

 {showModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
 <h2 className="text-lg font-bold text-gray-900">Add New Supplier</h2>
 <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
 <X size={20} />
 </button>
 </div>
 <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
 <div>
 <TextInput 
 label="Supplier Name"
 value={form.name}
 onChange={(e) => setForm({name: e.target.value})}
 placeholder="e.g. Acme Corporation"
 />
 </div>
 <div className="pt-4 flex justify-end gap-2">
 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
 Cancel
 </button>
 <button type="submit" className="px-4 py-2 bg-ministry-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
 Save Supplier
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

export default ProcurementPage;
