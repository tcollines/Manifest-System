const fs = require('fs');

let file = fs.readFileSync('d:/Manifest System/frontend/modules/sales/pages/ProductsPage.tsx', 'utf8');

// 1. Imports
file = file.replace(
  "import { Plus, X, Search, Package, Tags, Layers, Printer, Edit2, Trash2 } from 'lucide-react';",
  "import { Plus, X, Search, Package, Tags, Layers, Printer, Edit2, Trash2, QrCode, ScanLine } from 'lucide-react';\nimport { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';"
);

// 2. State
file = file.replace(
  "const [varForm, setVarForm] = useState({ product_id: '', name: '', sku: '', barcode: '', cost_price: '', selling_price: '', _shortId: '' });",
  `const [varForm, setVarForm] = useState({ product_id: '', name: '', sku: '', barcode: '', existing_qr_code: '', cost_price: '', selling_price: '', _shortId: '' });
 const [showScanner, setShowScanner] = useState(false);
 const [scanTarget, setScanTarget] = useState<'barcode'|'existing_qr_code' | null>(null);

 useEffect(() => {
   if (showScanner) {
     const scanner = new Html5QrcodeScanner("reader", { 
       fps: 20, 
       qrbox: { width: 300, height: 150 }, 
       aspectRatio: 1.0,
       disableFlip: false,
       formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39
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
 }, [showScanner, scanTarget]);`
);

// 3. updateVarFormAuto
file = file.replace(
  "nextState.sku = `${pCode}-${vCode}-${shortId}`;\n       nextState.barcode = `SALES-${cCode}-${pCode}-${vCode}-${shortId}`;",
  "nextState.sku = `${pCode}-${vCode}-${shortId}`;"
);

// 4. handlePrintAllBarcodes
file = file.replace(
  "const inStockVariants = variants.filter(v => v.stock_quantity > 0);",
  "const inStockVariants = variants.filter(v => v.stock_quantity > 0 && v.system_qr_code);"
);

file = file.replace(
  'text: "${variant.barcode}",',
  'text: "${variant.system_qr_code}",'
);

// 5. handlePrintSingleBarcode
file = file.replace(
  "const handleAddProduct = async (e: React.FormEvent) => {",
  `const handlePrintSingleBarcode = (variant: SalesVariant) => {
   if (!variant.system_qr_code) return showToast('Variant has no system QR code to print.', 'error');
   const printWindow = window.open('', '_blank', 'width=600,height=600');
   if (!printWindow) return showToast('Pop-up blocked. Please allow pop-ups to print.', 'error');
   
   printWindow.document.write(\`
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
         <h2>\${variant.name}</h2>
         <div id="qrcode" class="qr-code"></div>
         <p class="sku-text">\${variant.sku}</p>
       </div>
       <script>
         new QRCode(document.getElementById("qrcode"), {
           text: "\${variant.system_qr_code}", width: 100, height: 100, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M
         });
         setTimeout(() => { window.print(); }, 800);
         window.onafterprint = () => { window.close(); };
       </script>
     </body>
     </html>
   \`);
   printWindow.document.close();
 };

 const handleAddProduct = async (e: React.FormEvent) => {`
);

// 6. handleAddVariant
file = file.replace(
  "if (!varForm.name || !varForm.sku || !varForm.barcode) return showToast('All variant details are required', 'error');",
  "if (!varForm.name || !varForm.sku) return showToast('Name and SKU are required', 'error');"
);

file = file.replace(
  "barcode: varForm.barcode,\n    cost_price: Number(parseMoneyInput(varForm.cost_price || '0')),",
  `barcode: varForm.barcode || null,
    existing_qr_code: varForm.existing_qr_code || null,
    system_qr_code: (!varForm.barcode && !varForm.existing_qr_code) ? \`SYS-QR-\${varForm.sku}\` : null,
    cost_price: Number(parseMoneyInput(varForm.cost_price || '0')),`
);

