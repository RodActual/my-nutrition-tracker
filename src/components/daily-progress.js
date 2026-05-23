'use client';

export default function DailyProgress({ targets, current }) {
  const stats = [
    { label: 'Calories', current: current.calories, target: targets.calories, color: 'bg-blue-600', unit: '' },
    { label: 'Protein', current: current.protein, target: targets.protein, color: 'bg-red-600', unit: 'g' },
    { label: 'Carbs', current: current.carbs, target: targets.carbs, color: 'bg-green-600', unit: 'g' },
    { label: 'Fats', current: current.fats, target: targets.fats, color: 'bg-yellow-500', unit: 'g' },
  ];

  return (
    <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-200">
      <h2 className="text-gray-900 text-base font-black uppercase tracking-wider mb-5">Daily Totals</h2>
      
      <div className="space-y-6">
        {stats.map((stat) => {
          const percentage = Math.min((stat.current / (stat.target || 1)) * 100, 100);
          
          return (
            <div key={stat.label}>
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-lg text-black">{stat.label}</span>
                <span className="text-base font-bold text-gray-700">
                  {stat.current} / {stat.target}{stat.unit}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden border border-gray-300">
                <div 
                  className={`${stat.color} h-full transition-all duration-500`} 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}