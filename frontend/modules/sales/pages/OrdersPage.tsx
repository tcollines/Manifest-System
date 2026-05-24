import React, { useState, useEffect } from 'react';
import { orderService } from '../../../services/sales/orderService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesOrder } from '../types';

const OrdersPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [orders, setOrders] = useState<SalesOrder[]>([]);
 const [payOrder, setPayOrder] = useState<SalesOrder | null>(null);

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const data = await orderService.getOrders(manifestId);
 setOrders(data);
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handlePayBalance = async () => {
 if (!payOrder) return;
 const balance = payOrder.total_amount - payOrder.amount_paid;
 if (balance <= 0) return;

 try {
 const newPaid = payOrder.total_amount;
 await orderService.recordPayment(manifestId, payOrder.id, balance, 'Cash', 'Balance Payment');
 await orderService.updateOrderStatus(payOrder.id, 'PAID', 'COMPLETED', newPaid);
 showToast('Payment completed and item released for fulfillment', 'success');
 loadData();
 } catch (e: any) {
 showToast(e.message, 'error');
 } finally {
 setPayOrder(null);
 }
 };

 return (
 <div className="space-y-6">
 <h1 className="text-2xl font-bold text-gray-900">Orders & Fulfillment</h1>
 
 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
 <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4">Order ID</th>
 <th className="p-4">Date</th>
 <th className="p-4 text-right">Total</th>
 <th className="p-4 text-right">Paid</th>
 <th className="p-4">Payment</th>
 <th className="p-4">Fulfillment</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {orders.map(o => (
 <tr key={o.id}>
 <td className="p-4 font-mono">{o.id.split('-')[0].toUpperCase()}</td>
 <td className="p-4">{new Date(o.created_at).toLocaleString()}</td>
 <td className="p-4 text-right font-medium">UGX {Number(o.total_amount).toLocaleString()}</td>
 <td className="p-4 text-right text-gray-500">UGX {Number(o.amount_paid).toLocaleString()}</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 o.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
 o.payment_status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
 'bg-red-100 text-red-700'
 }`}>
 {o.payment_status}
 </span>
 </td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 o.fulfillment_status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
 'bg-gray-100 text-gray-700 '
 }`}>
 {o.fulfillment_status}
 </span>
 </td>
 <td className="p-4 text-right">
 {o.payment_status === 'PARTIAL' || o.payment_status === 'UNPAID' ? (
 <button 
 onClick={() => setPayOrder(o)}
 className="text-ministry-orange hover:underline font-medium"
 >
 Pay Balance
 </button>
 ) : (
 <span className="text-gray-400 cursor-not-allowed">Settled</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table></div>
 </div>

 {payOrder && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 text-center">
 <div className="w-16 h-16 bg-orange-100 text-ministry-orange rounded-full flex items-center justify-center mx-auto mb-4">
 <span className="font-bold text-2xl">UGX</span>
 </div>
 <h2 className="text-xl font-bold mb-2 text-gray-900">Settle Balance</h2>
 <p className="text-sm text-gray-500 mb-6">
 Are you sure you want to collect the remaining balance of <span className="font-bold text-gray-900">UGX {(payOrder.total_amount - payOrder.amount_paid).toLocaleString()}</span> for order #{payOrder.id.split('-')[0].toUpperCase()}?
 </p>
 <div className="flex gap-3">
 <button onClick={() => setPayOrder(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
 <button onClick={handlePayBalance} className="flex-1 py-2 bg-ministry-orange text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Confirm Payment</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default OrdersPage;
