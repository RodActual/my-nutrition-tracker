'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { cameraErrorMessage, isRetryableCameraError, retryDelayMs, sleep } from '@/lib/camera';

export default function BarcodeScanner({ onResult, onClose }) {
  // FIX #6: Restore the error state that was dropped in the previous fix.
  // Without it, camera permission denial or start failures show nothing to the user.
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const restartRef = useRef(null);
  const scanDoneRef = useRef(false); // set once a barcode is read; blocks Refocus
  // Guards against a race where the component unmounts (scanner closed) while
  // html5QrCode.start() is still resolving — without this, a camera that
  // finishes starting after unmount never gets stopped, and stays locked for
  // the next scanner that tries to open, causing intermittent launch failures.
  const mountedRef = useRef(true);

  const onResultRef = useRef(onResult);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onResultRef.current = onResult;
    onCloseRef.current = onClose;
  }, [onResult, onClose]);

  const handleScanSuccess = useCallback(async (decodedText, html5QrCode) => {
    // Ignore late frames from a superseded instance (StrictMode remount).
    if (!isScanningRef.current || html5QrCode !== scannerRef.current) return;
    isScanningRef.current = false;
    scanDoneRef.current = true;

    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (err) {
      console.warn("Failed to stop scanner:", err);
    }

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(decodedText)}.json`
      );
      if (!response.ok) throw new Error(`Lookup failed: ${response.status}`);
      const data = await response.json();
      if (!mountedRef.current) return; // scanner closed while the lookup ran

      if (data.status === 1) {
        onResultRef.current(data.product);
      } else {
        alert("Product not found.");
        onCloseRef.current();
      }
    } catch (err) {
      console.error("API Error:", err);
      if (!mountedRef.current) return;
      setError("Connection failed. Please try again.");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    // Per-effect flag: unlike mountedRef, a StrictMode remount can't flip it back,
    // so a stale start flow always releases its own instance.
    let cancelled = false;
    let startPromise = null;

    const runStart = async () => {
      const onFrame = (decodedText) => handleScanSuccess(decodedText, html5QrCode);
      const onFrameError = () => { /* ignore per-frame errors */ };

      const attempt = async (cameraConstraint) => {
        await html5QrCode.start(cameraConstraint, config, onFrame, onFrameError);
      };

      try {
        try {
          // Plain string form: the config shape html5-qrcode is known to accept.
          await attempt({ facingMode: "environment" });
        } catch (err1) {
          if (!isRetryableCameraError(err1) || cancelled) throw err1;
          // Real fallback: let a busy camera release, then pick a device by id.
          await sleep(retryDelayMs(err1));
          if (cancelled) return;
          // Any failure here must surface the original error, not the lookup's.
          let cameras = [];
          try { cameras = await Html5Qrcode.getCameras(); } catch { /* fall through */ }
          // Only use a camera we can identify as rear-facing (or the only one);
          // guessing could open the front camera or the same busy device.
          const rear = cameras.find((c) => /back|rear|environment/i.test(c.label))
            || (cameras.length === 1 ? cameras[0] : null);
          if (!rear) throw err1;
          await attempt(rear.id);
        }
        if (cancelled) {
          // Closed before the camera finished starting — release it immediately
          // instead of leaving it locked for the next scanner attempt. No clear():
          // under a StrictMode remount the live instance shares #reader's DOM.
          try { await html5QrCode.stop(); } catch { /* already stopped */ }
          return;
        }
        isScanningRef.current = true;
      } catch (err) {
        if (cancelled) return;
        console.error("Error starting scanner:", err);
        setError(cameraErrorMessage(err));
      }
    };

    // Serialize starts: a refocus tap during a start/retry reuses the in-flight one.
    const startScanner = () => {
      startPromise ??= runStart().finally(() => { startPromise = null; });
      return startPromise;
    };

    startScanner();

    // Restarting the scanner stream forces the camera to re-run autofocus
    let restarting = false;
    restartRef.current = async () => {
      // Ignore taps while a start, stop or the post-scan lookup is in progress.
      if (startPromise || restarting || scanDoneRef.current || cancelled) return;
      restarting = true;
      try {
        if (isScanningRef.current) {
          isScanningRef.current = false;
          try { await html5QrCode.stop(); } catch { /* already stopped */ }
        }
        if (!cancelled) await startScanner();
      } finally {
        restarting = false;
      }
    };

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (isScanningRef.current) {
        isScanningRef.current = false;
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(err => {
          console.log("Scanner cleanup error (harmless):", err);
        });
      }
    };
  }, [handleScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">

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
          {scanDoneRef.current && (
            <button
              onClick={() => { setError(null); scanDoneRef.current = false; restartRef.current?.(); }}
              className="mt-3 mr-2 bg-white/10 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all"
            >
              Try again
            </button>
          )}
          <button
            onClick={onClose}
            className="mt-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 mt-8">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Align barcode within frame
          </p>
          <button
            onClick={() => restartRef.current?.()}
            className="bg-white/10 border border-white/20 rounded-2xl font-black text-white/80 text-xs uppercase tracking-widest px-6 py-3 active:scale-95 transition-all"
          >
            Refocus Camera
          </button>
        </div>
      )}
    </div>
  );
}