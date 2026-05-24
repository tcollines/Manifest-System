import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShoppingCart, QrCode, Search, Plus, Minus, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { salesService } from '../../../services/sales/salesService';
import { orderService } from '../../../services/sales/orderService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesProduct, SalesVariant } from '../types';

const formatMoneyInput = (val: string) => {
  if (!val) return '';
  const parts = val.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};
const parseMoneyInput = (val: string) => val.replace(/,/g, '');

const POSPage: React.FC = () => {
 const { user } = useAuth();
 const { showToast } = useNotification();
 const [isScanning, setIsScanning] = useState(false);
 
 const [products, setProducts] = useState<SalesProduct[]>([]);
 const [variants, setVariants] = useState<SalesVariant[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 
 const [cart, setCart] = useState<{ variant: SalesVariant; quantity: number }[]>([]);
 const [amountPaid, setAmountPaid] = useState<string>('');
 const [paymentMethod, setPaymentMethod] = useState('Cash');
 const [isProcessing, setIsProcessing] = useState(false);

 const manifestId = 'default_manifest'; // Ideally from context

 useEffect(() => {
 loadCatalog();
 }, []);

 const loadCatalog = async () => {
 try {
 const prods = await salesService.getProducts(manifestId);
 const vars = await salesService.getVariants(manifestId);
 setProducts(prods);
 setVariants(vars);
 } catch (err: any) {
 showToast(err.message, 'error');
 }
 };

 useEffect(() => {
 if (isScanning) {
 const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
 scanner.render(
 (decodedText) => {
 handleScanSuccess(decodedText);
 scanner.clear();
 setIsScanning(false);
 },
 (error) => {
 // ignore background scanning errors
 }
 );
 return () => { scanner.clear().catch(() => {}); };
 }
 }, [isScanning]);

 const handleScanSuccess = (barcode: string) => {
 const variant = variants.find(v => v.barcode === barcode);
 if (variant) {
 addToCart(variant);
 showToast(`Added ${variant.name} to cart`, 'success');
 } else {
 showToast('Barcode not found in catalog', 'error');
 }
 };

 const addToCart = (variant: SalesVariant) => {
 setCart(prev => {
 const existing = prev.find(item => item.variant.id === variant.id);
 if (existing) {
 return prev.map(item => item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
 }
 return [...prev, { variant, quantity: 1 }];
 });
 };

 const removeFromCart = (variantId: string) => {
 setCart(prev => prev.filter(item => item.variant.id !== variantId));
 };

 const updateQuantity = (variantId: string, delta: number) => {
 setCart(prev => prev.map(item => {
 if (item.variant.id === variantId) {
 const newQ = Math.max(1, item.quantity + delta);
 return { ...item, quantity: newQ };
 }
 return item;
 }));
 };

 const totalAmount = cart.reduce((sum, item) => sum + (item.variant.selling_price * item.quantity), 0);

 const handleCheckout = async () => {
 if (cart.length === 0) return;
 const paid = Number(parseMoneyInput(amountPaid)) || 0;
 
 setIsProcessing(true);
 try {
 // Payment Status Logic
 let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
 if (paid > 0 && paid < totalAmount) paymentStatus = 'PARTIAL';
 if (paid >= totalAmount) paymentStatus = 'PAID';

 // Fulfillment Rule:"NO ITEM RELEASE BEFORE FULL PAYMENT"
 const fulfillmentStatus = paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING';

 const orderItems = cart.map(item => ({
 variant_id: item.variant.id,
 quantity: item.quantity,
 unit_price: item.variant.selling_price,
 unit_cost_price: item.variant.cost_price
 }));

 const order = await orderService.createOrder(manifestId, {
 total_amount: totalAmount,
 amount_paid: paid,
 payment_status: paymentStatus,
 fulfillment_status: fulfillmentStatus,
 created_by: user?.name
 }, orderItems);

 if (paid > 0) {
 await orderService.recordPayment(manifestId, order.id, paid, paymentMethod, 'POS Checkout');
 }

 // If completed, deduct stock
 if (fulfillmentStatus === 'COMPLETED') {
 for (const item of cart) {
 const newStock = item.variant.stock_quantity - item.quantity;
 await salesService.updateVariantStock(item.variant.id, newStock);
 }
 }

 showToast(`Order created successfully. Status: ${fulfillmentStatus}`, 'success');
 setCart([]);
 setAmountPaid('');
 loadCatalog(); // refresh stock
 } catch (err: any) {
 showToast(err.message, 'error');
 } finally {
 setIsProcessing(false);
 }
 };

 const filteredVariants = variants.filter(v => 
 v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
 v.sku.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="flex flex-col lg:flex-row gap-6 h-full">
 {/* Product Selection Area */}
 <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 p-4">
 <div className="flex items-center gap-4 mb-6">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"size={18} />
 <input 
 type="text"
 placeholder="Search products by name or SKU..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ministry-orange"
 />
 </div>
 <button 
 onClick={() => setIsScanning(!isScanning)}
 className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
 >
 <QrCode size={18} />
 {isScanning ? 'Close Scanner' : 'Scan'}
 </button>
 </div>

 {isScanning && (
 <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-xl">
 <div id="reader"className="w-full max-w-sm mx-auto"></div>
 </div>
 )}

 <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
 {filteredVariants.map(variant => (
 <div 
 key={variant.id} 
 onClick={() => addToCart(variant)}
 className="p-4 border border-gray-100 rounded-xl cursor-pointer hover:border-ministry-orange hover:shadow-md transition-all flex flex-col justify-between"
 >
 <div>
 <h3 className="font-semibold text-gray-900 line-clamp-2">{variant.name}</h3>
 <p className="text-xs text-gray-500 mt-1">{variant.sku}</p>
 </div>
 <div className="mt-4 flex items-center justify-between">
 <span className="font-bold text-ministry-orange">UGX {Number(variant.selling_price).toLocaleString()}</span>
 <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
 {variant.stock_quantity} left
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Cart Area */}
 <div className="w-full lg:w-96 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100">
 <div className="p-4 border-b border-gray-100 flex items-center gap-2">
 <ShoppingCart size={20} className="text-ministry-orange"/>
 <h2 className="font-bold text-gray-900 text-lg">Current Order</h2>
 </div>

 <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
 {cart.length === 0 ? (
 <div className="text-center text-gray-400 mt-10">Cart is empty</div>
 ) : (
 cart.map(item => (
 <div key={item.variant.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
 <div className="flex justify-between items-start">
 <span className="font-medium text-gray-900">{item.variant.name}</span>
 <span className="font-bold text-gray-900">UGX {(item.variant.selling_price * item.quantity).toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-1">
 <button onClick={() => updateQuantity(item.variant.id, -1)} className="p-1 hover:bg-gray-100 rounded"><Minus size={14} /></button>
 <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
 <button onClick={() => updateQuantity(item.variant.id, 1)} className="p-1 hover:bg-gray-100 rounded"><Plus size={14} /></button>
 </div>
 <button onClick={() => removeFromCart(item.variant.id)} className="text-red-500 text-xs hover:underline">Remove</button>
 </div>
 </div>
 ))
 )}
 </div>

 <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
 <div className="flex justify-between items-center mb-4">
 <span className="text-gray-600">Total Amount</span>
 <span className="text-2xl font-bold text-gray-900">UGX {totalAmount.toLocaleString()}</span>
 </div>

 <div className="mb-4 space-y-3">
 <div>
 <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">Amount Paid</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">UGX</span>
 <input 
  type="text"
  inputMode="numeric"
  onWheel={e => e.currentTarget.blur()}
  onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
  className="w-full pl-8 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-ministry-orange font-mono"
  value={formatMoneyInput(amountPaid)}
  onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setAmountPaid(raw); }}
  />
 </div>
 </div>
 <div>
 <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">Payment Method</label>
 <div className="flex gap-2">
 {['Cash', 'Mobile Money', 'Card'].map(method => (
 <button
 key={method}
 onClick={() => setPaymentMethod(method)}
 className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${paymentMethod === method ? 'bg-ministry-orange text-white border-ministry-orange' : 'bg-white text-gray-600 border-gray-300 '}`}
 >
 {method}
 </button>
 ))}
 </div>
 </div>
 </div>

 <button 
 onClick={handleCheckout}
 disabled={cart.length === 0 || isProcessing}
 className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
 >
 {isProcessing ? 'Processing...' : (
 <>
 <CheckCircle size={20} />
 Complete Sale
 </>
 )}
 </button>
 {amountPaid !== '' && Number(parseMoneyInput(amountPaid)) < totalAmount && (
 <p className="text-xs text-orange-500 text-center mt-2">
 Note: Items will not be released until fully paid.
 </p>
 )}
 </div>
 </div>
 </div>
 );
};

export default POSPage;
