import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderService } from '../../../services/sales/orderService';
import { paymentService } from '../../../services/sales/paymentService';
import { fulfillmentService } from '../../../services/sales/fulfillmentService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { SalesOrder } from '../types';

const OrdersPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
 const [payOrder, setPayOrder] = useState<SalesOrder | null>(null);
 const [refundOrder, setRefundOrder] = useState<SalesOrder | null>(null);
 const [fulfillOrder, setFulfillOrder] = useState<SalesOrder | null>(null);
 const [cancelOrder, setCancelOrder] = useState<SalesOrder | null>(null);

 const [searchParams] = useSearchParams();
 const filterDate = searchParams.get('date');
 const filterStatus = searchParams.get('status');

  const fetchOrders = useCallback(async (page: number) => {
    return await orderService.getOrders(manifestId, page, 20);
  }, [manifestId]);

  const { data: orders, isLoading, hasMore, sentinelRef, reset } = useInfiniteScroll<SalesOrder>({
    fetchData: fetchOrders,
    initialPage: 1
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let matches = true;
      if (filterStatus) {
        if (filterStatus === 'PENDING') {
          // Dashboard treats anything not COMPLETED as pending.
          if (o.fulfillment_status === 'COMPLETED' || o.fulfillment_status === 'CANCELLED') {
            matches = false;
          }
        } else if (o.fulfillment_status !== filterStatus) {
          matches = false;
        }
      }
      if (filterDate === 'today') {
        // We use local date string parsing or just substring comparison. 
        // Note: created_at might be UTC, but let's do a simple date check.
        // The dashboard also uses split('T')[0] for today.
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        if (orderDate !== today) matches = false;
      }
      return matches;
    });
  }, [orders, filterStatus, filterDate]);

  const loadData = () => {
    reset();
  };

 const handlePayBalance = async () => {
   if (!payOrder) return;
   const balance = payOrder.total_amount - payOrder.amount_paid;
   if (balance <= 0) return;

   try {
     await paymentService.recordPayment(manifestId, payOrder.id, balance, 'Cash', 'Balance Payment');
     showToast('Payment recorded successfully', 'success');
     loadData();
   } catch (e: any) {
     showToast(e.message, 'error');
   } finally {
     setPayOrder(null);
   }
 };

 const handleFulfill = async () => {
   if (!fulfillOrder) return;
   try {
     await fulfillmentService.fulfillOrder(manifestId, fulfillOrder.id);
     showToast('Order items released to customer successfully', 'success');
     loadData();
   } catch (e: any) {
     showToast(e.message, 'error');
   } finally {
     setFulfillOrder(null);
   }
 };

 const handleRefund = async () => {
   if (!refundOrder) return;
   try {
     await paymentService.processRefund(manifestId, refundOrder.id, refundOrder.amount_paid, 'Customer requested refund');
     showToast('Order refunded successfully', 'success');
     loadData();
   } catch (e: any) {
     showToast(e.message, 'error');
   } finally {
     setRefundOrder(null);
   }
 };

 const handleCancel = async () => {
   if (!cancelOrder) return;
   try {
     // For unpaid orders, we just refund 0 to trigger cancellation and reservation release
     await paymentService.processRefund(manifestId, cancelOrder.id, 0, 'Order cancelled by user');
     showToast('Order cancelled successfully', 'success');
     loadData();
   } catch (e: any) {
     showToast(e.message, 'error');
   } finally {
     setCancelOrder(null);
   }
 };

 return (
   <div className="space-y-6">
     <h1 className="text-2xl font-bold text-gray-900">Orders & Fulfillment</h1>
     
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden w-full">
        <div className="hidden md:block overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-right">Paid</th>
              <th className="p-4 text-center">Payment</th>
              <th className="p-4 text-center">Fulfillment</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredOrders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-gray-600">{o.id.split('-')[0].toUpperCase()}</td>
                <td className="p-4">
                  <div className="font-medium text-gray-900">{(o as any).sales_customers?.full_name || 'Walk-in'}</div>
                  {((o as any).sales_order_items?.length > 0) && (
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-[250px]" title={(o as any).sales_order_items.map((i: any) => `${i.quantity}x ${i.sales_product_variants?.name}`).join(', ')}>
                      {(o as any).sales_order_items.map((i: any) => `${i.quantity}x ${i.sales_product_variants?.name}`).join(', ')}
                    </div>
                  )}
                </td>
                <td className="p-4 text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
                <td className="p-4 text-right font-medium">UGX {Number(o.total_amount).toLocaleString()}</td>
                <td className="p-4 text-right text-gray-500">UGX {Number(o.amount_paid).toLocaleString()}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    o.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
                    o.payment_status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                    o.payment_status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {o.payment_status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    o.fulfillment_status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                    o.fulfillment_status === 'RESERVED' ? 'bg-indigo-100 text-indigo-700' :
                    o.fulfillment_status === 'WAITING_SUPPLIER' ? 'bg-purple-100 text-purple-700' :
                    o.fulfillment_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {o.fulfillment_status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-3">
                  {o.payment_status !== 'PAID' && o.payment_status !== 'REFUNDED' && (
                    <button onClick={() => setPayOrder(o)} className="text-ministry-orange hover:underline font-medium text-xs">
                      Pay Balance
                    </button>
                  )}
                  {o.payment_status === 'PAID' && (o.fulfillment_status === 'RESERVED' || o.fulfillment_status === 'PENDING') && (
                     <button onClick={() => setFulfillOrder(o)} className="text-blue-600 hover:underline font-medium text-xs">
                       Release Items
                     </button>
                  )}
                  {(o.payment_status === 'PAID' || o.payment_status === 'PARTIAL') && o.fulfillment_status !== 'COMPLETED' && (
                     <button onClick={() => setRefundOrder(o)} className="text-red-500 hover:underline font-medium text-xs">
                       Refund & Cancel
                     </button>
                  )}
                  {o.payment_status === 'UNPAID' && o.fulfillment_status !== 'CANCELLED' && (
                     <button onClick={() => setCancelOrder(o)} className="text-gray-500 hover:text-red-500 hover:underline font-medium text-xs">
                       Cancel
                     </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
               <tr><td colSpan={8} className="p-8 text-center text-gray-400">No orders found matching the criteria.</td></tr>
            )}
          </tbody>
        </table>
        {isLoading && <div className="p-4 text-center text-sm text-gray-500">Loading orders...</div>}
        <div ref={sentinelRef} className="h-4" />
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {filteredOrders.length === 0 && (
             <div className="p-8 text-center text-gray-400">No orders found matching the criteria.</div>
          )}
          {filteredOrders.map(o => (
            <div key={o.id} className="p-4 hover:bg-gray-50 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-900">{(o as any).sales_customers?.full_name || 'Walk-in Customer'}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">#{o.id.split('-')[0].toUpperCase()} • {new Date(o.created_at).toLocaleDateString()}</div>
                  {((o as any).sales_order_items?.length > 0) && (
                    <div className="text-xs text-gray-600 mt-1">
                      {(o as any).sales_order_items.map((i: any) => `${i.quantity}x ${i.sales_product_variants?.name}`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">UGX {Number(o.total_amount).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Paid: UGX {Number(o.amount_paid).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  o.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
                  o.payment_status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                  o.payment_status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {o.payment_status}
                </span>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  o.fulfillment_status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                  o.fulfillment_status === 'RESERVED' ? 'bg-indigo-100 text-indigo-700' :
                  o.fulfillment_status === 'WAITING_SUPPLIER' ? 'bg-purple-100 text-purple-700' :
                  o.fulfillment_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {o.fulfillment_status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 mt-1 border-t border-gray-50">
                {o.payment_status !== 'PAID' && o.payment_status !== 'REFUNDED' && (
                  <button onClick={() => setPayOrder(o)} className="px-3 min-h-[44px] flex items-center justify-center bg-ministry-orange text-white rounded-md font-medium text-sm">
                    Pay Balance
                  </button>
                )}
                {o.payment_status === 'PAID' && (o.fulfillment_status === 'RESERVED' || o.fulfillment_status === 'PENDING') && (
                   <button onClick={() => setFulfillOrder(o)} className="px-3 min-h-[44px] flex items-center justify-center bg-blue-600 text-white rounded-md font-medium text-sm">
                     Release Items
                   </button>
                )}
                {(o.payment_status === 'PAID' || o.payment_status === 'PARTIAL') && o.fulfillment_status !== 'COMPLETED' && (
                   <button onClick={() => setRefundOrder(o)} className="px-3 min-h-[44px] flex items-center justify-center bg-red-100 text-red-700 rounded-md font-medium text-sm">
                     Refund
                   </button>
                )}
                {o.payment_status === 'UNPAID' && o.fulfillment_status !== 'CANCELLED' && (
                   <button onClick={() => setCancelOrder(o)} className="px-3 min-h-[44px] flex items-center justify-center bg-gray-100 text-gray-700 hover:text-red-600 rounded-md font-medium text-sm">
                     Cancel
                   </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className="p-4 text-center text-sm text-gray-500">Loading orders...</div>}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </div>

     {/* Modals */}
     {payOrder && (
       <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 text-center">
           <h2 className="text-xl font-bold mb-2 text-gray-900">Settle Balance</h2>
           <p className="text-sm text-gray-500 mb-6">
             Collect remaining <span className="font-bold text-gray-900">UGX {(payOrder.total_amount - payOrder.amount_paid).toLocaleString()}</span>
           </p>
           <div className="flex gap-3">
             <button onClick={() => setPayOrder(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
             <button onClick={handlePayBalance} className="flex-1 py-2 bg-ministry-orange text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Confirm Payment</button>
           </div>
         </div>
       </div>
     )}

     {fulfillOrder && (
       <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 text-center">
           <h2 className="text-xl font-bold mb-2 text-gray-900">Release Items</h2>
           <p className="text-sm text-gray-500 mb-6">
             Have you handed over the items to the customer for order #{fulfillOrder.id.split('-')[0].toUpperCase()}?
           </p>
           <div className="flex gap-3">
             <button onClick={() => setFulfillOrder(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
             <button onClick={handleFulfill} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Confirm Release</button>
           </div>
         </div>
       </div>
     )}

     {refundOrder && (
       <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 text-center">
           <h2 className="text-xl font-bold mb-2 text-red-600">Refund Order</h2>
           <p className="text-sm text-gray-500 mb-6">
             Are you sure you want to refund <span className="font-bold text-gray-900">UGX {Number(refundOrder.amount_paid).toLocaleString()}</span>? This will cancel any active reservations.
           </p>
           <div className="flex gap-3">
             <button onClick={() => setRefundOrder(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Go Back</button>
             <button onClick={handleRefund} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Refund & Cancel</button>
           </div>
         </div>
       </div>
     )}

     {cancelOrder && (
       <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 text-center">
           <h2 className="text-xl font-bold mb-2 text-red-600">Cancel Order</h2>
           <p className="text-sm text-gray-500 mb-6">
             Are you sure you want to cancel order #{cancelOrder.id.split('-')[0].toUpperCase()}? Any reserved items will be returned to inventory.
           </p>
           <div className="flex gap-3">
             <button onClick={() => setCancelOrder(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Go Back</button>
             <button onClick={handleCancel} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Confirm Cancel</button>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default OrdersPage;
