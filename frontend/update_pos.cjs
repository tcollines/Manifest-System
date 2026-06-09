const fs = require('fs');

let file = fs.readFileSync('d:/Manifest System/frontend/modules/sales/pages/POSPage.tsx', 'utf8');

file = file.replace(
  "import { Html5QrcodeScanner } from 'html5-qrcode';",
  "import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';"
);

file = file.replace(
  `      const scanner = new Html5QrcodeScanner("reader", { \n        fps: 10, \n        qrbox: { width: 250, height: 250 }, \n        aspectRatio: 1.0,\n        disableFlip: false\n      }, false);`,
  `      const scanner = new Html5QrcodeScanner("reader", { 
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
      }, false);`
);

file = file.replace(
  `    const variant = variants.find(v => \n      v.barcode?.toLowerCase() === cleanBarcode || \n      v.sku?.toLowerCase() === cleanBarcode\n    );`,
  `    const variant = variants.find(v => 
      v.sku?.toLowerCase() === cleanBarcode ||
      v.barcode?.toLowerCase() === cleanBarcode || 
      v.existing_qr_code?.toLowerCase() === cleanBarcode ||
      v.system_qr_code?.toLowerCase() === cleanBarcode
    );`
);

file = file.replace(
  `      const variant = variants.find(v => \n        v.barcode?.toLowerCase() === cleanSearch || \n        v.sku?.toLowerCase() === cleanSearch\n      );`,
  `      const variant = variants.find(v => 
        v.sku?.toLowerCase() === cleanSearch ||
        v.barcode?.toLowerCase() === cleanSearch || 
        v.existing_qr_code?.toLowerCase() === cleanSearch ||
        v.system_qr_code?.toLowerCase() === cleanSearch
      );`
);

fs.writeFileSync('d:/Manifest System/frontend/modules/sales/pages/POSPage.tsx', file);
console.log("Updated POSPage.tsx");
