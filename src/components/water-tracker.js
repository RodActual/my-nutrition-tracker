'use client';

import { useState, useEffect } from 'react';
import { Droplets, Trash2 } from 'lucide-react';
import { storage } from '@/lib/storage';

export default function WaterTracker({ date, waterGoal = 64 }) {
  const [waterLogs, setWaterLogs] = useState([]);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    const logs = storage.getWaterLogs(date);
    setWaterLogs(logs);
  }, [date]);

  const consumed = waterLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
  const progress = Math.min((consumed / waterGoal) * 100, 100);

  const addWater = (amount) => {
    storage.addWaterLog({ amount, date });
    setWaterLogs(storage.getWaterLogs(date));
  };

  const handleCustomAdd = () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) return;
    addWater(amount);
    setCustomAmount('');
  };

  const handleDelete = (id) => {
    storage.deleteWaterLog(id);
    setWaterLogs(storage.getWaterLogs(date));
  };

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="text-blue-400 w-5 h-5" />
        <span className="text-slate-200 font-semibold">Water</span>
      </div>

      {/* Progress display */}
      <div className="mb-2">
        <span className="text-slate-300 text-sm">{consumed} / {waterGoal} oz</span>
      </div>
      <div className="bg-zinc-800 rounded-full h-2 mb-5">
        <div
          className="bg-blue-400 rounded-full h-2 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Quick-add buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[8, 12, 16, 24].map((amount) => (
          <button
            key={amount}
            onClick={() => addWater(amount)}
            className="bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-sm rounded-xl px-3 py-2 transition-colors"
          >
            +{amount} oz
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          min="1"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
          placeholder="oz"
          className="bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-sm rounded-xl px-3 py-2 w-20 outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
        />
        <button
          onClick={handleCustomAdd}
          className="bg-blue-500 hover:bg-blue-400 text-white rounded-xl px-4 py-2 text-sm transition-colors"
        >
          Add
        </button>
      </div>

      {/* Log list */}
      {waterLogs.length > 0 && (
        <ul className="space-y-1">
          {waterLogs.map((log) => (
            <li key={log.id} className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">{log.amount} oz</span>
              <button
                onClick={() => handleDelete(log.id)}
                className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                aria-label="Delete entry"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
