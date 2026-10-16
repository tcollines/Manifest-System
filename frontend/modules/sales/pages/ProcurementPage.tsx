import React, { useState, useEffect, useCallback } from 'react';
import { procurementService } from '../../../services/sales/procurementService';
import { salesService } from '../../../services/sales/salesService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { SalesProcurementRequest, SalesSupplier, SalesVariant, SalesProcurementRequestItem } from '../types';
import { X, Plus, Package, Truck, Search, ShoppingCart, CheckCircle, Edit, Trash2, Eye, DollarSign, CreditCard, FileText } from 'lucide-react';
import TextInput from '../../../components/ui/TextInput';
import { procurementPaymentService } from '../../../services/sales/procurementPaymentService';
import { accountService, MoneyAccount } from '../../../services/sales/accountService';
import { PAYMENT_METHODS, defaultMethodForAccount } from '../constants';
import { SalesProcurementPayment } from '../types';
import { GoodsReceiptsTab } from '../components/GoodsReceiptsTab';
import { SupplierStatementPanel } from '../components/SupplierStatementPanel';

/**
 * Shillings are whole numbers. VALIDATION_RULES section 1.3 has amounts cross
 * the wire as integers and the payment schema rejects a fractional amount
 * outright rather than rounding it, so the payment inputs refuse a decimal
 * point on the way in instead of letting someone type an amount the server
 * will not accept.
 */
const formatShillings = (digits: string) =>
  digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
