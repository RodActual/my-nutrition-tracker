'use client';

import { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';

export default function LabelScanner({ onResult, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // Hint continuous autofocus where the browser supports it
          advanced: [{ focusMode: 'continuous' }],
        },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  };

  // Restarting the stream forces the camera to re-run autofocus
  const refocus = async () => {
    setError(null);
    stopCamera();
    await startCamera();
  };

  useEffect(() => {
    startCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureAndScan = async () => {
    setError(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!video.videoWidth) {
      setError('Camera is still starting — give it a second and try again.');
      return;
    }

    setIsProcessing(true);

    // Upscale small frames — OCR accuracy improves sharply with resolution
    const scale = video.videoWidth < 1600 ? Math.min(2, 1600 / video.videoWidth) : 1;
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Grayscale + contrast stretch: labels are black-on-white, so pushing the
    // histogram to full range makes the text much easier for Tesseract
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.round(((d[i] - min) / range) * 255);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress * 100));
          }
        }
      });
      // PSM 6: treat the image as one uniform block of text — right for a label panel
      await worker.setParameters({ tessedit_pageseg_mode: '6' });

      const { data: { text } } = await worker.recognize(canvas.toDataURL('image/png'));
      await worker.terminate();

      const parsedData = parseNutritionText(text);
      const n = parsedData.nutriments;
      const gotAnything = Object.values(n).some(v => v > 0);
      if (!gotAnything) {
        setIsProcessing(false);
        setProgress(0);
        setError("Couldn't read any values off the label. Fill the frame with the nutrition facts panel, hold steady in good light, and try again.");
        return;
      }
      onResult(parsedData);
    } catch (err) {
      console.error("OCR Error:", err);
      setIsProcessing(false);
      setProgress(0);
      setError('Scan failed — try again, or enter the values manually.');
    }
  };

  const parseNutritionText = (text) => {
    // Work on one normalized stream so keyword and value can straddle OCR line
    // breaks (the FDA label puts "Calories" and its number on separate lines).
    // Trap phrases are rewritten first so bare keywords can't match inside them.
    const stream = text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/calories from fat\s*\d*/g, ' ')
      .replace(/saturated fat/g, 'satfat')
      .replace(/trans fat/g, 'transfat')
      .replace(/added sugars?/g, 'addedsugar')
      .replace(/sugar alcohol/g, 'sugaralcohol');

    // First number within a short window after the keyword — tolerates the
    // serving-size column ("8g 10%": takes 8) and decimals/comma decimals.
    const findNum = (keywords, windowLen = 24) => {
      for (const k of keywords) {
        let idx = stream.indexOf(k);
        while (idx !== -1) {
          const after = stream.slice(idx + k.length, idx + k.length + windowLen);
          const m = after.match(/(\d+(?:[.,]\d+)?)/);
          if (m) return parseFloat(m[1].replace(',', '.'));
          idx = stream.indexOf(k, idx + 1);
        }
      }
      return 0;
    };

    return {
      product_name: "Scanned Label",
      brands: "Camera OCR",
      // Note: sodium is returned in mg here. dashboard.js logFood() will NOT apply
      // the x1000 multiplier since this product has no source: 'Global' flag.
      nutriments: {
        'energy-kcal_100g': Math.round(findNum(['calories', 'kcal'])),
        'proteins_100g': findNum(['protein']),
        'carbohydrates_100g': findNum(['total carbohydrate', 'total carb', 'carbohydrate', 'carbs']),
        'fat_100g': findNum(['total fat', 'fat']),
        'fiber_100g': findNum(['dietary fiber', 'fiber', 'fibre']),
        'sodium_100g': findNum(['sodium']), // already in mg from the label
        'sugars_100g': findNum(['total sugars', 'sugars', 'sugar']),
        'calcium_100g': findNum(['calcium']),
        'iron_100g': findNum(['iron'])
      }
    };
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-2xl">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-80 border-2 border-blue-400 rounded-3xl relative overflow-hidden bg-white/5">
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_#60a5fa] animate-scan-y" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-900/50 text-red-200 px-5 py-4 rounded-2xl text-sm font-bold border border-red-500/50 max-w-sm w-full text-center">
          <p>{error}</p>
          <button
            onClick={onClose}
            className="mt-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-4 w-full max-w-sm px-4">
        {isProcessing ? (
          <div className="w-full bg-white/5 h-14 rounded-2xl flex items-center justify-center overflow-hidden relative border border-white/10">
            <div 
              className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }} 
            />
            <span className="relative font-black text-white text-[10px] uppercase tracking-[0.2em]">
                Analyzing Label {progress}%
            </span>
          </div>
        ) : (
          <>
            <button
              onClick={captureAndScan}
              className="w-full h-16 bg-white rounded-2xl font-black text-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              Analyze Facts
            </button>
            <button
              onClick={refocus}
              className="w-full h-12 bg-white/10 border border-white/20 rounded-2xl font-black text-white/80 text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Refocus Camera
            </button>
            <button 
              onClick={onClose} 
              className="mt-2 text-white/30 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Close Scanner
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes scan-y {
          0% { transform: translateY(0); }
          100% { transform: translateY(320px); }
        }
        .animate-scan-y {
          animation: scan-y 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}