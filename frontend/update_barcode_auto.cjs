const fs = require('fs');

let file = fs.readFileSync('d:/Manifest System/frontend/modules/sales/pages/ProductsPage.tsx', 'utf8');

// 1. updateVarFormAuto
file = file.replace(
  "nextState.sku = `${pCode}-${vCode}-${shortId}`;",
  `nextState.sku = \`\${pCode}-\${vCode}-\${shortId}\`;
       
       const autoBarcode = \`SALES-\${cCode}-\${pCode}-\${vCode}-\${shortId}\`;
       if (!nextState.barcode || nextState.barcode.startsWith('SALES-') || nextState.barcode.startsWith('SYS-')) {
          nextState.barcode = autoBarcode;
       }`
);

// 2. handleAddVariant
file = file.replace(
  `barcode: varForm.barcode || null,
    existing_qr_code: varForm.existing_qr_code || null,
    system_qr_code: (!varForm.barcode && !varForm.existing_qr_code) ? \`SYS-QR-\${varForm.sku}\` : null,`,
  `barcode: (varForm.barcode && !varForm.barcode.startsWith('SALES-') && !varForm.barcode.startsWith('SYS-')) ? varForm.barcode : null,
    existing_qr_code: varForm.existing_qr_code || null,
    system_qr_code: (varForm.barcode && (varForm.barcode.startsWith('SALES-') || varForm.barcode.startsWith('SYS-'))) ? varForm.barcode : (!varForm.barcode && !varForm.existing_qr_code ? \`SYS-QR-\${varForm.sku}\` : null),`
);

// 3. UI label
file = file.replace(
  `<TextInput label="Manufacturer Barcode" value={varForm.barcode}`,
  `<TextInput label="System / Manufacturer Barcode" value={varForm.barcode}`
);

fs.writeFileSync('d:/Manifest System/frontend/modules/sales/pages/ProductsPage.tsx', file);
console.log("Updated auto-barcode generation.");
