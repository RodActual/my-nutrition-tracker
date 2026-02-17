'use client';

import { useState } from 'react';

// National Averages per 100g
// pieceWeight is the average weight in grams for 1 "piece" or "serving"
const FOOD_DATABASE = {
  // --- PROTEINS ---
  "chicken breast": { calories: 165, protein: 31, carbs: 0, fats: 3.6, pieceWeight: 174 },
  "ground beef (80/20)": { calories: 254, protein: 17, carbs: 0, fats: 20, pieceWeight: 113 },
  "ground turkey": { calories: 189, protein: 25, carbs: 0, fats: 10, pieceWeight: 113 },
  "egg": { calories: 155, protein: 13, carbs: 1.1, fats: 11, pieceWeight: 50 },
  "egg white": { calories: 52, protein: 11, carbs: 0.7, fats: 0.2, pieceWeight: 33 },
  "salmon": { calories: 208, protein: 20, carbs: 0, fats: 13, pieceWeight: 150 },
  "tilapia": { calories: 128, protein: 26, carbs: 0, fats: 3, pieceWeight: 150 },
  "bacon": { calories: 541, protein: 37, carbs: 1.4, fats: 42, pieceWeight: 8 },
  "greek yogurt (plain)": { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, pieceWeight: 170 },

  // --- FRUITS ---
  "apple": { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, pieceWeight: 182 },
  "banana": { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, pieceWeight: 118 },
  "blueberries": { calories: 57, protein: 0.7, carbs: 14, fats: 0.3, pieceWeight: 148 },
  "strawberries": { calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3, pieceWeight: 12 },
  "avocado": { calories: 160, protein: 2, carbs: 9, fats: 15, pieceWeight: 200 },
  "orange": { calories: 47, protein: 0.9, carbs: 12, fats: 0.1, pieceWeight: 131 },

  // --- VEGETABLES ---
  "broccoli": { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, pieceWeight: 91 },
  "spinach": { calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, pieceWeight: 30 },
  "potato": { calories: 77, protein: 2, carbs: 17, fats: 0.1, pieceWeight: 213 },
  "sweet potato": { calories: 86, protein: 1.6, carbs: 20, fats: 0.1, pieceWeight: 130 },
  "carrot": { calories: 41, protein: 0.9, carbs: 10, fats: 0.2, pieceWeight: 61 },

  // --- GRAINS & CARBS ---
  "white rice (cooked)": { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, pieceWeight: 186 },
  "brown rice (cooked)": { calories: 111, protein: 2.6, carbs: 23, fats: 0.9, pieceWeight: 195 },
  "oats (dry)": { calories: 389, protein: 16.9, carbs: 66, fats: 6.9, pieceWeight: 40 },
  "bread (white)": { calories: 265, protein: 9, carbs: 49, fats: 3.2, pieceWeight: 25 },
  "bread (whole wheat)": { calories: 247, protein: 13, carbs: 41, fats: 3.4, pieceWeight: 28 },
  "pasta (cooked)": { calories: 158, protein: 5.8, carbs: 31, fats: 0.9, pieceWeight: 140 },
  "tortilla (flour)": { calories: 297, protein: 8, carbs: 50, fats: 8, pieceWeight: 45 },

  // --- PANTRY & FATS ---
  "peanut butter": { calories: 588, protein: 25, carbs: 20, fats: 50, pieceWeight: 16 },
  "butter": { calories: 717, protein: 0.9, carbs: 0.1, fats: 81, pieceWeight: 14 },
  "olive oil": { calories: 884, protein: 0, carbs: 0, fats: 100, pieceWeight: 14 },
  "almonds": { calories: 579, protein: 21, carbs: 22, fats: 50, pieceWeight: 1 },
  "cheese (cheddar)": { calories: 403, protein: 25, carbs: 1.3, fats: 33, pieceWeight: 28 },
};

export default function ManualEntry({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: '',
    amount: 1,
    unit: 'pc'
  });

  const [manualNutrients, setManualNutrients] = useState(null);

  // Derived Calculations
  const searchName = form.name.toLowerCase().trim();
  const baseData = FOOD_DATABASE[searchName];
  
  // Calculate effective grams for the math
  let effectiveGrams = Number(form.amount);
  if (form.unit === 'pc' && baseData?.pieceWeight) {
    effectiveGrams = form.amount * baseData.pieceWeight;
  }
  
  const ratio = effectiveGrams / 100;

  // Use manual overrides if they exist, otherwise derived from DB or empty
  const displayData = manualNutrients || (baseData ? {
    calories: Math.round(baseData.calories * ratio),
    protein: (baseData.protein * ratio).toFixed(1),
    carbs: (baseData.carbs * ratio).toFixed(1),
    fats: (baseData.fats * ratio).toFixed(1)
  } : {
    calories: '',
    protein: '',
    carbs: '',
    fats: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      product_name: `${form.name} (${form.amount}${form.unit})`,
      brands: 'Manual Entry',
      nutriments: {
        'energy-kcal_100g': Number(displayData.calories),
        'proteins_100g': Number(displayData.protein),
        'carbohydrates_100g': Number(displayData.carbs),
        'fat_100g': Number(displayData.fats)
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-2xl text-slate-800 tracking-tight">Manual Entry</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Search Database</label>
            <input 
              type="text" 
              placeholder="e.g. Chicken Breast, Egg, Salmon..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-600 outline-none transition-all"
              value={form.name}
              onChange={e => {
                setForm({...form, name: e.target.value});
                setManualNutrients(null);
              }}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-[2]">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-600 outline-none transition-all"
                value={form.amount}
                onChange={e => {
                    setForm({...form, amount: e.target.value});
                    setManualNutrients(null);
                }}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Unit</label>
              <select 
                className="w-full p-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none cursor-pointer"
                value={form.unit}
                onChange={e => setForm({...form, unit: e.target.value})}
              >
                <option value="pc">Piece</option>
                <option value="g">Grams</option>
              </select>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100/50 shadow-inner">
            <div className="flex justify-between items-center mb-4">
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                {form.unit === 'pc' && baseData ? `~ ${effectiveGrams} grams` : 'Nutritional Info'}
               </p>
               {baseData && <span className="bg-blue-200 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Auto-calculated</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Calories</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent font-black text-2xl text-blue-900 outline-none"
                  value={displayData.calories}
                  onChange={e => setManualNutrients({...displayData, calories: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <label className="block text-[10px] font-black text-red-400 uppercase mb-1">Protein</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent font-bold text-lg text-red-700 outline-none"
                  value={displayData.protein}
                  onChange={e => setManualNutrients({...displayData, protein: e.target.value})}
                />
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <label className="block text-[10px] font-black text-green-400 uppercase mb-1">Carbs</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent font-bold text-lg text-green-700 outline-none"
                  value={displayData.carbs}
                  onChange={e => setManualNutrients({...displayData, carbs: e.target.value})}
                />
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <label className="block text-[10px] font-black text-yellow-600 uppercase mb-1">Fat</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent font-bold text-lg text-yellow-800 outline-none"
                  value={displayData.fats}
                  onChange={e => setManualNutrients({...displayData, fats: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all mt-2 uppercase tracking-widest"
          >
            Log {displayData.calories || 0} kcal
          </button>
        </form>
      </div>
    </div>
  );
}