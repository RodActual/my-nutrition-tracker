'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { storage } from '@/lib/storage';

// initialData is either a log entry (flat fields, editing) or a scan result
// ({ product, isNewFromScan, id }) whose values live under product.nutriments.
function normalizeInitialData(initialData) {
  if (!initialData) return null;
  if (initialData.product) {
    const p = initialData.product;
    const n = p.nutriments ?? {};
    const pick = (stub) => n[`${stub}_serving`] ?? n[`${stub}_100g`] ?? '';
    return {
      isScan: true,
      name: p.product_name ?? p.name ?? '',
      calories: pick('energy-kcal') !== '' ? Math.round(Number(pick('energy-kcal'))) : '',
      protein: pick('proteins'),
      carbs: pick('carbohydrates'),
      fat: pick('fat'),
      fiber: pick('fiber'),
      sodium: pick('sodium'),
      sugar: pick('sugars'),
    };
  }
  return { ...initialData, fat: initialData.fats ?? initialData.fat ?? '', isScan: false };
}

export default function ManualEntry({ onAdd, initialData, onClose }) {
  const editingLog = normalizeInitialData(initialData);
  const [name, setName] = useState(editingLog?.name ?? '');
  const [calories, setCalories] = useState(editingLog?.calories ?? '');
  const [protein, setProtein] = useState(editingLog?.protein ?? '');
  const [carbs, setCarbs] = useState(editingLog?.carbs ?? '');
  const [fat, setFat] = useState(editingLog?.fat ?? '');
  const [fiber, setFiber] = useState(editingLog?.fiber ?? '');
  const [sodium, setSodium] = useState(editingLog?.sodium ?? '');
  const [sugar, setSugar] = useState(editingLog?.sugar ?? '');
  const [servings, setServings] = useState('1');
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (name.trim().length > 1) {
      setResults(storage.searchProducts(name));
    } else {
      setResults([]);
    }
  }, [name]);

  const handleSelect = (item) => {
    setName(item.name ?? '');
    setCalories(item.calories ?? '');
    setProtein(item.protein ?? '');
    setCarbs(item.carbs ?? '');
    setFat(item.fat ?? '');
    setFiber(item.fiber ?? '');
    setSodium(item.sodium ?? '');
    setSugar(item.sugar ?? '');
    setResults([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const qty = Number(servings) > 0 ? Number(servings) : 1;
    const scale = (v) => Math.round((Number(v) || 0) * qty * 10) / 10;
    onAdd({
      name: qty !== 1 ? `${name} (×${qty})` : name,
      calories: Math.round((Number(calories) || 0) * qty),
      protein: scale(protein),
      carbs: scale(carbs),
      fat: scale(fat),
      fiber: scale(fiber),
      sodium: scale(sodium),
      sugar: scale(sugar),
    });
    onClose();
  };

  const inputClass =
    'bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm w-full focus:outline-none focus:border-emerald-500';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            {editingLog && !editingLog.isScan ? 'Edit Food' : 'Log Food'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + search */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs text-zinc-400 mb-1">Food Name</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setResults([]); }}
                placeholder="Search or type food name..."
                className={`${inputClass} pl-9`}
              />
            </div>

            {results.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-10">
                {results.map((item, i) => (
                  <li key={item.name ?? i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm text-slate-200 cursor-pointer"
                    >
                      {item.name}
                      <span className="ml-2 text-xs text-zinc-500">{item.calories} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Servings */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Servings</label>
            <div className="flex items-center gap-2">
              {[0.5, 1, 1.5, 2].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setServings(String(q))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    Number(servings) === q
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-500'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {q}
                </button>
              ))}
              <input
                type="number"
                min="0.1"
                step="0.25"
                inputMode="decimal"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className={`${inputClass} flex-1`}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Values below are per serving — totals multiply on save</p>
          </div>

          {/* Macro row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Calories</label>
              <input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Protein g</label>
              <input type="number" min="0" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Carbs g</label>
              <input type="number" min="0" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fat g</label>
              <input type="number" min="0" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} className={inputClass} placeholder="0" />
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fiber g</label>
              <input type="number" min="0" step="0.1" value={fiber} onChange={(e) => setFiber(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Sodium mg</label>
              <input type="number" min="0" value={sodium} onChange={(e) => setSodium(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Sugar g</label>
              <input type="number" min="0" step="0.1" value={sugar} onChange={(e) => setSugar(e.target.value)} className={inputClass} placeholder="0" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-2xl py-3 mt-4"
          >
            {editingLog && !editingLog.isScan ? 'Update' : 'Add Food'}
          </button>
        </form>
      </div>
    </div>
  );
}
