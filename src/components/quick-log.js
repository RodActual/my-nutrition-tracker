'use client';

const STAPLES = [
  { id: 'coffee', name: 'Coffee', emoji: '☕', calories: 5, protein: 0, carbs: 0, fats: 0 },
  { id: 'egg', name: '1 Egg', emoji: '🥚', calories: 78, protein: 6, carbs: 0.6, fats: 5 },
  { id: 'shake', name: 'Protein Shake', emoji: '🥤', calories: 150, protein: 30, carbs: 3, fats: 2 },
  { id: 'banana', name: 'Banana', emoji: '🍌', calories: 105, protein: 1, carbs: 27, fats: 0.4 },
  { id: 'oats', name: 'Oatmeal', emoji: '🥣', calories: 150, protein: 5, carbs: 27, fats: 3 },
  { id: 'toast', name: 'Toast', emoji: '🍞', calories: 80, protein: 3, carbs: 15, fats: 1 },
];

export default function QuickLog({ onLog }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Log Staples</h3>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar">
        {STAPLES.map((item) => (
          <button
            key={item.id}
            onClick={() => onLog({
              product_name: item.name,
              brands: 'Quick Log',
              nutriments: {
                'energy-kcal_100g': item.calories,
                'proteins_100g': item.protein,
                'carbohydrates_100g': item.carbs,
                'fat_100g': item.fats
              }
            })}
            className="flex-shrink-0 flex flex-col items-center gap-2 bg-white border border-slate-100 p-4 rounded-3xl shadow-sm active:scale-90 transition-all hover:border-blue-200"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-[10px] font-black text-slate-600 uppercase whitespace-nowrap">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}