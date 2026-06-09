const fs = require('fs');

function updateFile(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');

  // Replace the config object
  file = file.replace(
    /const scanner = new Html5QrcodeScanner\("reader",\s*\{[\s\S]*?\},?\s*false\);/g,
    `const scanner = new Html5QrcodeScanner("reader", { 
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
      }, false);`
  );

  fs.writeFileSync(filePath, file);
  console.log("Updated", filePath);
}

updateFile('d:/Manifest System/frontend/modules/sales/pages/ProductsPage.tsx');
updateFile('d:/Manifest System/frontend/modules/sales/pages/POSPage.tsx');
