import React, { useState, useEffect } from 'react';
import { customerService } from '../../../services/sales/customerService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesCustomer } from '../types';
import { X } from 'lucide-react';
import TextInput from '../../../components/ui/TextInput';

const CustomersPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [customers, setCustomers] = useState<SalesCustomer[]>([]);
 const [showModal, setShowModal] = useState(false);
 const [form, setForm] = useState({ fullName: '', phone: '', branch: '' });

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const data = await customerService.getCustomers(manifestId);
 setCustomers(data);
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handleAddCustomer = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.fullName) return showToast('Full Name is required', 'error');

 try {
 await customerService.createCustomer(manifestId, {
 full_name: form.fullName,
 phone_number: form.phone || undefined,
 church_branch: form.branch || undefined
 });
 loadData();
 setShowModal(false);
 setForm({ fullName: '', phone: '', branch: '' });
 showToast('Customer added successfully', 'success');
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
 <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-sm">
 Add Customer
 </button>
 </div>
 
 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
 <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4">Name</th>
 <th className="p-4">Phone</th>
 <th className="p-4">Branch</th>
 <th className="p-4 text-right">Joined</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {customers.map(c => (
 <tr key={c.id}>
 <td className="p-4 font-medium text-gray-900">{c.full_name}</td>
 <td className="p-4 text-gray-500">{c.phone_number || '-'}</td>
 <td className="p-4 text-gray-500">{c.church_branch || '-'}</td>
 <td className="p-4 text-right text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
 </tr>
 ))}
 {customers.length === 0 && (
 <tr><td colSpan={4} className="p-8 text-center text-gray-400">No customers found.</td></tr>
 )}
 </tbody>
 </table></div>
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
 <h2 className="text-lg font-bold text-gray-900">Add New Customer</h2>
 <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
 <X size={20} />
 </button>
 </div>
 <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
 <div>
 <TextInput 
 label="Full Name"
 value={form.fullName}
 onChange={(e) => setForm({...form, fullName: e.target.value})}
 placeholder="e.g. John Doe"
 />
 </div>
 <div>
 <TextInput 
 label="Phone Number (Optional)"
 value={form.phone}
 onChange={(e) => setForm({...form, phone: e.target.value})}
 placeholder="e.g. +256 700 000000"
 />
 </div>
 <div>
 <TextInput 
 label="Church Branch (Optional)"
 value={form.branch}
 onChange={(e) => setForm({...form, branch: e.target.value})}
 placeholder="e.g. Kampala Central"
 />
 </div>
 <div className="pt-4 flex justify-end gap-2">
 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
 Cancel
 </button>
 <button type="submit" className="px-4 py-2 bg-ministry-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
 Save Customer
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

export default CustomersPage;
