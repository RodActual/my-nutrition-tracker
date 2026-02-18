'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function WeeklyInsights({ userId, dailyCalorieTarget }) {
  const [viewMode, setViewMode] = useState('Current Week'); 
  const [chartData, setChartData] = useState([]);
  const [macroData, setMacroData] = useState([]);
  const [loading, setLoading] = useState(true);

  const getDaysInPeriod = useCallback(() => {
    const now = new Date();
    if (viewMode === 'Today') return 1;
    if (viewMode === 'Current Week') return now.getDay() + 1;
    if (viewMode === 'Current Month') return now.getDate();
    return 1;
  }, [viewMode]);

  const daysCount = getDaysInPeriod();

  // FIX: Wrap dailyTargets in useMemo so it only recomputes when dailyCalorieTarget
  // changes. Previously it was a plain object literal recreated on every render,
  // which caused processData's useCallback to get a new reference each render,
  // which triggered the useEffect on every render — an infinite fetch loop.
  const dailyTargets = useMemo(() => ({
    protein: (dailyCalorieTarget * 0.30) / 4,
    carbs: (dailyCalorieTarget * 0.40) / 4,
    fats: (dailyCalorieTarget * 0.30) / 9
  }), [dailyCalorieTarget]);

  const processData = useCallback((logs, mode, startDate) => {
    const dataMap = {};
    const now = new Date();
    let totalP = 0, totalC = 0, totalF = 0;

    if (mode === 'Today') {
      for (let i = 0; i < 24; i += 3) dataMap[i] = { label: `${i}:00`, calories: 0 };
      logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        const block = Math.floor(hour / 3) * 3;
        if (dataMap[block]) dataMap[block].calories += log.calories || 0;
        totalP += log.protein || 0; totalC += log.carbs || 0; totalF += log.fats || 0;
      });
    } else if (mode === 'Current Week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i <= now.getDay(); i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dataMap[days[d.getDay()]] = { label: days[d.getDay()], calories: 0 };
      }
      logs.forEach(log => {
        const dayName = days[new Date(log.timestamp).getDay()];
        if (dataMap[dayName]) dataMap[dayName].calories += log.calories || 0;
        totalP += log.protein || 0; totalC += log.carbs || 0; totalF += log.fats || 0;
      });
    } else {
      const lastDay = now.getDate();
      for (let i = 1; i <= lastDay; i++) dataMap[i.toString()] = { label: i.toString(), calories: 0 };
      logs.forEach(log => {
        const dateDay = new Date(log.timestamp).getDate().toString();
        if (dataMap[dateDay]) dataMap[dateDay].calories += log.calories || 0;
        totalP += log.protein || 0; totalC += log.carbs || 0; totalF += log.fats || 0;
      });
    }

    setChartData(Object.values(dataMap));

    const currentDaysCount = getDaysInPeriod(); 
    setMacroData([
      { name: 'Protein', avg: totalP / currentDaysCount, target: dailyTargets.protein, color: '#f87171' },
      { name: 'Carbs', avg: totalC / currentDaysCount, target: dailyTargets.carbs, color: '#34d399' },
      { name: 'Fats', avg: totalF / currentDaysCount, target: dailyTargets.fats, color: '#fbbf24' }
    ]);
  // FIX: dailyTargets is now a stable memoized reference, so including it here
  // won't cause processData to be recreated on every render.
  }, [dailyTargets, getDaysInPeriod]);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      const now = new Date();
      let startDate = new Date();

      if (viewMode === 'Today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (viewMode === 'Current Week') {
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else if (viewMode === 'Current Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      try {
        const logsRef = collection(db, "users", userId, "logs");
        const q = query(
          logsRef, 
          where("timestamp", ">=", startDate.toISOString()),
          orderBy("timestamp", "asc")
        );

        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => doc.data());

        processData(logs, viewMode, startDate);
      } catch (err) {
        console.error("Chart fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [userId, viewMode, processData]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-1 rounded-2xl shadow-sm flex border border-slate-100">
        {['Today', 'Current Week', 'Current Month'].map((mode) => (
          <button 
            key={mode} 
            onClick={() => setViewMode(mode)} 
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-900 hover:bg-slate-50'}`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Calorie Totals</h3>
          <span className="text-[9px] font-bold text-slate-700 italic uppercase">View: {viewMode}</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }} interval={viewMode === 'Current Month' ? 5 : 0} />
              <Bar dataKey="calories" radius={[4, 4, 4, 4]} barSize={viewMode === 'Current Month' ? 6 : 16}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.calories > dailyCalorieTarget ? '#f87171' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Daily Macro Averages</h3>
            <p className="text-[9px] text-slate-700 font-bold uppercase mt-1">Based on {daysCount} day{daysCount > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-1/2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={macroData} innerRadius={45} outerRadius={60} paddingAngle={8} dataKey="avg">
                  {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-1/2 space-y-5">
            {macroData.map((m) => (
              <div key={m.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-900 uppercase">{m.name}</span>
                  <span className="text-[10px] font-black text-black">{Math.round(m.avg)} / {Math.round(m.target)}g</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full transition-all duration-1000 rounded-full" 
                    style={{ 
                        width: `${Math.min((m.avg / (m.target || 1)) * 100, 100)}%`, 
                        backgroundColor: m.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}