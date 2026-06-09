const fs = require('fs');

function updateFile(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');

  // Need to make sure Html5QrcodeSupportedFormats is imported
  if (!file.includes('Html5QrcodeSupportedFormats')) {
    file = file.replace(
      "import { Html5QrcodeScanner } from 'html5-qrcode';",
      "import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';"
    );
  }

  // Find the Html5QrcodeScanner instantiation
  // We need to replace the config object
  file = file.replace(
    /const scanner = new Html5QrcodeScanner\("reader",\s*\{\s*fps:\s*\d+,\s*disableFlip:\s*false\s*\},?\s*false\);/g,
    `const scanner = new Html5QrcodeScanner("reader", { 
        fps: 30, 
        disableFlip: false,
        useBarCodeDetectorIfSupported: true,
        rememberLastUsedCamera: true,
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
      }, false);`
  );

  fs.writeFileSync(filePath, file);
  console.log("Updated", filePath);
}

updateFile('d:/Manifest System/frontend/modules/sales/pages/ProductsPage.tsx');
updateFile('d:/Manifest System/frontend/modules/sales/pages/POSPage.tsx');
