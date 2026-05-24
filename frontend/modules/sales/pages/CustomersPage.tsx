import React, { useState, useEffect } from 'react';
import { customerService } from '../../../services/sales/customerService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesCustomer } from '../types';

const CustomersPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [customers, setCustomers] = useState<SalesCustomer[]>([]);

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

 const handleAddCustomer = async () => {
 const fullName = prompt('Full Name:');
 if (!fullName) return;
 const phone = prompt('Phone Number (Optional):');
 const branch = prompt('Church Branch (Optional):');

 try {
 await customerService.createCustomer(manifestId, {
 full_name: fullName,
 phone_number: phone || undefined,
 church_branch: branch || undefined
 });
 loadData();
 showToast('Customer added', 'success');
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
 <button onClick={handleAddCustomer} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity">
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
 </div>
 );
};

export default CustomersPage;
