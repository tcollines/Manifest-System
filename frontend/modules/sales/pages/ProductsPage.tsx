import React, { useState, useEffect } from 'react';
import { salesService } from '../../../services/sales/salesService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesCategory, SalesProduct, SalesVariant } from '../types';
import { Plus, X, Search, Package, Tags, Layers, Printer, Edit2, Trash2, QrCode, ScanLine } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import TextInput from '../../../components/ui/TextInput';
import SelectInput from '../../../components/ui/SelectInput';

const formatMoneyInput = (val: string) => {
  if (!val) return '';
  const parts = val.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};
const parseMoneyInput = (val: string) => val.replace(/,/g, '');

const ProductsPage: React.FC = () => {
 const { showToast } = useNotification();
 const manifestId = 'default_manifest'; // Keeping the hardcoded value as per original logic
 
 const [categories, setCategories] = useState<SalesCategory[]>([]);
 const [products, setProducts] = useState<SalesProduct[]>([]);
 const [variants, setVariants] = useState<SalesVariant[]>([]);

 const [activeTab, setActiveTab] = useState<'variants' | 'products' | 'categories'>('variants');
 const [isLoading, setIsLoading] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Modal States
 const [showCatModal, setShowCatModal] = useState(false);
 const [catForm, setCatForm] = useState({ name: '' });

 const [showProdModal, setShowProdModal] = useState(false);
 const [prodForm, setProdForm] = useState({ category_id: '', name: '' });

 const [showVarModal, setShowVarModal] = useState(false);
 const [varForm, setVarForm] = useState({ product_id: '', name: '', sku: '', barcode: '', existing_qr_code: '', cost_price: '', selling_price: '', _shortId: '' });
 const [showScanner, setShowScanner] = useState(false);
 const [scanTarget, setScanTarget] = useState<'barcode'|'existing_qr_code' | null>(null);

 useEffect(() => {
   if (showScanner) {
     const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 400, height: 200 },
        disableFlip: false,
        useBarCodeDetectorIfSupported: true,
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          advanced: [{ focusMode: "continuous" }] as any
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF
        ]
      }, false);
     
     scanner.render(
       (decodedText) => {
         const cleanText = decodedText.trim();
         
         if (scanTarget === 'barcode' && varForm.barcode && varForm.barcode !== cleanText) {
             if(!window.confirm('Overwrite existing barcode?')) { scanner.clear(); setShowScanner(false); return; }
         }
         if (scanTarget === 'existing_qr_code' && varForm.existing_qr_code && varForm.existing_qr_code !== cleanText) {
             if(!window.confirm('Overwrite existing QR code?')) { scanner.clear(); setShowScanner(false); return; }
         }

         setVarForm(prev => ({ ...prev, [scanTarget!]: cleanText }));
         scanner.clear();
         setShowScanner(false);
       },
       (error) => {}
     );
     return () => { scanner.clear().catch(() => {}); };
   }
 }, [showScanner, scanTarget]);

 const [editCatId, setEditCatId] = useState<string | null>(null);
 const [editProdId, setEditProdId] = useState<string | null>(null);
 const [editVarId, setEditVarId] = useState<string | null>(null);

 const updateVarFormAuto = (updates: Partial<typeof varForm>) => {
    const nextState = { ...varForm, ...updates };
    
    // Auto-generate if product or name changed
    if (updates.name !== undefined || updates.product_id !== undefined) {
       const p = products.find(prod => prod.id === nextState.product_id);
       const c = p ? categories.find(cat => cat.id === p.category_id) : null;
       
       const safeStr = (s: string) => (s || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'XXX';
       const cCode = safeStr(c?.name || '');
       const pCode = safeStr(p?.name || '');
       const vCode = safeStr(nextState.name || '');
       
       let shortId = nextState._shortId;
       if (!shortId) {
           shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
           nextState._shortId = shortId;
       }
       
       nextState.sku = `${pCode}-${vCode}-${shortId}`;
       
       const autoBarcode = `SALES-${cCode}-${pCode}-${vCode}-${shortId}`;
       if (!nextState.barcode || nextState.barcode.startsWith('SALES-') || nextState.barcode.startsWith('SYS-')) {
          nextState.barcode = autoBarcode;
       }
    }
    setVarForm(nextState);
 };

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 setIsLoading(true);
 const cats = await salesService.getCategories(manifestId);
 const prods = await salesService.getProducts(manifestId);
 const vars = await salesService.getVariants(manifestId);
 setCategories(cats);
 setProducts(prods);
 setVariants(vars);
 } catch (e: any) {
 showToast(e.message, 'error');
 } finally {
 setIsLoading(false);
 }
 };

 const handleAddCategory = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;
  if (!catForm.name) return showToast('Name is required', 'error');
  try {
  setIsSubmitting(true);
  if (editCatId) {
    await salesService.updateCategory(editCatId, catForm.name);
    showToast('Category updated successfully', 'success');
  } else {
    await salesService.createCategory(manifestId, catForm.name);
    showToast('Category created successfully', 'success');
  }
  loadData();
  setShowCatModal(false);
  setCatForm({ name: '' });
  setEditCatId(null);
  } catch (e: any) {
  showToast(e.message, 'error');
  } finally {
  setIsSubmitting(false);
  }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await salesService.deleteCategory(id);
      showToast('Category deleted successfully', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

 const handlePrintAllBarcodes = () => {
 const inStockVariants = variants.filter(v => v.stock_quantity > 0 && v.system_qr_code);
 if (inStockVariants.length === 0) return showToast('No items currently in stock to print.', 'error');

 const printWindow = window.open('', '_blank', 'width=600,height=600');
 if (!printWindow) return showToast('Pop-up blocked. Please allow pop-ups to print.', 'error');
 
 let labelsHtml = '';
 let scriptsHtml = '';
 
 inStockVariants.forEach((variant, i) => {
 labelsHtml += `
 <div class="label-container">
 <h2>${variant.name}</h2>
 <div id="qrcode-${i}" class="qr-code"></div>
 <p class="sku-text">${variant.sku}</p>
 </div>
 `;
 scriptsHtml += `
 new QRCode(document.getElementById("qrcode-${i}"), {
 text: "${variant.system_qr_code}",
 width: 100,
 height: 100,
 colorDark : "#000000",
 colorLight : "#ffffff",
 correctLevel : QRCode.CorrectLevel.M
 });
 `;
 });

 printWindow.document.write(`
 <!DOCTYPE html>
 <html>
 <head>
 <title>Print Barcodes</title>
 <style>
 @page { margin: 0; }
 body { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; margin: 0; font-family: sans-serif; background: #f0f0f0; padding: 20px; }
 .label-container { text-align: center; background: white; padding: 15px 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; page-break-after: always; width: max-content; }
 h2 { margin: 0 0 10px 0; font-size: 16px; color: #111; }
 .qr-code { display: flex; justify-content: center; margin: 0 auto; }
 .sku-text { font-size: 11px; color: #555; margin: 8px 0 0 0; font-family: monospace; }
 @media print {
 body { background: white; height: auto; display: block; padding: 0; margin: 0; }
 .label-container { box-shadow: none; padding: 0; margin: 0; text-align: center; page-break-after: always; width: 100%; border-radius: 0; }
 }
 </style>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
 </head>
 <body>
 ${labelsHtml}
 <script>
 // Initialize QR Codes
 ${scriptsHtml}
 
 // Wait for barcodes to render before triggering print
 setTimeout(() => {
 window.print();
 }, 800);

 // Close window only after printing is done or cancelled
 window.onafterprint = () => {
 window.close();
 };
 </script>
 </body>
 </html>
 `);
 printWindow.document.close();
 };

  const handlePrintSingleBarcode = (variant: SalesVariant) => {
   if (!variant.system_qr_code) return showToast('Variant has no system QR code to print.', 'error');
   const printWindow = window.open('', '_blank', 'width=600,height=600');
   if (!printWindow) return showToast('Pop-up blocked. Please allow pop-ups to print.', 'error');
   
   printWindow.document.write(`
     <!DOCTYPE html>
     <html>
     <head><title>Print Label</title>
     <style>
       @page { margin: 0; }
       body { display: flex; flex-direction: column; align-items: center; padding: 20px; font-family: sans-serif; }
       .label-container { text-align: center; }
       .qr-code { display: flex; justify-content: center; margin: 10px 0; }
       .sku-text { font-size: 11px; font-family: monospace; }
     </style>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
     </head>
     <body>
       <div class="label-container">
         <h2>${variant.name}</h2>
         <div id="qrcode" class="qr-code"></div>
         <p class="sku-text">${variant.sku}</p>
       </div>
       <script>
         new QRCode(document.getElementById("qrcode"), {
           text: "${variant.system_qr_code}", width: 100, height: 100, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M
         });
         setTimeout(() => { window.print(); }, 800);
         window.onafterprint = () => { window.close(); };
       </script>
     </body>
     </html>
   `);
   printWindow.document.close();
 };

 const handleAddProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;
  if (!prodForm.name || !prodForm.category_id) return showToast('All fields are required', 'error');
  try {
  setIsSubmitting(true);
  if (editProdId) {
    await salesService.updateProduct(editProdId, prodForm.category_id, prodForm.name);
    showToast('Product updated successfully', 'success');
  } else {
    await salesService.createProduct(manifestId, prodForm.category_id, prodForm.name);
    showToast('Product created successfully', 'success');
  }
  loadData();
  setShowProdModal(false);
  setProdForm({ category_id: '', name: '' });
  setEditProdId(null);
  } catch (e: any) {
  showToast(e.message, 'error');
  } finally {
  setIsSubmitting(false);
  }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await salesService.deleteProduct(id);
      showToast('Product deleted successfully', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;
  if (!varForm.product_id) return showToast('Base product is required', 'error');
  if (!varForm.name || !varForm.sku) return showToast('Name and SKU are required', 'error');
  try {
  setIsSubmitting(true);
  const payload = {
    product_id: varForm.product_id,
    name: varForm.name,
    sku: varForm.sku,
    barcode: (varForm.barcode && !varForm.barcode.startsWith('SALES-') && !varForm.barcode.startsWith('SYS-')) ? varForm.barcode : null,
    existing_qr_code: varForm.existing_qr_code || null,
    system_qr_code: (varForm.barcode && (varForm.barcode.startsWith('SALES-') || varForm.barcode.startsWith('SYS-'))) ? varForm.barcode : (!varForm.barcode && !varForm.existing_qr_code ? `SYS-QR-${varForm.sku}` : null),
    cost_price: Number(parseMoneyInput(varForm.cost_price || '0')),
    selling_price: Number(parseMoneyInput(varForm.selling_price || '0')),
    stock_quantity: editVarId ? undefined : 0
  };
  
  if (editVarId) {
    await salesService.updateVariant(editVarId, payload);
    showToast('Variant updated successfully', 'success');
  } else {
    await salesService.createVariant(manifestId, payload);
    showToast('Variant created successfully', 'success');
  }
  loadData();
  setShowVarModal(false);
  setVarForm({ product_id: '', name: '', sku: '', barcode: '', existing_qr_code: '', cost_price: '', selling_price: '', _shortId: '' });
  setEditVarId(null);
  } catch (e: any) {
  showToast(e.message, 'error');
  } finally {
  setIsSubmitting(false);
  }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this variant?')) return;
    try {
      await salesService.deleteVariant(id);
      showToast('Variant deleted successfully', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

 return (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
 <p className="text-gray-500 text-sm mt-1">Manage categories, products, and inventory variants.</p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button onClick={handlePrintAllBarcodes} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-2 shadow-sm">
 <Printer size={16} /> Print Labels
 </button>
 <button onClick={() => setShowCatModal(true)} className="px-3 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-2 shadow-sm">
 <Tags size={16} /> Category
 </button>
 <button onClick={() => setShowProdModal(true)} className="px-3 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-2">
 <Layers size={16} /> Product
 </button>
 <button onClick={() => setShowVarModal(true)} className="px-4 py-2 bg-ministry-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
 <Plus size={16}/> New Variant
 </button>
 </div>
 </div>

 <div className="flex gap-1 border-b border-gray-200 mb-6">
 <button 
 onClick={() => setActiveTab('variants')} 
 className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'variants' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700 '}`}
 >
 Variants ({variants.length})
 </button>
 <button 
 onClick={() => setActiveTab('products')} 
 className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700 '}`}
 >
 Products ({products.length})
 </button>
 <button 
 onClick={() => setActiveTab('categories')} 
 className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'categories' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700 '}`}
 >
 Categories ({categories.length})
 </button>
 </div>

 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
 {activeTab === 'variants' && (
 <div className="w-full">
 <div className="hidden md:block overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4 font-medium">Variant Info</th>
 <th className="p-4 font-medium">SKU / Barcode</th>
 <th className="p-4 font-medium">Pricing</th>
 <th className="p-4 font-medium text-right">Stock</th>
 <th className="p-4 font-medium text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {variants.length === 0 && !isLoading && (
 <tr><td colSpan={5} className="p-12 text-center text-gray-400">No variants found. Add a variant to get started.</td></tr>
 )}
 {variants.map(v => {
 const parentProd = products.find(p => p.id === v.product_id);
 return (
 <tr key={v.id} className="hover:bg-gray-50 transition-colors">
 <td className="p-4">
 <div className="font-semibold text-gray-900 text-base">{v.name}</div>
 <div className="text-xs text-gray-500 mt-1">{parentProd?.name || 'Unknown Product'}</div>
 </td>
 <td className="p-4">
 <div className="text-gray-700">{v.sku}</div>
 <div className="text-gray-500 font-mono text-xs mt-1">{v.barcode}</div>
 </td>
 <td className="p-4">
 <div className="text-gray-500 line-through text-xs">Cost: UGX {v.cost_price?.toLocaleString()}</div>
 <div className="font-bold text-gray-900 mt-1">UGX {v.selling_price?.toLocaleString()}</div>
 </td>
 <td className="p-4 text-right">
 <span className={`px-2 py-1 rounded-md text-xs font-bold ${v.stock_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
 {v.stock_quantity} IN STOCK
 </span>
 </td>
 <td className="p-4 text-right">
   <div className="flex items-center justify-end gap-2">
     {v.system_qr_code && (
       <button onClick={() => handlePrintSingleBarcode(v)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Print System QR">
         <Printer size={16} />
       </button>
     )}
     <button onClick={() => { setEditVarId(v.id); setVarForm({ product_id: v.product_id, name: v.name, sku: v.sku, barcode: v.barcode || '', existing_qr_code: v.existing_qr_code || '', cost_price: v.cost_price.toString(), selling_price: v.selling_price.toString(), _shortId: '' }); setShowVarModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
       <Edit2 size={16} />
     </button>
     <button onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
       <Trash2 size={16} />
     </button>
   </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table></div>
 
 <div className="md:hidden divide-y divide-gray-100">
   {variants.length === 0 && !isLoading && (
     <div className="p-12 text-center text-gray-400">No variants found.</div>
   )}
   {variants.map(v => {
     const parentProd = products.find(p => p.id === v.product_id);
     return (
       <div key={v.id} className="p-4 hover:bg-gray-50 flex flex-col gap-2">
         <div className="flex justify-between items-start">
           <div>
             <div className="font-semibold text-gray-900">{v.name}</div>
             <div className="text-xs text-gray-500 mt-0.5">{parentProd?.name || 'Unknown Product'}</div>
           </div>
           <span className={`px-2 py-1 rounded-md text-xs font-bold ${v.stock_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {v.stock_quantity} IN STOCK
           </span>
         </div>
         <div className="text-xs text-gray-500 font-mono mt-1">{v.sku} • {v.barcode}</div>
         <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
           <div className="text-gray-400 text-xs line-through">Cost: UGX {v.cost_price?.toLocaleString()}</div>
           <div className="font-bold text-ministry-orange">UGX {v.selling_price?.toLocaleString()}</div>
         </div>
         <div className="flex items-center justify-end gap-2 mt-2">
           {v.system_qr_code && (
             <button onClick={() => handlePrintSingleBarcode(v)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg transition-colors flex items-center gap-1">
               <Printer size={14} /> Print
             </button>
           )}
           <button onClick={() => { setEditVarId(v.id); setVarForm({ product_id: v.product_id, name: v.name, sku: v.sku, barcode: v.barcode || '', existing_qr_code: v.existing_qr_code || '', cost_price: v.cost_price.toString(), selling_price: v.selling_price.toString(), _shortId: '' }); setShowVarModal(true); }} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
             <Edit2 size={14} /> Edit
           </button>
           <button onClick={() => handleDeleteVariant(v.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg transition-colors flex items-center gap-1">
             <Trash2 size={14} /> Delete
           </button>
         </div>
       </div>
     );
   })}
 </div>
 </div>
 )}

 {activeTab === 'products' && (
 <div className="w-full">
 <div className="hidden md:block overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4 font-medium">Product Name</th>
 <th className="p-4 font-medium">Category</th>
 <th className="p-4 font-medium">Date Created</th>
 <th className="p-4 font-medium text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {products.length === 0 && !isLoading && (
 <tr><td colSpan={4} className="p-12 text-center text-gray-400">No products found. Add a product to get started.</td></tr>
 )}
 {products.map(p => {
 const cat = categories.find(c => c.id === p.category_id);
 return (
 <tr key={p.id} className="hover:bg-gray-50 transition-colors">
 <td className="p-4 font-semibold text-gray-900 text-base">{p.name}</td>
 <td className="p-4 text-gray-500">
 <span className="bg-gray-100 px-2 py-1 rounded text-xs">{cat?.name || 'Unknown'}</span>
 </td>
 <td className="p-4 text-gray-500">{new Date(p.created_at || '').toLocaleDateString()}</td>
 <td className="p-4 text-right">
   <div className="flex items-center justify-end gap-2">
     <button onClick={() => { setEditProdId(p.id); setProdForm({ category_id: p.category_id, name: p.name }); setShowProdModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
       <Edit2 size={16} />
     </button>
     <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
       <Trash2 size={16} />
     </button>
   </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table></div>
 
 <div className="md:hidden divide-y divide-gray-100">
   {products.length === 0 && !isLoading && (
     <div className="p-12 text-center text-gray-400">No products found.</div>
   )}
   {products.map(p => {
     const cat = categories.find(c => c.id === p.category_id);
     return (
       <div key={p.id} className="hover:bg-gray-50">
        <div className="p-4 flex justify-between items-center">
         <div>
           <div className="font-semibold text-gray-900">{p.name}</div>
           <div className="text-xs text-gray-400 mt-1">{new Date(p.created_at || '').toLocaleDateString()}</div>
         </div>
         <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">{cat?.name || 'Unknown'}</span>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 pb-4 bg-transparent mt-[-8px]">
           <button onClick={() => { setEditProdId(p.id); setProdForm({ category_id: p.category_id, name: p.name }); setShowProdModal(true); }} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
             <Edit2 size={14} /> Edit
           </button>
           <button onClick={() => handleDeleteProduct(p.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg transition-colors flex items-center gap-1">
             <Trash2 size={14} /> Delete
           </button>
        </div>
       </div>
     );
   })}
 </div>
 </div>
 )}

 {activeTab === 'categories' && (
 <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {categories.length === 0 && !isLoading && (
 <div className="col-span-full py-12 text-center text-gray-400">No categories found. Add a category to get started.</div>
 )}
 {categories.map(c => (
 <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500">
 <Tags size={18} />
 </div>
 <div>
 <h3 className="font-semibold text-gray-900">{c.name}</h3>
 <p className="text-xs text-gray-500">ID: {c.id.substring(0, 8)}...</p>
 </div>
 </div>
 <div className="flex items-center justify-end gap-2">
   <button onClick={() => { setEditCatId(c.id); setCatForm({ name: c.name }); setShowCatModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
     <Edit2 size={16} />
   </button>
   <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
     <Trash2 size={16} />
   </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Scanner Modal */}
 {showScanner && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
   <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col">
    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
     <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
      Scan Code
     </h2>
     <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
      <X size={20}/>
     </button>
    </div>
    <div className="p-4">
      <div id="reader" className="w-full"></div>
    </div>
   </div>
  </div>
 )}

 {/* Category Modal */}
 {showCatModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
  <Tags size={20} className="text-ministry-orange" />
  {editCatId ? 'Edit Category' : 'New Category'}
  </h2>
  <button onClick={() => { setShowCatModal(false); setEditCatId(null); setCatForm({name: ''}); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
  <X size={20}/>
  </button>
  </div>
  
  <form onSubmit={handleAddCategory} className="flex-1 overflow-y-auto p-6 space-y-4">
  <TextInput label="Category Name" value={catForm.name} onChange={(e) => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. T-Shirts" required />
  <div className="pt-4">
    <button type="submit" disabled={isSubmitting} className={`w-full text-white rounded-xl py-3 font-bold transition-colors ${isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-ministry-orange hover:bg-orange-600'}`}>{isSubmitting ? (editCatId ? 'Updating...' : 'Creating...') : (editCatId ? 'Update Category' : 'Create Category')}</button>
  </div>
  </form>
  </div>
  </div>
 )}

 {/* Product Modal */}
 {showProdModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
  <Layers size={20} className="text-ministry-orange" />
  {editProdId ? 'Edit Product' : 'New Product'}
  </h2>
  <button onClick={() => { setShowProdModal(false); setEditProdId(null); setProdForm({category_id: '', name: ''}); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
  <X size={20}/>
  </button>
  </div>
  
  <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
  <SelectInput 
  label="Category" 
  value={prodForm.category_id} 
  onChange={(e) => setProdForm({...prodForm, category_id: e.target.value})} 
  options={categories.map(c => ({ value: c.id, label: c.name }))}
  required
  />
  <TextInput label="Product Name" value={prodForm.name} onChange={(e) => setProdForm({...prodForm, name: e.target.value})} placeholder="e.g. Manifesto Tour Tee" required />
  <div className="pt-4">
    <button type="submit" disabled={isSubmitting} className={`w-full text-white rounded-xl py-3 font-bold transition-colors ${isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-ministry-orange hover:bg-orange-600'}`}>{isSubmitting ? (editProdId ? 'Updating...' : 'Creating...') : (editProdId ? 'Update Product' : 'Create Product')}</button>
  </div>
  </form>
  </div>
  </div>
 )}

 {/* Variant Modal */}
 {showVarModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
  <Package size={20} className="text-ministry-orange" />
  {editVarId ? 'Edit Variant' : 'New Variant'}
  </h2>
  <button onClick={() => { setShowVarModal(false); setEditVarId(null); setVarForm({ product_id: '', name: '', sku: '', barcode: '', existing_qr_code: '', cost_price: '', selling_price: '', _shortId: '' }); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
  <X size={20}/>
  </button>
  </div>
  
  <form onSubmit={handleAddVariant} className="flex-1 overflow-y-auto p-6 space-y-5">
  <SelectInput 
  label="Base Product" 
  value={varForm.product_id} 
  onChange={(e) => updateVarFormAuto({ product_id: e.target.value })} 
  options={products.map(p => ({ value: p.id, label: p.name }))}
  required
  disabled={!!editVarId}
  />
  <TextInput label="Variant Name" value={varForm.name} onChange={(e) => updateVarFormAuto({ name: e.target.value })} placeholder="e.g. Black / Large" required />
  
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <TextInput label="SKU" value={varForm.sku} onChange={(e) => setVarForm({...varForm, sku: e.target.value})} placeholder="e.g. MGP-BLK-L" disabled required />
  
  <div className="flex items-end gap-2">
    <div className="flex-1">
      <TextInput label="System / Manufacturer Barcode" value={varForm.barcode} onChange={(e) => setVarForm({...varForm, barcode: e.target.value})} placeholder="e.g. 123456789012" />
    </div>
    <button type="button" onClick={() => {setScanTarget('barcode'); setShowScanner(true);}} className="h-[42px] px-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 flex items-center justify-center">
      <ScanLine size={18} />
    </button>
  </div>
  
  <div className="flex items-end gap-2 sm:col-span-2">
    <div className="flex-1">
      <TextInput label="Existing QR Code" value={varForm.existing_qr_code} onChange={(e) => setVarForm({...varForm, existing_qr_code: e.target.value})} placeholder="Scan or enter existing QR code" />
    </div>
    <button type="button" onClick={() => {setScanTarget('existing_qr_code'); setShowScanner(true);}} className="h-[42px] px-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 flex items-center justify-center">
      <QrCode size={18} />
    </button>
  </div>
  </div>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
  <input 
     type="text" 
     inputMode="numeric" 
     required 
     onWheel={e => e.currentTarget.blur()} 
     onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
     value={formatMoneyInput(varForm.cost_price)} 
     onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setVarForm({...varForm, cost_price: raw}); }} 
     className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 font-mono" 
   />
  </div>
  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
  <input 
     type="text" 
     inputMode="numeric" 
     required 
     onWheel={e => e.currentTarget.blur()} 
     onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
     value={formatMoneyInput(varForm.selling_price)} 
     onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setVarForm({...varForm, selling_price: raw}); }} 
     className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 font-mono" 
   />
  </div>
  </div>
  
  <div className="pt-4 mt-2 border-t border-gray-100">
  <button type="submit" disabled={isSubmitting} className={`w-full text-white rounded-xl py-3 font-bold transition-colors ${isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-ministry-orange hover:bg-orange-600'}`}>{isSubmitting ? (editVarId ? 'Updating...' : 'Creating...') : (editVarId ? 'Update Variant' : 'Create Variant')}</button>
  </div>
  </form>
  </div>
  </div>
 )}
 </div>
 );
};

export default ProductsPage;
