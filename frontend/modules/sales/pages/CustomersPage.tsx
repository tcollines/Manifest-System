import React, { useState, useEffect } from 'react';
import { customerService } from '../../../services/sales/customerService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesCustomer, SalesCustomerHistory } from '../types';
import { X, ChevronRight, ShoppingBag, CreditCard, Clock } from 'lucide-react';
import TextInput from '../../../components/ui/TextInput';

const CustomersPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [customers, setCustomers] = useState<SalesCustomer[]>([]);
 const [showModal, setShowModal] = useState(false);
 const [form, setForm] = useState({ fullName: '', phone: '', branch: '' });
 
 const [selectedCustomer, setSelectedCustomer] = useState<SalesCustomer | null>(null);
 const [customerHistory, setCustomerHistory] = useState<SalesCustomerHistory | null>(null);
 const [loadingHistory, setLoadingHistory] = useState(false);

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

 const viewCustomer = async (customer: SalesCustomer) => {
   setSelectedCustomer(customer);
   setLoadingHistory(true);
   try {
     const history = await customerService.getCustomerHistory(customer.id);
     setCustomerHistory(history);
   } catch (e: any) {
     showToast('Failed to load history: ' + e.message, 'error');
   } finally {
     setLoadingHistory(false);
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
     
     <div className="flex gap-6 relative">
       <div className={`flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${selectedCustomer ? 'lg:w-2/3' : 'w-full'}`}>
         <div className="overflow-x-auto">
           <table className="w-full text-left min-w-[600px]">
             <thead>
               <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                 <th className="p-4">Name</th>
                 <th className="p-4">Phone</th>
                 <th className="p-4">Branch</th>
                 <th className="p-4 text-right">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 text-sm">
               {customers.map(c => (
                 <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewCustomer(c)}>
                   <td className="p-4 font-medium text-gray-900">{c.full_name}</td>
                   <td className="p-4 text-gray-500">{c.phone_number || '-'}</td>
                   <td className="p-4 text-gray-500">{c.church_branch || '-'}</td>
                   <td className="p-4 text-right text-gray-500">
                      <ChevronRight size={16} className="inline text-gray-400" />
                   </td>
                 </tr>
               ))}
               {customers.length === 0 && (
                 <tr><td colSpan={4} className="p-8 text-center text-gray-400">No customers found.</td></tr>
               )}
             </tbody>
           </table>
         </div>
       </div>

       {/* Customer Details Slide-over */}
       {selectedCustomer && (
         <div className="hidden lg:flex w-1/3 bg-white rounded-xl border border-gray-100 shadow-sm flex-col max-h-[80vh] overflow-hidden sticky top-6">
           <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
             <h2 className="font-bold text-gray-900 truncate pr-4">{selectedCustomer.full_name}</h2>
             <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
               <X size={18} />
             </button>
           </div>
           
           <div className="p-4 overflow-y-auto flex-1 bg-white">
              {loadingHistory ? (
                <div className="text-center p-8 text-gray-400">Loading history...</div>
              ) : customerHistory ? (
                <div className="space-y-6">
                   {/* Summary Cards */}
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                         <div className="text-blue-500 mb-1"><ShoppingBag size={16}/></div>
                         <div className="text-xs text-blue-600 font-semibold uppercase">Total Orders</div>
                         <div className="text-lg font-bold text-gray-900">{customerHistory.total_orders}</div>
                      </div>
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                         <div className="text-ministry-orange mb-1"><Clock size={16}/></div>
                         <div className="text-xs text-orange-600 font-semibold uppercase">Outstanding</div>
                         <div className="text-lg font-bold text-gray-900">
                           UGX {Number(customerHistory.outstanding_balance).toLocaleString()}
                         </div>
                      </div>
                   </div>
                   
                   <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                      <div className="text-green-600 mb-1"><CreditCard size={16}/></div>
                      <div className="text-xs text-green-700 font-semibold uppercase">Total Purchases</div>
                      <div className="text-xl font-bold text-gray-900">
                        UGX {Number(customerHistory.total_purchases).toLocaleString()}
                      </div>
                   </div>

                   {/* Recent Orders */}
                   <div>
                     <h3 className="font-bold text-gray-900 mb-3 text-sm border-b pb-2">Recent Orders</h3>
                     <div className="space-y-2">
                       {customerHistory.recent_orders?.map((o: any) => (
                          <div key={o.id} className="p-3 border border-gray-100 rounded-lg text-sm bg-gray-50 flex justify-between items-center">
                             <div>
                               <div className="font-semibold text-gray-900">UGX {Number(o.total_amount).toLocaleString()}</div>
                               <div className="text-xs text-gray-500 mt-1">{new Date(o.created_at).toLocaleDateString()}</div>
                             </div>
                             <div className="text-right">
                               <div className={`text-xs px-2 py-1 rounded font-semibold inline-block mb-1 ${o.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                 {o.payment_status}
                               </div>
                               <div className="text-xs text-gray-500">{o.fulfillment_status}</div>
                             </div>
                          </div>
                       ))}
                       {!customerHistory.recent_orders?.length && <div className="text-sm text-gray-400">No recent orders.</div>}
                     </div>
                   </div>

                   {/* Recent Payments */}
                   <div>
                     <h3 className="font-bold text-gray-900 mb-3 text-sm border-b pb-2">Recent Payments</h3>
                     <div className="space-y-2">
                       {customerHistory.recent_payments?.map((p: any) => (
                          <div key={p.id} className="p-3 border border-gray-100 rounded-lg text-sm flex justify-between items-center">
                             <div>
                               <div className="font-semibold text-gray-900">UGX {Number(p.amount).toLocaleString()}</div>
                               <div className="text-xs text-gray-500 mt-1">{p.payment_method} • {new Date(p.created_at).toLocaleDateString()}</div>
                             </div>
                          </div>
                       ))}
                       {!customerHistory.recent_payments?.length && <div className="text-sm text-gray-400">No recent payments.</div>}
                     </div>
                   </div>

                </div>
              ) : (
                <div className="text-center p-8 text-red-400">Error loading data.</div>
              )}
           </div>
         </div>
       )}
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
