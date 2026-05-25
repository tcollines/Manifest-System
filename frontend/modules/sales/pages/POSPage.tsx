import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShoppingCart, QrCode, Search, Plus, Minus, CreditCard, CheckCircle, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { salesService } from '../../../services/sales/salesService';
import { orderService } from '../../../services/sales/orderService';
import { paymentService } from '../../../services/sales/paymentService';
import { fulfillmentService } from '../../../services/sales/fulfillmentService';
import { customerService } from '../../../services/sales/customerService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesProduct, SalesVariant, SalesCustomer } from '../types';

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

 const [customers, setCustomers] = useState<SalesCustomer[]>([]);
 const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

 const manifestId = 'default_manifest'; // Ideally from context

 useEffect(() => {
   loadCatalog();
   loadCustomers();
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

 const loadCustomers = async () => {
   try {
     const custs = await customerService.getCustomers(manifestId);
     setCustomers(custs);
   } catch (err: any) {
     showToast(err.message, 'error');
   }
 };

 useEffect(() => {
   if (isScanning) {
     const scanner = new Html5QrcodeScanner("reader", { 
       fps: 10, 
       qrbox: { width: 250, height: 250 }, 
       aspectRatio: 1.0,
       disableFlip: false
     }, false);
     
     scanner.render(
       (decodedText) => {
         handleScanSuccess(decodedText);
         scanner.clear();
         setIsScanning(false);
       },
       (error) => {}
     );
     return () => { scanner.clear().catch(() => {}); };
   }
 }, [isScanning]);

 const handleScanSuccess = (barcode: string) => {
   const cleanBarcode = barcode.trim().toLowerCase();
   const variant = variants.find(v => 
     v.barcode?.toLowerCase() === cleanBarcode || 
     v.sku?.toLowerCase() === cleanBarcode
   );
   if (variant) {
     addToCart(variant);
     showToast(`Added ${variant.name} to cart`, 'success');
   } else {
     showToast(`Scanned: ${barcode} (Not found in catalog)`, 'error');
   }
 };

  const addToCart = (variant: SalesVariant) => {
    const availableStock = Math.max(0, variant.stock_quantity - (variant.reserved_quantity || 0));
    
    const existing = cart.find(item => item.variant.id === variant.id);
    if (existing) {
      if (existing.quantity >= availableStock) {
        showToast(`Cannot add more. Only ${availableStock} in stock.`, 'warning');
        return;
      }
      setCart(cart.map(item => item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (availableStock <= 0) {
        showToast('Out of stock', 'error');
        return;
      }
      setCart([...cart, { variant, quantity: 1 }]);
    }
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, delta: number) => {
    const existing = cart.find(item => item.variant.id === variantId);
    if (!existing) return;
    
    const availableStock = Math.max(0, existing.variant.stock_quantity - (existing.variant.reserved_quantity || 0));
    let newQ = Math.max(1, existing.quantity + delta);
    
    if (newQ > availableStock) {
       showToast(`Cannot exceed available stock (${availableStock})`, 'warning');
       newQ = availableStock;
    }
    
    if (newQ === existing.quantity) return; // No change needed
    
    setCart(cart.map(item => item.variant.id === variantId ? { ...item, quantity: newQ } : item));
  };

 const totalAmount = cart.reduce((sum, item) => sum + (item.variant.selling_price * item.quantity), 0);

 const handleCheckout = async () => {
   if (cart.length === 0) return;
   const paid = selectedCustomerId === '' ? totalAmount : (Number(parseMoneyInput(amountPaid)) || 0);
   
   setIsProcessing(true);
   try {
     const orderItems = cart.map(item => ({
       variant_id: item.variant.id,
       quantity: item.quantity,
       unit_price: item.variant.selling_price,
       unit_cost_price: item.variant.cost_price
     }));

     // 1. Unified Backend Checkout
     await salesService.processCheckout(manifestId, {
       orderPayload: {
         customer_id: selectedCustomerId || undefined,
         created_by: user?.name
       },
       items: orderItems,
       amountPaid: paid,
       paymentMethod: paymentMethod
     });

     if (paid >= totalAmount) {
        showToast(`Order created and fulfilled successfully.`, 'success');
     } else {
        showToast(`Order created successfully. (Partial/Unpaid)`, 'success');
     }

     setCart([]);
     setAmountPaid('');
     setSelectedCustomerId('');
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

 const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
   if (e.key === 'Enter' && searchQuery.trim() !== '') {
     const query = searchQuery.trim().toLowerCase();
     const variant = variants.find(v => 
       v.barcode?.toLowerCase() === query || v.sku?.toLowerCase() === query
     );
     
     if (variant) {
       addToCart(variant);
       showToast(`Added ${variant.name} to cart`, 'success');
       setSearchQuery('');
     } else {
       showToast('Barcode not found in catalog', 'error');
     }
   }
 };

 return (
   <div className="flex flex-col lg:flex-row gap-6 h-full">
     {/* Product Selection Area */}
     <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 p-4">
       <div className="flex items-center gap-4 mb-6">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text"
             placeholder="Scan barcode or type SKU/name..."
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             onKeyDown={handleSearchKeyDown}
             autoFocus
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

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
          {filteredVariants.map(variant => {
            const availableStock = Math.max(0, variant.stock_quantity - (variant.reserved_quantity || 0));
            return (
              <div 
                key={variant.id} 
                onClick={() => addToCart(variant)}
                className="p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-ministry-orange hover:shadow-sm transition-all flex flex-row items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{variant.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{variant.sku}</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${availableStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {availableStock} left
                  </span>
                  <span className="font-bold text-ministry-orange text-lg w-28 text-right">UGX {Number(variant.selling_price).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
     </div>

     {/* Cart Area */}
     <div className="w-full lg:w-96 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100">
       <div className="p-4 border-b border-gray-100 flex items-center gap-2">
         <ShoppingCart size={20} className="text-ministry-orange"/>
         <h2 className="font-bold text-gray-900 text-lg">Current Order</h2>
       </div>

       <div className="p-4 border-b border-gray-100 bg-gray-50">
          <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block flex items-center gap-1"><User size={12}/> Customer (Optional)</label>
          <select 
             className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ministry-orange"
             value={selectedCustomerId}
             onChange={e => setSelectedCustomerId(e.target.value)}
          >
             <option value="">-- Walk-in Customer --</option>
             {customers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} {c.phone_number ? `(${c.phone_number})` : ''}</option>
             ))}
          </select>
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
           {selectedCustomerId !== '' && (
             <div>
               <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">Amount Paid</label>
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">UGX</span>
                 <input 
                   type="text"
                   inputMode="numeric"
                   onWheel={e => e.currentTarget.blur()}
                   onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
                   className="w-full pl-14 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-ministry-orange font-mono"
                   value={formatMoneyInput(amountPaid)}
                   onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setAmountPaid(raw); }}
                 />
               </div>
             </div>
           )}
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
         {selectedCustomerId !== '' && amountPaid !== '' && Number(parseMoneyInput(amountPaid)) < totalAmount && (
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
