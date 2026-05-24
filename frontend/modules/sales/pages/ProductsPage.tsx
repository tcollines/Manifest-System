import React, { useState, useEffect } from 'react';
import { salesService } from '../../../services/sales/salesService';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SalesCategory, SalesProduct, SalesVariant } from '../types';
import { Plus, X, Search, Package, Tags, Layers, Printer } from 'lucide-react';
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

 // Modal States
 const [showCatModal, setShowCatModal] = useState(false);
 const [catForm, setCatForm] = useState({ name: '' });

 const [showProdModal, setShowProdModal] = useState(false);
 const [prodForm, setProdForm] = useState({ category_id: '', name: '' });

 const [showVarModal, setShowVarModal] = useState(false);
 const [varForm, setVarForm] = useState({ product_id: '', name: '', sku: '', barcode: '', cost_price: '', selling_price: '', _shortId: '' });

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
       
       nextState.sku = `${pCode}-${vCode}`;
       nextState.barcode = `SALES-${cCode}-${pCode}-${vCode}-${shortId}`;
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
 if (!catForm.name) return showToast('Name is required', 'error');
 try {
 await salesService.createCategory(manifestId, catForm.name);
 loadData();
 setShowCatModal(false);
 setCatForm({ name: '' });
 showToast('Category created successfully', 'success');
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handlePrintAllBarcodes = () => {
 const inStockVariants = variants.filter(v => v.stock_quantity > 0);
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
 text: "${variant.barcode}",
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

 const handleAddProduct = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!prodForm.name || !prodForm.category_id) return showToast('All fields are required', 'error');
 try {
 await salesService.createProduct(manifestId, prodForm.category_id, prodForm.name);
 loadData();
 setShowProdModal(false);
 setProdForm({ category_id: '', name: '' });
 showToast('Product created successfully', 'success');
 } catch (e: any) {
 showToast(e.message, 'error');
 }
 };

 const handleAddVariant = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!varForm.product_id) return showToast('Base product is required', 'error');
 if (!varForm.name || !varForm.sku || !varForm.barcode) return showToast('All variant details are required', 'error');
 try {
 await salesService.createVariant(manifestId, {
 product_id: varForm.product_id,
 name: varForm.name,
 sku: varForm.sku,
 barcode: varForm.barcode,
 cost_price: Number(parseMoneyInput(varForm.cost_price || '0')),
 selling_price: Number(parseMoneyInput(varForm.selling_price || '0')),
 stock_quantity: 0
 });
 loadData();
 setShowVarModal(false);
 setVarForm({ product_id: '', name: '', sku: '', barcode: '', cost_price: '', selling_price: '', _shortId: '' });
 showToast('Variant created successfully', 'success');
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
 <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4 font-medium">Variant Info</th>
 <th className="p-4 font-medium">SKU / Barcode</th>
 <th className="p-4 font-medium">Pricing</th>
 <th className="p-4 font-medium text-right">Stock</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {variants.length === 0 && !isLoading && (
 <tr><td colSpan={4} className="p-12 text-center text-gray-400">No variants found. Add a variant to get started.</td></tr>
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
 </tr>
 );
 })}
 </tbody>
 </table></div>
 )}

 {activeTab === 'products' && (
 <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]" >
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
 <th className="p-4 font-medium">Product Name</th>
 <th className="p-4 font-medium">Category</th>
 <th className="p-4 font-medium">Date Created</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-sm">
 {products.length === 0 && !isLoading && (
 <tr><td colSpan={3} className="p-12 text-center text-gray-400">No products found. Add a product to get started.</td></tr>
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
 </tr>
 );
 })}
 </tbody>
 </table></div>
 )}

 {activeTab === 'categories' && (
 <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {categories.length === 0 && !isLoading && (
 <div className="col-span-full py-12 text-center text-gray-400">No categories found. Add a category to get started.</div>
 )}
 {categories.map(c => (
 <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500">
 <Tags size={18} />
 </div>
 <div>
 <h3 className="font-semibold text-gray-900">{c.name}</h3>
 <p className="text-xs text-gray-500">ID: {c.id.substring(0, 8)}...</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Category Modal */}
 {showCatModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative border border-gray-200">
 <button onClick={() => setShowCatModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-100 rounded-full p-1"><X size={20} /></button>
 <h2 className="text-xl font-bold mb-4 text-gray-900">Add Category</h2>
 <form onSubmit={handleAddCategory} className="space-y-4">
 <TextInput label="Category Name" value={catForm.name} onChange={(e) => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. T-Shirts" required />
 <button type="submit"className="w-full bg-ministry-orange text-white rounded-xl py-3 font-bold hover:bg-orange-600 transition-colors">Create Category</button>
 </form>
 </div>
 </div>
 )}

 {/* Product Modal */}
 {showProdModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative border border-gray-200">
 <button onClick={() => setShowProdModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-100 rounded-full p-1"><X size={20} /></button>
 <h2 className="text-xl font-bold mb-4 text-gray-900">Add Product</h2>
 <form onSubmit={handleAddProduct} className="space-y-4">
 <SelectInput 
 label="Category" 
 value={prodForm.category_id} 
 onChange={(e) => setProdForm({...prodForm, category_id: e.target.value})} 
 options={categories.map(c => ({ label: c.name, value: c.id }))} 
 placeholder="Select Category..."
 required
 />
 <TextInput label="Product Name" value={prodForm.name} onChange={(e) => setProdForm({...prodForm, name: e.target.value})} placeholder="e.g. Manifesto Tour Tee" required />
 <button type="submit"className="w-full bg-ministry-orange text-white rounded-xl py-3 font-bold hover:bg-orange-600 transition-colors">Create Product</button>
 </form>
 </div>
 </div>
 )}

 {/* Variant Modal */}
 {showVarModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative border border-gray-200">
 <button onClick={() => setShowVarModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-100 rounded-full p-1"><X size={20} /></button>
 <h2 className="text-xl font-bold mb-4 text-gray-900">Add Variant</h2>
 <form onSubmit={handleAddVariant} className="space-y-4">
 <SelectInput 
 label="Base Product" 
 value={varForm.product_id} 
 onChange={(e) => updateVarFormAuto({ product_id: e.target.value })} 
 options={products.map(p => ({ label: p.name, value: p.id }))} 
 placeholder="Select Base Product..."
 required
 />
 <TextInput label="Variant Name" value={varForm.name} onChange={(e) => updateVarFormAuto({ name: e.target.value })} placeholder="e.g. Black / Large" required />
 
 <div className="grid grid-cols-2 gap-4">
 <TextInput label="SKU" value={varForm.sku} onChange={(e) => setVarForm({...varForm, sku: e.target.value})} placeholder="e.g. MGP-BLK-L" disabled required />
 <TextInput label="Barcode" value={varForm.barcode} onChange={(e) => setVarForm({...varForm, barcode: e.target.value})} placeholder="e.g. SALES-CLO-MGPTEE-BLK-VN-XL" disabled required />
 </div>
 
 <div className="grid grid-cols-2 gap-4">
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
 <button type="submit"className="w-full bg-ministry-orange text-white rounded-xl py-3 font-bold hover:bg-orange-600 transition-colors">Create Variant</button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

export default ProductsPage;
