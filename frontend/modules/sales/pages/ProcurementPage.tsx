import React, { useState, useEffect } from 'react';
import { procurementService } from '../../../services/sales/procurementService';
import { salesService } from '../../../services/sales/salesService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesProcurementRequest, SalesSupplier, SalesVariant, SalesProcurementRequestItem } from '../types';
import { X, Plus, Package, Truck, Search, ShoppingCart, CheckCircle, Edit, Trash2, Eye, DollarSign, CreditCard } from 'lucide-react';
import TextInput from '../../../components/ui/TextInput';
import { useAuth } from '../../../context/AuthContext';
import { procurementPaymentService } from '../../../services/sales/procurementPaymentService';
import { SalesProcurementPayment } from '../types';

const formatMoneyInput = (val: string) => {
  if (!val) return '';
  const parts = val.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};
const parseMoneyInput = (val: string) => val.replace(/,/g, '');

type Tab = 'REQUESTS' | 'SUPPLIERS';

const ProcurementPage: React.FC = () => {
  const { showToast } = useNotification();
  const { user } = useAuth();
  const manifestId = 'default_manifest';
  
  const [activeTab, setActiveTab] = useState<Tab>('REQUESTS');
  
  const [requests, setRequests] = useState<SalesProcurementRequest[]>([]);
  const [suppliers, setSuppliers] = useState<SalesSupplier[]>([]);
  const [variants, setVariants] = useState<SalesVariant[]>([]);
  
  // Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_info: '' });

  // PO Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{variant: SalesVariant, qty: number, cost: number}[]>([]);
  const [poSearch, setPoSearch] = useState('');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<string>('Cash');

  // Payment Modal
  const [paymentModalPO, setPaymentModalPO] = useState<SalesProcurementRequest | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [poPayments, setPoPayments] = useState<SalesProcurementPayment[]>([]);

  // Receive Modal
  const [receiveModalPO, setReceiveModalPO] = useState<SalesProcurementRequest | null>(null);
  const [receiveItems, setReceiveItems] = useState<SalesProcurementRequestItem[]>([]);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  // View Modal
  const [viewModalPO, setViewModalPO] = useState<SalesProcurementRequest | null>(null);
  const [viewItems, setViewItems] = useState<SalesProcurementRequestItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const reqs = await procurementService.getProcurementRequests(manifestId);
      const supps = await procurementService.getSuppliers(manifestId);
      const vars = await salesService.getVariants(manifestId);
      setRequests(reqs);
      setSuppliers(supps);
      setVariants(vars);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // --- Suppliers ---

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) return showToast('Supplier Name is required', 'error');

    try {
      await procurementService.createSupplier(manifestId, { 
        name: supplierForm.name,
        contact_info: supplierForm.contact_info || undefined
      });
      loadData();
      setShowSupplierModal(false);
      setSupplierForm({ name: '', contact_info: '' });
      showToast('Supplier added successfully', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // --- Purchase Orders ---

  const handleAddPOItem = (variant: SalesVariant) => {
    if (poItems.find(i => i.variant.id === variant.id)) return;
    setPoItems([...poItems, { variant, qty: 1, cost: variant.cost_price }]);
    setPoSearch('');
  };

  const handleUpdatePOItem = (variantId: string, field: 'qty' | 'cost', value: number) => {
    setPoItems(poItems.map(item => 
      item.variant.id === variantId ? { ...item, [field]: value } : item
    ));
  };

  const handleSavePO = async () => {
    if (!poSupplierId) return showToast('Please select a supplier', 'error');
    if (poItems.length === 0) return showToast('Please add at least one item', 'error');

    try {
      const itemsToInsert = poItems.map(item => ({
        variant_id: item.variant.id,
        quantity_ordered: item.qty,
        quantity_received: 0,
        expected_cost: item.cost
      }));

      if (editingPoId) {
        await procurementService.updateRequestWithItems(editingPoId, poSupplierId, itemsToInsert);
        showToast('Purchase Order updated', 'success');
      } else {
        await procurementService.createRequestWithItems(
          manifestId,
          { supplier_id: poSupplierId },
          itemsToInsert,
          { 
            amount: parseFloat(parseMoneyInput(initialPaymentAmount)) || 0, 
            method: initialPaymentMethod, 
            recordedBy: user?.name || 'Unknown' 
          }
        );
        showToast('Purchase Order created', 'success');
      }

      loadData();
      setShowPOModal(false);
      setEditingPoId(null);
      setPoSupplierId('');
      setPoItems([]);
      setInitialPaymentAmount('');
      setInitialPaymentMethod('Cash');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const openEditPOModal = async (po: SalesProcurementRequest) => {
    try {
      const items = await procurementService.getProcurementRequestItems(po.id);
      setEditingPoId(po.id);
      setPoSupplierId(po.supplier_id);
      setPoItems(items.map(i => ({
        variant: i.sales_product_variants!,
        qty: i.quantity_ordered,
        cost: i.expected_cost
      })));
      setShowPOModal(true);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeletePO = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Purchase Order?')) return;
    try {
      await procurementService.deleteRequest(id);
      showToast('Purchase Order deleted', 'success');
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

  const openPaymentModal = async (po: SalesProcurementRequest) => {
    try {
      const payments = await procurementPaymentService.getPaymentsForRequest(po.id);
      setPoPayments(payments);
      setPaymentModalPO(po);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModalPO) return;
    const amt = parseFloat(parseMoneyInput(paymentAmount)) || 0;
    if (amt <= 0) return showToast('Amount must be greater than zero', 'error');

    try {
      await procurementPaymentService.recordPayment(
        manifestId,
        paymentModalPO.id,
        paymentModalPO.supplier_id,
        amt,
        paymentMethod,
        user?.name || 'Unknown',
        paymentRef,
        paymentNotes
      );
      showToast('Payment recorded successfully', 'success');
      
      // Refresh PO data implicitly by reloading
      loadData();
      
      // Update local modal data
      const updatedPayments = await procurementPaymentService.getPaymentsForRequest(paymentModalPO.id);
      setPoPayments(updatedPayments);
      
      // Update the PO reference in state so the UI reflects new balance
      setPaymentModalPO(prev => prev ? { ...prev, amount_paid: prev.amount_paid + amt, balance_due: Math.max(0, prev.balance_due - amt) } : null);
      
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!paymentModalPO) return;
    if (!window.confirm('Are you sure you want to delete this payment record? This action is restricted.')) return;
    try {
      await procurementPaymentService.deletePayment(paymentId, paymentModalPO.id);
      showToast('Payment deleted successfully', 'success');
      
      loadData();
      const updatedPayments = await procurementPaymentService.getPaymentsForRequest(paymentModalPO.id);
      setPoPayments(updatedPayments);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // --- Receiving & Viewing ---

  const openReceiveModal = async (po: SalesProcurementRequest) => {
    try {
      const items = await procurementService.getProcurementRequestItems(po.id);
      setReceiveItems(items);
      setReceiveModalPO(po);
      
      // Initialize receive quantities to 0
      const initialQtys: Record<string, number> = {};
      items.forEach(item => {
        initialQtys[item.id] = 0;
      });
      setReceiveQuantities(initialQtys);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const openViewModal = async (po: SalesProcurementRequest) => {
    try {
      const items = await procurementService.getProcurementRequestItems(po.id);
      setViewItems(items);
      setViewModalPO(po);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleReceiveItems = async () => {
    if (!receiveModalPO) return;

    try {
      let totalReceivedNow = 0;
      let allFullyReceived = true;

      for (const item of receiveItems) {
        const qtyToReceive = receiveQuantities[item.id] || 0;
        if (qtyToReceive > 0) {
          totalReceivedNow += qtyToReceive;
          await procurementService.receiveProcurementItem(
            manifestId,
            item.id,
            item.variant_id,
            qtyToReceive,
            item.quantity_received,
            item.expected_cost
          );
        }
        
        // Check if this item will be fully received after this batch
        if ((item.quantity_received + qtyToReceive) < item.quantity_ordered) {
          allFullyReceived = false;
        }
      }

      if (totalReceivedNow > 0) {
        showToast(`Successfully received ${totalReceivedNow} items`, 'success');
        
        // Update PO status
        const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
        if (receiveModalPO.status !== newStatus) {
          await procurementService.updateRequestStatus(receiveModalPO.id, newStatus);
        }
        
        loadData();
        setReceiveModalPO(null);
      } else {
        showToast('No quantities entered to receive', 'error');
      }

    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const filteredVariantsForPO = variants.filter(v => 
    v.name.toLowerCase().includes(poSearch.toLowerCase()) || 
    v.sku.toLowerCase().includes(poSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
        <div className="flex gap-2">
          {activeTab === 'SUPPLIERS' ? (
            <button onClick={() => setShowSupplierModal(true)} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-sm flex items-center gap-2">
              <Plus size={16} /> Add Supplier
            </button>
          ) : (
            <button onClick={() => { setEditingPoId(null); setPoSupplierId(''); setPoItems([]); setShowPOModal(true); }} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-sm flex items-center gap-2">
              <ShoppingCart size={16} /> Create PO
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('REQUESTS')}
          className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'REQUESTS' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Purchase Orders
        </button>
        <button 
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'SUPPLIERS' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Suppliers
        </button>
      </div>
      
      {activeTab === 'REQUESTS' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4">PO Ref</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Total (UGX)</th>
                <th className="p-4 text-right">Balance Due</th>
                <th className="p-4">Status / Payment</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {requests.map(r => (
                <tr key={r.id}>
                  <td className="p-4 font-mono font-medium text-gray-900">{r.id.split('-')[0].toUpperCase()}</td>
                  <td className="p-4 font-medium text-gray-700">{(r as any).sales_suppliers?.name}</td>
                  <td className="p-4 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right font-medium text-gray-900">{Number(r.total_amount).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <span className={`font-bold ${Number(r.balance_due) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {Number(r.balance_due).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : r.payment_status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {r.payment_status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2 items-center">
                    <select 
                      className="border border-gray-200 rounded-lg bg-gray-50 text-xs px-2 py-1 focus:outline-none focus:border-ministry-orange disabled:opacity-50"
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      disabled={r.status === 'RECEIVED' || r.status === 'CANCELLED'}
                    >
                      {r.status === 'DRAFT' && <option value="DRAFT">Draft</option>}
                      <option value="ORDERED">Ordered</option>
                      {r.status === 'PARTIALLY_RECEIVED' && <option value="PARTIALLY_RECEIVED">Partially Received</option>}
                      {r.status === 'RECEIVED' && <option value="RECEIVED">Received</option>}
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    
                    {r.status === 'DRAFT' && (
                      <button 
                        onClick={() => openEditPOModal(r)}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit PO"
                      >
                        <Edit size={16} />
                      </button>
                    )}

                    {r.status !== 'DRAFT' && (
                      <button 
                        onClick={() => openViewModal(r)}
                        className="p-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                        title="View PO"
                      >
                        <Eye size={16} />
                      </button>
                    )}

                    {r.status !== 'RECEIVED' && r.status !== 'CANCELLED' && r.status !== 'DRAFT' && (
                      <button 
                        onClick={() => openReceiveModal(r)}
                        className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Receive Items"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}

                    {r.status !== 'DRAFT' && (
                      <button 
                        onClick={() => openPaymentModal(r)}
                        className="p-1.5 bg-orange-50 text-ministry-orange hover:bg-orange-100 rounded-lg transition-colors"
                        title="Record Payment"
                      >
                        <CreditCard size={16} />
                      </button>
                    )}

                    <button 
                      onClick={() => handleDeletePO(r.id)}
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete PO"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No purchase orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'SUPPLIERS' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4 text-right">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td className="p-4 font-medium text-gray-900">{s.name}</td>
                  <td className="p-4 text-gray-500">{s.contact_info || '-'}</td>
                  <td className="p-4 text-right text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-gray-400">No suppliers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Add New Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <TextInput 
                  label="Supplier Name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              <div>
                <TextInput 
                  label="Contact Info (Optional)"
                  value={supplierForm.contact_info}
                  onChange={(e) => setSupplierForm({...supplierForm, contact_info: e.target.value})}
                  placeholder="e.g. info@acme.com / +256 700 000000"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
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

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={20} className="text-ministry-orange" /> {editingPoId ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h2>
              <button onClick={() => setShowPOModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Supplier</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-ministry-orange"
                  value={poSupplierId}
                  onChange={e => setPoSupplierId(e.target.value)}
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search & Add Items */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col h-[400px]">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">Add Items to Order</h3>
                  <div className="relative mb-3 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ministry-orange"
                      placeholder="Search variants..."
                      value={poSearch}
                      onChange={e => setPoSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {filteredVariantsForPO.slice(0, 20).map(v => (
                      <div key={v.id} className="flex items-center justify-between p-2 hover:bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{v.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{v.sku}</p>
                        </div>
                        <button 
                          onClick={() => handleAddPOItem(v)}
                          disabled={poItems.some(i => i.variant.id === v.id)}
                          className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-ministry-orange hover:text-white transition-colors disabled:opacity-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Items */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col h-[400px]">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">Order Items ({poItems.length})</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-2">
                    {poItems.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm mt-10">No items added yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {poItems.map(item => (
                          <div key={item.variant.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-sm text-gray-900">{item.variant.name}</span>
                              <button onClick={() => setPoItems(poItems.filter(i => i.variant.id !== item.variant.id))} className="text-red-500 hover:text-red-700">
                                <X size={14} />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-16 shrink-0">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Qty</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-ministry-orange"
                                  value={item.qty}
                                  onChange={e => handleUpdatePOItem(item.variant.id, 'qty', parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Unit Cost</label>
                                <input 
                                  type="text" 
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-ministry-orange"
                                  value={item.cost === 0 ? '' : item.cost.toLocaleString()}
                                  onChange={e => {
                                    const rawVal = e.target.value.replace(/,/g, '');
                                    const num = parseFloat(rawVal);
                                    handleUpdatePOItem(item.variant.id, 'cost', isNaN(num) ? 0 : num);
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Total</label>
                                <div className="w-full bg-gray-200/50 border border-transparent rounded px-2 py-1 text-sm font-semibold text-gray-700">
                                  {(item.qty * item.cost).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {poItems.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-gray-200 flex justify-between items-center shrink-0">
                      <span className="font-bold text-gray-700 text-sm">Order Total:</span>
                      <span className="font-bold text-lg text-ministry-orange">
                        UGX {poItems.reduce((sum, item) => sum + (item.qty * item.cost), 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {poItems.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 shrink-0">
                      <h3 className="font-bold text-gray-800 mb-2 text-xs uppercase">Initial Supplier Payment (Optional)</h3>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Amount Paid</label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-ministry-orange"
                            placeholder="Amount..."
                            value={initialPaymentAmount}
                            onChange={e => {
                              const numeric = e.target.value.replace(/[^0-9.]/g, '');
                              setInitialPaymentAmount(formatMoneyInput(numeric));
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Method</label>
                          <select 
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-ministry-orange"
                            value={initialPaymentMethod}
                            onChange={e => setInitialPaymentMethod(e.target.value)}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Mobile Money">Mobile Money</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowPOModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleSavePO} className="px-6 py-2 bg-ministry-orange text-white rounded-lg font-bold hover:opacity-90 transition-opacity">
                {editingPoId ? 'Update Purchase Order' : 'Submit Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {receiveModalPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} className="text-ministry-orange" /> Receive Items - PO #{receiveModalPO.id.split('-')[0].toUpperCase()}
              </h2>
              <button onClick={() => setReceiveModalPO(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl text-sm mb-6 flex gap-3">
                <Truck className="shrink-0" size={20} />
                <p>Enter the quantities physically received from the supplier. This will automatically increase your stock inventory. Cost updates require manual review in the Products tab.</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-3 font-semibold">Item</th>
                      <th className="p-3 font-semibold text-center">Ordered</th>
                      <th className="p-3 font-semibold text-center">Prev. Received</th>
                      <th className="p-3 font-semibold text-center">Pending</th>
                      <th className="p-3 font-semibold">Receive Now</th>
                      <th className="p-3 font-semibold text-right">Cost Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {receiveItems.map(item => {
                      const variant = item.sales_product_variants;
                      const pending = item.quantity_ordered - item.quantity_received;
                      const hasCostVariance = variant && variant.cost_price !== item.expected_cost;
                      
                      return (
                        <tr key={item.id}>
                          <td className="p-3">
                            <p className="font-medium text-gray-900">{variant?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">{variant?.sku}</p>
                          </td>
                          <td className="p-3 text-center font-medium text-gray-900">{item.quantity_ordered}</td>
                          <td className="p-3 text-center text-gray-500">{item.quantity_received}</td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${pending > 0 ? 'text-ministry-orange' : 'text-green-600'}`}>
                              {pending}
                            </span>
                          </td>
                          <td className="p-3">
                            <input 
                              type="number"
                              min="0"
                              max={pending}
                              disabled={pending === 0}
                              className="w-24 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-ministry-orange disabled:bg-gray-100 disabled:text-gray-400"
                              value={receiveQuantities[item.id] || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceiveQuantities({...receiveQuantities, [item.id]: Math.min(val, pending)});
                              }}
                            />
                          </td>
                          <td className="p-3 text-right">
                            {hasCostVariance ? (
                              <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded font-medium border border-red-100" title={`Current Cost: ${variant.cost_price}`}>
                                Expected: {item.expected_cost.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Match</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setReceiveModalPO(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleReceiveItems} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2">
                <CheckCircle size={18} /> Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View PO Modal */}
      {viewModalPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Eye size={20} className="text-gray-500" /> View PO #{viewModalPO.id.split('-')[0].toUpperCase()}
              </h2>
              <button onClick={() => setViewModalPO(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-3 font-semibold">Item</th>
                      <th className="p-3 font-semibold text-center">Ordered</th>
                      <th className="p-3 font-semibold text-center">Received</th>
                      <th className="p-3 font-semibold text-right">Unit Cost</th>
                      <th className="p-3 font-semibold text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {viewItems.map(item => {
                      const variant = item.sales_product_variants;
                      return (
                        <tr key={item.id}>
                          <td className="p-3">
                            <p className="font-medium text-gray-900">{variant?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">{variant?.sku}</p>
                          </td>
                          <td className="p-3 text-center font-medium text-gray-900">{item.quantity_ordered}</td>
                          <td className="p-3 text-center text-gray-500">{item.quantity_received}</td>
                          <td className="p-3 text-right">UGX {item.expected_cost.toLocaleString()}</td>
                          <td className="p-3 text-right font-medium text-gray-900">
                            UGX {(item.quantity_ordered * item.expected_cost).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="bg-white px-4 py-3 border border-gray-200 rounded-lg flex gap-4 text-sm">
                  <div className="flex flex-col text-right">
                    <span className="text-gray-500 uppercase text-[10px] font-bold">Total Ordered Value</span>
                    <span className="font-bold text-gray-900">UGX {viewItems.reduce((acc, curr) => acc + (curr.quantity_ordered * curr.expected_cost), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setViewModalPO(null)} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {paymentModalPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarSign size={20} className="text-ministry-orange" /> Record Supplier Payment
              </h2>
              <button onClick={() => setPaymentModalPO(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">UGX {Number(paymentModalPO.total_amount).toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Amount Paid</p>
                  <p className="text-xl font-bold text-green-600">UGX {Number(paymentModalPO.amount_paid).toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 uppercase font-bold mb-1">Balance Due</p>
                  <p className="text-xl font-bold text-orange-700">UGX {Number(paymentModalPO.balance_due).toLocaleString()}</p>
                </div>
              </div>

              {Number(paymentModalPO.balance_due) > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm">Add New Payment</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <TextInput 
                        label="Amount Paid"
                        value={paymentAmount}
                        onChange={e => {
                          const numeric = e.target.value.replace(/[^0-9.]/g, '');
                          setPaymentAmount(formatMoneyInput(numeric));
                        }}
                        placeholder={`Max: ${paymentModalPO.balance_due.toLocaleString()}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Payment Method</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                    <div>
                      <TextInput 
                        label="Transaction Ref (Optional)"
                        value={paymentRef}
                        onChange={e => setPaymentRef(e.target.value)}
                        placeholder="e.g. Receipt #1234"
                      />
                    </div>
                    <div>
                      <TextInput 
                        label="Notes (Optional)"
                        value={paymentNotes}
                        onChange={e => setPaymentNotes(e.target.value)}
                        placeholder="Any additional info..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleRecordPayment}
                      className="px-4 py-2 bg-ministry-orange text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 text-green-800 p-4 rounded-xl text-sm mb-6 font-medium text-center">
                  This Purchase Order has been fully paid.
                </div>
              )}

              <h3 className="font-bold text-gray-900 mb-3 text-sm">Payment History</h3>
              {poPayments.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Ref</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {poPayments.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 text-gray-600">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="p-3 font-medium text-gray-900">UGX {Number(p.amount).toLocaleString()}</td>
                          <td className="p-3 text-gray-600">{p.payment_method}</td>
                          <td className="p-3 text-gray-500 text-xs">{p.transaction_reference || '-'}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeletePayment(p.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete Payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 p-4 border border-dashed border-gray-200 rounded-xl">
                  No payments recorded yet.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button onClick={() => setPaymentModalPO(null)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProcurementPage;
