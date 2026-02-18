'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onResult, onClose }) {
// FIX #6: Restore the error state that was dropped in the previous fix.
// Without it, camera permission denial or start failures show nothing to the user.
const [error, setError] = useState(null);
const scannerRef = useRef(null);
const isScanningRef = useRef(false);

const onResultRef = useRef(onResult);
const onCloseRef = useRef(onClose);
useEffect(() => { onResultRef.current = onResult; }, [onResult]);
useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

const handleScanSuccess = useCallback(async (decodedText) => {
if (!isScanningRef.current) return;
isScanningRef.current = false;

```
const html5QrCode = scannerRef.current;
try {
  await html5QrCode.stop();
  html5QrCode.clear();
} catch (err) {
  console.warn("Failed to stop scanner:", err);
}

try {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`
  );
  const data = await response.json();

  if (data.status === 1) {
    onResultRef.current(data.product);
  } else {
    alert("Product not found.");
    onCloseRef.current();
  }
} catch (err) {
  console.error("API Error:", err);
  setError("Connection failed. Please try again.");
}
```

}, []);

useEffect(() => {
const html5QrCode = new Html5Qrcode(“reader”);
scannerRef.current = html5QrCode;

```
const config = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0
};

const startScanner = async () => {
  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => handleScanSuccess(decodedText),
      () => { /* ignore per-frame errors */ }
    );
    isScanningRef.current = true;
  } catch (err) {
    console.error("Error starting scanner:", err);
    // FIX #6: Surface camera errors to the user with a clear message.
    setError("Camera access denied. Please allow camera permissions and try again.");
  }
};

startScanner();

return () => {
  if (isScanningRef.current) {
    isScanningRef.current = false;
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
    }).catch(err => {
      console.log("Scanner cleanup error (harmless):", err);
    });
  }
};
```

}, [handleScanSuccess]);

return (
<div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">

```
  <button
    onClick={onClose}
    className="absolute top-6 right-6 z-20 bg-white/10 text-white rounded-full p-3 hover:bg-white/20 transition-colors"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>

  <h2 className="text-white font-black text-2xl mb-8 tracking-tight">SCAN ITEM</h2>

  <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700">
    <div id="reader" className="w-full h-full object-cover"></div>

    <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-xl pointer-events-none flex items-center justify-center">
      <div className="w-full h-0.5 bg-red-500/80 absolute animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
    </div>
  </div>

  {/* FIX #6: Show error message with a retry-by-close prompt */}
  {error ? (
    <div className="mt-6 bg-red-900/50 text-red-200 px-5 py-4 rounded-2xl text-sm font-bold border border-red-500/50 max-w-sm text-center">
      <p>{error}</p>
      <button
        onClick={onClose}
        className="mt-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all"
      >
        Close
      </button>
    </div>
  ) : (
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-8">
      Align barcode within frame
    </p>
  )}
</div>
```

);
}