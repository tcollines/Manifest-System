import React, { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../../../services/sales/inventoryService';
import { salesService } from '../../../services/sales/salesService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { SalesStockTakingSession, SalesVariant, SalesStockTakingItem } from '../types';
import { Eye, Edit2, Trash2, X } from 'lucide-react';

const InventoryPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest';
 
  const [activeSession, setActiveSession] = useState<SalesStockTakingSession | null>(null);
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [viewSession, setViewSession] = useState<SalesStockTakingSession | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [sessionItems, setSessionItems] = useState<(SalesStockTakingItem & { variant: SalesVariant })[]>([]);

  const fetchSessions = useCallback(async (page: number) => {
    return await inventoryService.getStockTakingSessions(manifestId, page, 20);
  }, [manifestId]);

  const { data: sessions, isLoading: sessionsLoading, sentinelRef: sessionsSentinel, reset: resetSessions } = useInfiniteScroll<SalesStockTakingSession>({
    fetchData: fetchSessions,
    initialPage: 1
  });

  const fetchVariants = useCallback(async (page: number) => {
    return await salesService.getVariants(manifestId, page, 50);
  }, [manifestId]);

  const { data: variants, isLoading: variantsLoading, sentinelRef: variantsSentinel, reset: resetVariants } = useInfiniteScroll<SalesVariant>({
    fetchData: fetchVariants,
    initialPage: 1
  });

  const loadData = () => {
    resetSessions();
    resetVariants();
  };

 const handleStartSession = async () => {
 try {
 const session = await inventoryService.startStockTakingSession(manifestId);
 setActiveSession(session);
 setPhysicalCounts({});
 loadData();
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handleEditSession = (session: SalesStockTakingSession) => {
 setActiveSession(session);
 setPhysicalCounts({});
 };

 const handleDeleteSession = async () => {
 if (!deleteSessionId) return;
 try {
 await inventoryService.deleteStockTakingSession(deleteSessionId);
 showToast('Session deleted', 'success');
 loadData();
 if (activeSession?.id === deleteSessionId) setActiveSession(null);
 } catch (e: any) {
 showToast(e.message, 'error');
 } finally {
 setDeleteSessionId(null);
 }
 };

 const handleViewSession = async (session: SalesStockTakingSession) => {
 try {
 const items = await inventoryService.getStockTakingItems(session.id) as any[];
 setSessionItems(items);
 setViewSession(session);
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handleCompleteSession = async () => {
 if (!activeSession) return;
 try {
 const items = variants.map(v => {
 const physical = physicalCounts[v.id] ?? v.stock_quantity;
 const variance = physical - v.stock_quantity;
 return {
 session_id: activeSession.id,
 variant_id: v.id,
 system_quantity: v.stock_quantity,
 physical_quantity: physical,
 variance,
 reason: variance !== 0 ? 'Stock Take Adjustment' : ''
 };
 });
 
 await inventoryService.completeStockTakingSession(activeSession.id, items);
 setActiveSession(null);
 showToast('Stock taking completed and inventory updated', 'success');
 loadData();
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 return (
 <div className={`space-y-6 ${activeSession ? 'pb-24 md:pb-0' : ''}`}>
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Inventory & Stock Taking</h1>
 {!activeSession ? (
 <button onClick={handleStartSession} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity">
 Start New Stock Take
 </button>
 ) : (
 <button onClick={handleCompleteSession} className="hidden md:block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
 Complete Stock Take
 </button>
 )}
 </div>

 {activeSession && (
 <div className="bg-white p-6 rounded-xl border border-ministry-orange shadow-sm mb-6">
 <h2 className="font-bold text-lg mb-4 text-ministry-orange">Active Stock Taking Session</h2>
 <div className="hidden md:block overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="border-b border-gray-200 text-sm text-gray-500">
 <th className="py-2">Variant</th>
 <th className="py-2 text-right">System Quantity</th>
 <th className="py-2 text-right">Physical Quantity</th>
 <th className="py-2 text-right">Variance</th>
 </tr>
 </thead>
 <tbody>
 {variants.map(v => {
 const physical = physicalCounts[v.id] ?? v.stock_quantity;
 const variance = physical - v.stock_quantity;
 return (
 <tr key={v.id} className="border-b border-gray-100">
 <td className="py-3">
   <div className="font-medium">{v.name}</div>
   {((v as any).sales_products?.name || (v as any).sales_products?.description) && (
     <div className="text-xs text-gray-500 mt-0.5 max-w-[250px] truncate" title={`${(v as any).sales_products?.name || ''} ${(v as any).sales_products?.description || ''}`}>
       {(v as any).sales_products?.name} 
       {((v as any).sales_products?.name && (v as any).sales_products?.description) ? ' - ' : ''}
       {(v as any).sales_products?.description}
     </div>
   )}
 </td>
 <td className="py-3 text-right text-gray-500">{v.stock_quantity}</td>
 <td className="py-3 text-right">
 <input 
 type="number"
 inputMode="numeric"
 className="w-24 text-right border border-gray-300 rounded px-2 py-1 bg-transparent focus:outline-none focus:border-ministry-orange"
 value={physicalCounts[v.id] ?? ''}
 placeholder={v.stock_quantity.toString()}
 onChange={e => setPhysicalCounts({...physicalCounts, [v.id]: parseInt(e.target.value) || 0})}
 />
 </td>
 <td className={`py-3 text-right font-medium ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : 'text-gray-400'}`}>
 {variance > 0 ? '+' : ''}{variance}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table></div>

 <div className="md:hidden divide-y divide-gray-100">
   {variants.map(v => {
     const physical = physicalCounts[v.id] ?? v.stock_quantity;
     const variance = physical - v.stock_quantity;
     return (
       <div key={v.id} className="py-3 flex flex-col gap-2">
         <div className="flex justify-between items-start">
           <div>
             <div className="font-medium text-gray-900">{v.name}</div>
             {((v as any).sales_products?.name || (v as any).sales_products?.description) && (
               <div className="text-xs text-gray-500 mt-0.5">
                 {(v as any).sales_products?.name} 
                 {((v as any).sales_products?.name && (v as any).sales_products?.description) ? ' - ' : ''}
                 {(v as any).sales_products?.description}
               </div>
             )}
           </div>
           <span className={`font-bold mt-0.5 ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : 'text-gray-400'}`}>
             {variance > 0 ? '+' : ''}{variance}
           </span>
         </div>
         <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
           <div className="text-sm text-gray-500">System: {v.stock_quantity}</div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-gray-700">Count:</span>
             <input 
               type="number"
               inputMode="numeric"
               className="w-20 text-right border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-ministry-orange"
               value={physicalCounts[v.id] ?? ''}
               placeholder={v.stock_quantity.toString()}
               onChange={e => setPhysicalCounts({...physicalCounts, [v.id]: parseInt(e.target.value) || 0})}
             />
           </div>
         </div>
       </div>
     );
   })}
   {variantsLoading && <div className="p-4 text-center text-sm text-gray-500">Loading catalog...</div>}
   <div ref={variantsSentinel} className="h-4" />
 </div>
 </div>
 )}
 
 {/* Sticky Mobile Footer for Complete Stock Take */}
 {activeSession && (
   <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
     <button onClick={handleCompleteSession} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 active:scale-95 transition-all">
       Complete Stock Take
     </button>
   </div>
 )}

 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
 <div className="p-4 border-b border-gray-100">
 <h2 className="font-bold">Past Sessions</h2>
 </div>
 <div className="hidden md:block overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4">Session ID</th>
 <th className="p-4">Date</th>
 <th className="p-4">Status</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
  <tbody className="divide-y divide-gray-100">
  {sessions.length === 0 && !sessionsLoading ? (
    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No stock taking sessions found. Click 'Start New Stock Take' to begin.</td></tr>
  ) : (
    sessions.map(s => (
      <tr key={s.id} className="hover:bg-gray-50">
      <td className="p-4 font-mono text-xs">{s.id.split('-')[0]}</td>
      <td className="p-4">{new Date(s.created_at).toLocaleString()}</td>
      <td className="p-4">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {s.status}
      </span>
      </td>
      <td className="p-4 text-right flex justify-end gap-2">
      {s.status === 'COMPLETED' && (
      <button onClick={() => handleViewSession(s)} className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
      <Eye size={16} />
      </button>
      )}
      {s.status === 'PENDING' && (
      <button onClick={() => handleEditSession(s)} className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-ministry-orange bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors" title="Edit / Resume">
      <Edit2 size={16} />
      </button>
      )}
      <button onClick={() => setDeleteSessionId(s.id)} className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
      <Trash2 size={16} />
      </button>
      </td>
      </tr>
    ))
  )}
  </tbody>
 </table></div>
 
 <div className="md:hidden divide-y divide-gray-100">
   {sessions.map(s => (
     <div key={s.id} className="p-4 hover:bg-gray-50 flex flex-col gap-3">
       <div className="flex justify-between items-start">
         <div>
           <div className="font-mono text-sm font-semibold text-gray-900">{s.id.split('-')[0]}</div>
           <div className="text-xs text-gray-500 mt-1">{new Date(s.created_at).toLocaleString()}</div>
         </div>
         <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
           {s.status}
         </span>
       </div>
       <div className="flex justify-end gap-2 pt-2 mt-1 border-t border-gray-50">
         {s.status === 'COMPLETED' && (
         <button onClick={() => handleViewSession(s)} className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg text-xs font-medium" title="View Details">
           View Session
         </button>
         )}
         {s.status === 'PENDING' && (
         <button onClick={() => handleEditSession(s)} className="px-3 py-1.5 text-ministry-orange bg-orange-50 rounded-lg text-xs font-medium" title="Edit / Resume">
           Resume
         </button>
         )}
         <button onClick={() => setDeleteSessionId(s.id)} className="px-3 py-1.5 text-red-600 bg-red-50 rounded-lg text-xs font-medium" title="Delete">
           Delete
         </button>
       </div>
     </div>
   ))}
   {sessionsLoading && <div className="p-4 text-center text-sm text-gray-500">Loading sessions...</div>}
   <div ref={sessionsSentinel} className="h-4" />
 </div>
 </div>

 {viewSession && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative border border-gray-200 flex flex-col max-h-[90vh]">
 <button onClick={() => setViewSession(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1"><X size={20} /></button>
 <h2 className="text-xl font-bold mb-1 text-gray-900">Session Details</h2>
 <p className="text-xs text-gray-500 font-mono mb-4">{viewSession.id}</p>
 
 <div className="overflow-y-auto overflow-x-auto flex-1 border border-gray-100 rounded-xl">
 <table className="w-full text-left min-w-[400px]">
 <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 sticky top-0">
 <tr>
 <th className="p-3">Variant</th>
 <th className="p-3 text-right">System</th>
 <th className="p-3 text-right">Physical</th>
 <th className="p-3 text-right">Variance</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {sessionItems.length === 0 ? (
 <tr><td colSpan={4} className="p-6 text-center text-gray-400">No items found for this session</td></tr>
 ) : (
 sessionItems.map(item => (
 <tr key={item.id} className="hover:bg-gray-50">
 <td className="p-3 font-medium text-gray-900 truncate max-w-[120px]">{item.variant?.name || 'Unknown Variant'}</td>
 <td className="p-3 text-right text-gray-500">{item.system_quantity}</td>
 <td className="p-3 text-right font-bold text-gray-900">{item.physical_quantity}</td>
 <td className={`p-3 text-right font-bold ${item.variance < 0 ? 'text-red-500' : item.variance > 0 ? 'text-green-500' : 'text-gray-400'}`}>
 {item.variance > 0 ? '+' : ''}{item.variance}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}

 {deleteSessionId && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 text-center">
 <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
 <Trash2 size={32} />
 </div>
 <h2 className="text-xl font-bold mb-2 text-gray-900">Delete Session</h2>
 <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this session? This action cannot be undone.</p>
 <div className="flex gap-3">
 <button onClick={() => setDeleteSessionId(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
 <button onClick={handleDeleteSession} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">Delete</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default InventoryPage;