const toShillingDigits = (val: string) => val.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
const parseShillings = (val: string) => {
  const digits = val.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

type Tab = 'REQUESTS' | 'SUPPLIERS' | 'GOODS_RECEIPTS';

const ProcurementPage: React.FC = () => {
  const { showToast } = useNotification();
  const manifestId = 'default_manifest';
  
  const [activeTab, setActiveTab] = useState<Tab>('REQUESTS');
  
  const fetchRequests = useCallback(async (page: number) => {
    return await procurementService.getProcurementRequests(manifestId, page, 20);
  }, [manifestId]);

  const { data: requests, isLoading: requestsLoading, sentinelRef: requestsSentinel, reset: resetRequests } = useInfiniteScroll<SalesProcurementRequest>({
    fetchData: fetchRequests,
    initialPage: 1
  });

  const [suppliers, setSuppliers] = useState<SalesSupplier[]>([]);
  const [variants, setVariants] = useState<SalesVariant[]>([]);

  // The open statement is tracked by id rather than by holding the supplier
  // object, so a reload of `suppliers` cannot leave the panel rendering a stale
  // copy of a record that has since changed.
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(null);
  const statementSupplier = suppliers.find(s => s.id === statementSupplierId) ?? null;

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
  const [initialPaymentAccountId, setInitialPaymentAccountId] = useState<string>('');

  // Money accounts. A supplier payment must name the account the money leaves,
  // otherwise it never reaches the cash position — so these are loaded up front
  // and both payment forms are blocked when none exist.
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);

  // Payment Modal
  const [paymentModalPO, setPaymentModalPO] = useState<SalesProcurementRequest | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [poPayments, setPoPayments] = useState<SalesProcurementPayment[]>([]);
  // Non-null while an existing payment is being edited: the same form records a
  // new payment or saves changes to this one.
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

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
      resetRequests();
      const supps = await procurementService.getSuppliers(manifestId);
      const vars = await salesService.getVariants(manifestId);
      setSuppliers(supps);
      setVariants(vars);

      // Accounts come back as ServiceResponse, so a failure here is reported
      // rather than swallowed — without accounts no payment can be recorded and
      // the user needs to know why the form is disabled.
      const accountsRes = await accountService.getAccounts();
      if (accountsRes.status === 'success') {
        setAccounts(accountsRes.data.filter(a => a.isActive));
      } else {
        showToast(`Could not load money accounts: ${accountsRes.message}`, 'error');
      }
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
        const initialAmount = parseShillings(initialPaymentAmount);
        if (initialAmount > 0 && !initialPaymentAccountId) {
          return showToast('Choose the account the initial payment leaves', 'error');
        }

        // The order is created with no payment attached, then the payment goes
        // through the supplier-payment RPC. createRequestWithItems' own
        // initialPayment branch still runs the legacy direct insert, which
        // records no account and so never reaches the cash position — passing
        // it here would reintroduce exactly the row this change stops writing.
        const created = await procurementService.createRequestWithItems(
          manifestId,
          { supplier_id: poSupplierId },
          itemsToInsert
        );
        showToast('Purchase Order created', 'success');

        if (initialAmount > 0) {
          const res = await procurementPaymentService.recordSupplierPayment(poSupplierId, {
            amount: initialAmount,
            accountId: initialPaymentAccountId,
            paymentMethod: initialPaymentMethod,
            procurementRequestId: created.id,
            notes: 'Initial payment on creation'
          });
          if (res.status === 'error') {
            // The order exists and only the payment failed. Say precisely that,
            // so nobody re-creates the order trying to get the payment through.
            showToast(`Order created, but the payment was not recorded: ${res.message}`, 'error');
          }
        }
      }

      loadData();
      setShowPOModal(false);
      setEditingPoId(null);
      setPoSupplierId('');
      setPoItems([]);
      setInitialPaymentAmount('');
      setInitialPaymentMethod('Cash');
      setInitialPaymentAccountId('');
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

  /**
   * Preselects an account only when there is exactly one to choose. With
   * several, the user picks: the choice moves a real balance, and silently
   * defaulting to whichever happened to load first is how money leaves the
   * wrong account.
   */
  const defaultAccountSelection = () => {
    if (accounts.length !== 1) return { id: '', method: 'Cash' as string };
    const only = accounts[0];
    return { id: only.id, method: defaultMethodForAccount(only.accountType, only.provider) as string };
  };

  const openPaymentModal = async (po: SalesProcurementRequest) => {
    try {
      const payments = await procurementPaymentService.getPaymentsForRequest(po.id);
      const preset = defaultAccountSelection();
      setPoPayments(payments);
      setPaymentModalPO(po);
      resetPaymentForm(preset);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  /** Keeps the method in step with the account, while leaving it overridable. */
  const handleAccountChange = (accountId: string, setMethod: (m: string) => void) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) setMethod(defaultMethodForAccount(account.accountType, account.provider));
  };

  /** Clears the form back to "record a new payment". */
  const resetPaymentForm = (preset?: { id: string; method: string }) => {
    const p = preset ?? defaultAccountSelection();
    setEditingPaymentId(null);
    setPaymentAmount('');
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentDate('');
    setPaymentAccountId(p.id);
    setPaymentMethod(p.method);
  };

  /**
   * Re-reads the payments and brings the modal header back in step.
   *
   * balance_due comes from the RPC, which recomputed it inside the same
   * transaction; amount_paid is the sum of the rows just re-read. Neither is
   * guessed from the previous values — the RPC allows overpayment on account,
   * so adding or subtracting locally would disagree with the database.
   */
  const refreshAfterPaymentChange = async (requestBalanceDue: number | null) => {
    if (!paymentModalPO) return;
    loadData();
    const updated = await procurementPaymentService.getPaymentsForRequest(paymentModalPO.id);
    setPoPayments(updated);
    setPaymentModalPO(prev => {
      if (!prev) return null;
      const paid = updated.reduce((sum, p) => sum + Number(p.amount), 0);
      const due = requestBalanceDue ?? Math.max(0, prev.total_amount - paid);
      let status = 'UNPAID';
      if (due === 0 && prev.total_amount > 0) status = 'PAID';
      else if (prev.total_amount === 0 && paid === 0) status = 'PAID';
      else if (paid > 0 && due > 0) status = 'PARTIAL';
      return { ...prev, amount_paid: paid, balance_due: due, payment_status: status };
    });
  };

  const startEditPayment = (p: SalesProcurementPayment) => {
    setEditingPaymentId(p.id);
    setPaymentAmount(formatShillings(toShillingDigits(String(p.amount))));
    setPaymentAccountId(p.account_id || '');
    setPaymentMethod(p.payment_method || 'Cash');
    setPaymentRef(p.transaction_reference || '');
    setPaymentNotes(p.notes || '');
    // Sliced from the ISO string rather than parsed into a Date: these are
    // stored as a Kampala calendar date at UTC midnight, and running them
    // through the browser's local timezone can move them a day.
    setPaymentDate(String(p.payment_date || '').slice(0, 10));
  };

  /**
   * Records a new payment, or saves changes to the one being edited.
   *
   * The pre-flight overdraft check differs between the two. Recording exposes
   * the account to the whole amount; editing only exposes it to the increase,
   * because the old amount is already debited — unless the account itself
   * changed, in which case the new one takes the full amount. This mirrors what
   * the RPC tests, so the message arrives before the round trip rather than
   * after it.
   */
  const handleSavePayment = async () => {
    if (!paymentModalPO || savingPayment) return;
    const amt = parseShillings(paymentAmount);
    if (amt <= 0) return showToast('Amount must be greater than zero', 'error');
    if (!paymentAccountId) return showToast('Choose the account the money leaves', 'error');

    const editing = editingPaymentId ? poPayments.find(p => p.id === editingPaymentId) : null;
    if (editingPaymentId && !editing) return showToast('That payment is no longer listed', 'error');

    const account = accounts.find(a => a.id === paymentAccountId);
    if (account && account.accountType !== 'BANK') {
      const exposure = editing && editing.account_id === paymentAccountId
        ? amt - Number(editing.amount)
        : amt;
      if (exposure > account.balance) {
        return showToast(
          `${account.name} holds UGX ${account.balance.toLocaleString()}, less than UGX ${exposure.toLocaleString()}`,
          'error'
        );
      }
    }

    setSavingPayment(true);
    const res = editingPaymentId
      ? await procurementPaymentService.updateSupplierPayment(editingPaymentId, {
          amount: amt,
          accountId: paymentAccountId,
          paymentMethod,
          paymentDate: paymentDate || undefined,
          reference: paymentRef,
          notes: paymentNotes
        })
      : await procurementPaymentService.recordSupplierPayment(paymentModalPO.supplier_id, {
          amount: amt,
          accountId: paymentAccountId,
          paymentMethod,
          paymentDate: paymentDate || undefined,
          procurementRequestId: paymentModalPO.id,
          reference: paymentRef,
          notes: paymentNotes
        });
    setSavingPayment(false);

    if (res.status === 'error') {
      // The backend message is the specific one — "Cash has 88,000, needs
      // 150,000", "Jan 2020 is closed" — so it is shown rather than replaced
      // with a generic failure.
      return showToast(res.message, 'error');
    }

    showToast(editingPaymentId ? 'Payment updated' : 'Payment recorded successfully', 'success');
    await refreshAfterPaymentChange(res.data.requestBalanceDue);
    resetPaymentForm();
  };

  const handleDeletePayment = async (p: SalesProcurementPayment) => {
    if (!paymentModalPO) return;
    const when = new Date(p.payment_date).toLocaleDateString();
    if (!window.confirm(
      `Delete the UGX ${Number(p.amount).toLocaleString()} payment dated ${when}?

` +
      `The account it came from goes back up by that amount, and the order's balance is recalculated. ` +
      `This cannot be undone.`
    )) return;

    const res = await procurementPaymentService.deleteSupplierPayment(p.id);
    if (res.status === 'error') return showToast(res.message, 'error');

    showToast('Payment deleted', 'success');
    if (editingPaymentId === p.id) resetPaymentForm();
    await refreshAfterPaymentChange(res.data.requestBalanceDue);
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
          {activeTab === 'SUPPLIERS' && (
            <button onClick={() => setShowSupplierModal(true)} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-sm flex items-center gap-2">
              <Plus size={16} /> Add Supplier
            </button>
          )}
          {activeTab === 'REQUESTS' && (
            <button onClick={() => { setEditingPoId(null); setPoSupplierId(''); setPoItems([]); setShowPOModal(true); }} className="px-4 py-2 bg-ministry-orange text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-sm flex items-center gap-2">
              <ShoppingCart size={16} /> Create PO
            </button>
          )}
          {/* Goods receipts are read-only here: the POST endpoint exists but
              recording a receipt belongs with the stock side of procurement. */}
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
          onClick={() => setActiveTab('GOODS_RECEIPTS')}
          className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'GOODS_RECEIPTS' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Goods Receipts
        </button>
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'SUPPLIERS' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Suppliers
        </button>
      </div>

      {activeTab === 'GOODS_RECEIPTS' && <GoodsReceiptsTab suppliers={suppliers} />}
      
      {activeTab === 'REQUESTS' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full">
          <div className="hidden md:block overflow-x-auto">
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
                          className="w-11 h-11 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit PO"
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      {r.status !== 'DRAFT' && (
                        <button 
                          onClick={() => openViewModal(r)}
                          className="w-11 h-11 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                          title="View PO"
                        >
                          <Eye size={16} />
                        </button>
                      )}

                      {r.status !== 'RECEIVED' && r.status !== 'CANCELLED' && r.status !== 'DRAFT' && (
                        <button 
                          onClick={() => openReceiveModal(r)}
                          className="w-11 h-11 flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Receive Items"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}

                      {r.status !== 'DRAFT' && (
                        <button 
                          onClick={() => openPaymentModal(r)}
                          className="w-11 h-11 flex items-center justify-center bg-orange-50 text-ministry-orange hover:bg-orange-100 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <CreditCard size={16} />
                        </button>
                      )}

                      <button 
                        onClick={() => handleDeletePO(r.id)}
                        className="w-11 h-11 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete PO"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No purchase orders found.</td></tr>
                )}
              </tbody>
            </table>
            {requestsLoading && <div className="p-4 text-center text-sm text-gray-500">Loading orders...</div>}
            <div ref={requestsSentinel} className="h-4" />
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {requests.length === 0 && (
              <div className="p-8 text-center text-gray-400">No purchase orders found.</div>
            )}
            {requests.map(r => (
              <div key={r.id} className="p-4 hover:bg-gray-50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900">{(r as any).sales_suppliers?.name || 'Unknown Supplier'}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">#{r.id.split('-')[0].toUpperCase()} • {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">UGX {Number(r.total_amount).toLocaleString()}</div>
                    <div className="text-xs">
                      {Number(r.balance_due) > 0 ? (
                        <span className="text-red-500 font-medium">Due: {Number(r.balance_due).toLocaleString()}</span>
                      ) : (
                        <span className="text-green-600 font-medium">Paid in full</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${r.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : r.payment_status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                    {r.payment_status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-gray-50">
                  <select 
                    className="border border-gray-200 rounded-md bg-gray-50 text-xs px-2 py-1.5 focus:outline-none focus:border-ministry-orange disabled:opacity-50 flex-1 min-w-[120px]"
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
                  
                  <div className="flex gap-1">
                    {r.status === 'DRAFT' && (
                      <button onClick={() => openEditPOModal(r)} className="w-11 h-11 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Edit PO">
                        <Edit size={16} />
                      </button>
                    )}
                    {r.status !== 'DRAFT' && (
                      <button onClick={() => openViewModal(r)} className="w-11 h-11 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors" title="View PO">
                        <Eye size={16} />
                      </button>
                    )}
                    {r.status !== 'RECEIVED' && r.status !== 'CANCELLED' && r.status !== 'DRAFT' && (
                      <button onClick={() => openReceiveModal(r)} className="w-11 h-11 flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition-colors" title="Receive Items">
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {r.status !== 'DRAFT' && (
                      <button onClick={() => openPaymentModal(r)} className="w-11 h-11 flex items-center justify-center bg-orange-50 text-ministry-orange hover:bg-orange-100 rounded-md transition-colors" title="Record Payment">
                        <CreditCard size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDeletePO(r.id)} className="w-11 h-11 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Delete PO">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {requestsLoading && <div className="p-4 text-center text-sm text-gray-500">Loading orders...</div>}
            <div ref={requestsSentinel} className="h-4" />
          </div>
        </div>
      )}

      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                  <th className="p-4">Supplier Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4 text-right">Added On</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {suppliers.map(s => (
                  <tr key={s.id} className={statementSupplierId === s.id ? 'bg-orange-50/60' : ''}>
                    <td className="p-4 font-medium text-gray-900">{s.name}</td>
                    <td className="p-4 text-gray-500">{s.contact_info || '-'}</td>
                    <td className="p-4 text-right text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setStatementSupplierId(statementSupplierId === s.id ? null : s.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ministry-orange bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
                      >
                        <FileText size={14} />
                        {statementSupplierId === s.id ? 'Hide statement' : 'Statement'}
                      </button>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">No suppliers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {suppliers.length === 0 && (
              <div className="p-8 text-center text-gray-400">No suppliers found.</div>
            )}
            {suppliers.map(s => (
              <div key={s.id} className="p-4 hover:bg-gray-50 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{s.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.contact_info || 'No contact info'}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => setStatementSupplierId(statementSupplierId === s.id ? null : s.id)}
                  className="shrink-0 w-11 h-11 flex items-center justify-center bg-orange-50 text-ministry-orange hover:bg-orange-100 rounded-md transition-colors"
                  aria-label={`${statementSupplierId === s.id ? 'Hide' : 'View'} statement for ${s.name}`}
                >
                  <FileText size={16} />
                </button>
              </div>
            ))}
          </div>
          </div>

          {/* A statement is always for one supplier, so it is a drill-down from
              this list rather than a tab of its own — the same shape as the
              cashbook panel under Money Accounts. */}
          {statementSupplier && (
            <SupplierStatementPanel
              supplier={statementSupplier}
              onClose={() => setStatementSupplierId(null)}
            />
          )}
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
              <div className="pt-4 flex justify-end gap-2 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white">
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
                                  inputMode="numeric"
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
                                  inputMode="numeric"
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
                      {accounts.length === 0 ? (
                        <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-1.5">
                          No active money account, so no payment can be recorded. Create one under
                          Financials &rarr; Money Accounts, then pay this order from its payment screen.
                        </p>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Amount Paid</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-ministry-orange"
                                placeholder="Amount..."
                                value={initialPaymentAmount}
                                onChange={e => setInitialPaymentAmount(formatShillings(toShillingDigits(e.target.value)))}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Method</label>
                              <select
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-ministry-orange"
                                value={initialPaymentMethod}
                                onChange={e => setInitialPaymentMethod(e.target.value)}
                              >
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          </div>
                          {parseShillings(initialPaymentAmount) > 0 && (
                            <div className="mt-2">
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                                Paid From <span className="text-red-500">*</span>
                              </label>
                              <select
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-ministry-orange"
                                value={initialPaymentAccountId}
                                onChange={e => {
                                  setInitialPaymentAccountId(e.target.value);
                                  handleAccountChange(e.target.value, setInitialPaymentMethod);
                                }}
                              >
                                <option value="">Select account...</option>
                                {accounts.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.name} — UGX {a.balance.toLocaleString()}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
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
                            <p className="font-medium text-gray-900 truncate max-w-[150px]">{variant?.name || 'Unknown'}</p>
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
                              className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-ministry-orange disabled:bg-gray-100 disabled:text-gray-400"
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

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
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
                            <p className="font-medium text-gray-900 truncate max-w-[150px]">{variant?.name || 'Unknown'}</p>
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

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

              {/* An order with nothing outstanding still needs the form when a
                  payment on it is being corrected — that is usually why it reads
                  as fully paid. */}
              {(Number(paymentModalPO.balance_due) > 0 || editingPaymentId) ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">
                      {editingPaymentId ? 'Edit Payment' : 'Add New Payment'}
                    </h3>
                    {editingPaymentId && (
                      <button
                        onClick={() => resetPaymentForm()}
                        className="text-xs font-bold text-gray-500 hover:text-gray-800"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                  {accounts.length === 0 && (
                    <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-4">
                      No active money account exists, so a payment cannot be recorded — every payment
                      must name the account it leaves. Create one under Financials &rarr; Money Accounts.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <TextInput
                        label="Amount Paid"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(formatShillings(toShillingDigits(e.target.value)))}
                        placeholder={`Max: ${paymentModalPO.balance_due.toLocaleString()}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Paid From <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange disabled:bg-gray-100"
                        value={paymentAccountId}
                        disabled={accounts.length === 0}
                        onChange={e => {
                          setPaymentAccountId(e.target.value);
                          handleAccountChange(e.target.value, setPaymentMethod);
                        }}
                      >
                        <option value="">Select account...</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} — UGX {a.balance.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Payment Method</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <TextInput 
                        label={paymentMethod.includes('Money') ? "Transaction ID (Optional)" : "Transaction Ref (Optional)"}
                        value={paymentRef}
                        onChange={e => setPaymentRef(e.target.value)}
                        placeholder={paymentMethod.includes('Money') ? "e.g. 123456789" : "e.g. Receipt #1234"}
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
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Payment Date {editingPaymentId ? '' : '(defaults to today)'}
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingPaymentId && (
                      <button
                        onClick={() => resetPaymentForm()}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleSavePayment}
                      disabled={accounts.length === 0 || savingPayment}
                      className="px-4 py-2 bg-ministry-orange text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingPayment ? 'Saving...' : editingPaymentId ? 'Save Changes' : 'Record Payment'}
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
                <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Ref</th>
                        <th className="p-3">Status</th>
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
                          <td className="p-3">
                            {/* Posted means the payment debited a money account and so
                                reaches the cash position. Unposted marks a legacy row
                                written before the account was recorded; editing it and
                                naming an account is what fixes it. */}
                            {p.account_id ? (
                              <span
                                className="text-[10px] uppercase font-bold text-gray-400"
                                title="Debited a money account, so it appears in the cashbook and the cash position."
                              >
                                Posted
                              </span>
                            ) : (
                              <span
                                className="text-[10px] uppercase font-bold text-orange-600"
                                title="Recorded against no money account, so it never reduced the cash position. Edit it to name one."
                              >
                                Unposted
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEditPayment(p)}
                              className={`p-1.5 rounded ${editingPaymentId === p.id
                                ? 'bg-ministry-orange/10 text-ministry-orange'
                                : 'text-gray-500 hover:bg-gray-100'}`}
                              title="Edit this payment"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete this payment"
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

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
