'use client';

import { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';

export default function LabelScanner({ onResult, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const currentVideoRef = videoRef.current;
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (currentVideoRef) {
          currentVideoRef.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Please allow camera access to scan labels.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (currentVideoRef) {
        currentVideoRef.srcObject = null;
      }
    };
  }, []);

  const captureAndScan = async () => {
    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    try {
      // FIX: Tesseract.js v4+ API — language is passed directly to createWorker.
      // The old pattern of worker.loadLanguage() + worker.initialize() was removed
      // in v4 and will throw a "worker.loadLanguage is not a function" runtime error.
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress * 100));
          }
        }
      });

      const { data: { text } } = await worker.recognize(canvas.toDataURL('image/jpeg'));
      
      const parsedData = parseNutritionText(text);
      onResult(parsedData);
      
      await worker.terminate();
    } catch (err) {
      console.error("OCR Error:", err);
      setIsProcessing(false);
    }
  };

  const parseNutritionText = (text) => {
    const lines = text.toLowerCase().split('\n');
    
    const findNum = (keywords) => {
      const line = lines.find(l => keywords.some(k => l.includes(k)));
      if (!line) return 0;
      const match = line.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    };

    return {
      product_name: "Scanned Label",
      brands: "Camera OCR",
      // Note: sodium is returned in mg here. dashboard.js logFood() will NOT apply
      // the x1000 multiplier since this product has no source: 'Global' flag.
      nutriments: {
        'energy-kcal_100g': findNum(['calories', 'energy', 'kcal']),
        'proteins_100g': findNum(['protein']),
        'carbohydrates_100g': findNum(['carbohydrate', 'total carb', 'carbs']),
        'fat_100g': findNum(['total fat', 'fat', 'lipids']),
        'fiber_100g': findNum(['fiber', 'dietary fiber']),
        'sodium_100g': findNum(['sodium']), // already in mg from the label
        'sugars_100g': findNum(['sugars', 'total sugars']),
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

      <div className="mt-10 flex flex-col items-center gap-4 w-full max-w-sm px-4">
        {isProcessing ? (
          <div className="w-full bg-white/5 h-14 rounded-2xl flex items-center justify-center overflow-hidden relative border border-white/10">
            <div 
              className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-300" 
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