file = file.replace(
  "setVarForm({ product_id: '', name: '', sku: '', barcode: '', cost_price: '', selling_price: '', _shortId: '' });",
  "setVarForm({ product_id: '', name: '', sku: '', barcode: '', existing_qr_code: '', cost_price: '', selling_price: '', _shortId: '' });"
);

// 7. Variant List UI (Desktop)
file = file.replace(
  " <div className=\"flex items-center justify-end gap-2\">\n     <button onClick={() => { setEditVarId(v.id);",
  ` <div className="flex items-center justify-end gap-2">
     {v.system_qr_code && (
       <button onClick={() => handlePrintSingleBarcode(v)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Print System QR">
         <Printer size={16} />
       </button>
     )}
     <button onClick={() => { setEditVarId(v.id);`
);
file = file.replace(
  "setVarForm({ product_id: v.product_id, name: v.name, sku: v.sku, barcode: v.barcode, cost_price: v.cost_price.toString(), selling_price: v.selling_price.toString(), _shortId: '' }); setShowVarModal(true);",
  "setVarForm({ product_id: v.product_id, name: v.name, sku: v.sku, barcode: v.barcode || '', existing_qr_code: v.existing_qr_code || '', cost_price: v.cost_price.toString(), selling_price: v.selling_price.toString(), _shortId: '' }); setShowVarModal(true);"
);

// 8. Variant List UI (Mobile)
file = file.replace(
  " <div className=\"flex items-center justify-end gap-2 mt-2\">\n           <button onClick={() => { setEditVarId(v.id);",
  ` <div className="flex items-center justify-end gap-2 mt-2">
           {v.system_qr_code && (
             <button onClick={() => handlePrintSingleBarcode(v)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg transition-colors flex items-center gap-1">
               <Printer size={14} /> Print
             </button>
           )}
           <button onClick={() => { setEditVarId(v.id);`
);
file = file.replace(
  "setVarForm({ product_id: v.product_id, name: v.name, sku: v.sku, barcode: v.barcode, cost_price: v.cost_price.toString(), selling_price: v.selling_price.toString(), _shortId: '' }); setShowVarModal(true);",
  "setVarForm({ product_id: v.product_id, name: v.name, sku: v.sku, barcode: v.barcode || '', existing_qr_code: v.existing_qr_code || '', cost_price: v.cost_price.toString(), selling_price: v.selling_price.toString(), _shortId: '' }); setShowVarModal(true);"
);

// 9. Variant Form Modal
file = file.replace(
  "setVarForm({ product_id: '', name: '', sku: '', barcode: '', cost_price: '', selling_price: '', _shortId: '' }); }}",
  "setVarForm({ product_id: '', name: '', sku: '', barcode: '', existing_qr_code: '', cost_price: '', selling_price: '', _shortId: '' }); }}"
);

file = file.replace(
  `<TextInput label="SKU" value={varForm.sku} onChange={(e) => setVarForm({...varForm, sku: e.target.value})} placeholder="e.g. MGP-BLK-L" disabled required />\n  <TextInput label="Barcode" value={varForm.barcode} onChange={(e) => setVarForm({...varForm, barcode: e.target.value})} placeholder="e.g. SALES-CLO-MGPTEE-BLK-VN-XL" disabled required />`,
  `<TextInput label="SKU" value={varForm.sku} onChange={(e) => setVarForm({...varForm, sku: e.target.value})} placeholder="e.g. MGP-BLK-L" disabled required />
  
  <div className="flex items-end gap-2">
    <div className="flex-1">
      <TextInput label="Manufacturer Barcode" value={varForm.barcode} onChange={(e) => setVarForm({...varForm, barcode: e.target.value})} placeholder="e.g. 123456789012" />
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
  </div>`
);

// 10. Scanner Modal Wrapper
file = file.replace(
  " {/* Category Modal */}",
  ` {/* Scanner Modal */}
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

 {/* Category Modal */}`
);

fs.writeFileSync('d:/Manifest System/frontend/modules/sales/pages/ProductsPage.tsx', file);
console.log("Updated ProductsPage.tsx");
