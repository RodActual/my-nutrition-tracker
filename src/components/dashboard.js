'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { Home, Plus, BarChart2, Settings, ScanLine, Type, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import DailyProgress from './daily-progress';
import BarcodeScanner from './barcode-scanner';
import LabelScanner from './label-scanner';
import WeightReminderBanner from './weight-reminder-banner';
import ManualEntry from './manual-entry';
import LogList from './log-list';
import SettingsModal from './settings-modal';
import WeightChart from './weight-chart';
import QuickLog from './quick-log';
import WaterTracker from './water-tracker';
import WeeklyInsights from './weekly-insights';

const EMPTY_TOTALS = {
  calories: 0, protein: 0, carbs: 0, fats: 0,
  fiber: 0, sodium: 0, potassium: 0, sugar: 0,
  calcium: 0, iron: 0, magnesium: 0, zinc: 0,
  vitA: 0, vitC: 0, vitD: 0, vitB12: 0,
};

function sumLogs(logs) {
  return logs.reduce((acc, log) => {
    Object.keys(EMPTY_TOTALS).forEach(k => { acc[k] += log[k] || 0; });
    return acc;
  }, { ...EMPTY_TOTALS });
}

export default function Dashboard() {
  const [today] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [userData, setUserData] = useState(null);
  const [todaysLogs, setTodaysLogs] = useState([]);
  const [dailyTotals, setDailyTotals] = useState(EMPTY_TOTALS);
  const [currentTab, setCurrentTab] = useState('home');
  const [isScanning, setIsScanning] = useState(false);
  const [isLabelScanning, setIsLabelScanning] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const loadData = useCallback(() => {
    const profile = storage.getProfile();
    const targets = storage.getTargets();
    if (!profile || !targets) setIsSettingsOpen(true);
    setUserData({ profile, targets });
    const logs = storage.getLogs(selectedDate).sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );
    setTodaysLogs(logs);
    setDailyTotals(sumLogs(logs));
  }, [selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const logFood = useCallback(async (product, editingEntry = null) => {
    const existingLogId = editingEntry?.id ?? null;
    const getNutrient = (keyStub) => {
      const val = product.nutriments?.[`${keyStub}_serving`] ||
        product.nutriments?.[`${keyStub}_100g`] ||
        product[keyStub] || 0;
      return Number(val);
    };

    const rawSodium = getNutrient('sodium');
    const sodiumMg = product.source === 'Global' ? rawSodium * 1000 : rawSodium;

    const foodEntry = {
      name: product.product_name || product.name || 'Unknown Item',
      brand: product.brands || product.brand || '',
      calories: Math.round(parseFloat(getNutrient('energy-kcal') || getNutrient('calories')) || 0),
      protein: parseFloat(getNutrient('proteins') || getNutrient('protein')) || 0,
      carbs: parseFloat(getNutrient('carbohydrates') || getNutrient('carbs')) || 0,
      fats: parseFloat(getNutrient('fat') || getNutrient('fats')) || 0,
      fiber: parseFloat(getNutrient('fiber')) || 0,
      sodium: parseFloat(sodiumMg) || 0,
      potassium: parseFloat(getNutrient('potassium')) || 0,
      sugar: parseFloat(getNutrient('sugars') || getNutrient('sugar')) || 0,
      iron: parseFloat(getNutrient('iron')) || 0,
      calcium: parseFloat(getNutrient('calcium')) || 0,
      magnesium: parseFloat(getNutrient('magnesium')) || 0,
      zinc: parseFloat(getNutrient('zinc')) || 0,
      vitA: parseFloat(getNutrient('vitamin-a') || getNutrient('vitA')) || 0,
      vitC: parseFloat(getNutrient('vitamin-c') || getNutrient('vitC')) || 0,
      vitD: parseFloat(getNutrient('vitamin-d') || getNutrient('vitD')) || 0,
      vitB12: parseFloat(getNutrient('vitamin-b12') || getNutrient('vitB12')) || 0,
      date: selectedDate,
      timestamp: editingEntry?.timestamp || new Date().toISOString(),
    };

    if (existingLogId && existingLogId !== 'new-scan') {
      storage.updateLog(existingLogId, foodEntry);
    } else {
      storage.addLog(foodEntry);
      const productName = foodEntry.name?.toLowerCase().trim();
      if (productName && productName !== 'unknown item') {
        storage.setProduct(productName, { ...foodEntry });
      }
    }

    setEditingLog(null);
    setIsManualEntryOpen(false);
    setCurrentTab('home');
    loadData();
  }, [selectedDate, loadData]);

  const handleDelete = (logId) => {
    if (typeof window === 'undefined' || !window.confirm('Delete this entry?')) return;
    storage.deleteLog(logId);
    loadData();
  };

  const handleManualEntryClose = () => {
    setIsManualEntryOpen(false);
    setEditingLog(null);
  };

  const changeDate = (days) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === today;

  return (
    <main className="min-h-screen bg-zinc-950 pb-24">
      <WeightReminderBanner
        lastUpdated={userData?.profile?.lastUpdated}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <header className="px-5 pt-12 pb-4 flex justify-between items-center">
        <h1 className="text-lg font-black text-slate-100">
          {currentTab === 'home' ? 'My Day' : currentTab === 'add' ? 'Log Food' : 'Insights'}
        </h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 bg-zinc-800 rounded-2xl border border-zinc-700 active:scale-95 transition-all"
        >
          <Settings size={18} className="text-zinc-400" />
        </button>
      </header>

      <div className="px-4 max-w-md mx-auto">

        {currentTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-3">
              <button onClick={() => changeDate(-1)} className="p-1 text-zinc-400 active:text-slate-100 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-slate-200">
                {isToday
                  ? 'Today'
                  : new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => changeDate(1)} disabled={isToday} className="p-1 text-zinc-400 active:text-slate-100 transition-colors disabled:opacity-20">
                <ChevronRight size={20} />
              </button>
            </div>

            {userData?.targets && (
              <DailyProgress targets={userData.targets} current={dailyTotals} />
            )}

            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Micronutrients</p>
              <div className="grid grid-cols-3 gap-4">
                <MicroStat label="Fiber" value={dailyTotals.fiber} unit="g" color="text-emerald-400" />
                <MicroStat label="Sodium" value={dailyTotals.sodium} unit="mg" color="text-orange-400" />
                <MicroStat label="Potassium" value={dailyTotals.potassium} unit="mg" color="text-blue-400" />
                <MicroStat label="Sugar" value={dailyTotals.sugar} unit="g" color="text-rose-400" />
                <MicroStat label="Iron" value={dailyTotals.iron} unit="mg" color="text-red-400" />
                <MicroStat label="Calcium" value={dailyTotals.calcium} unit="mg" color="text-purple-400" />
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-4 gap-2">
                {[
                  { label: 'A', val: dailyTotals.vitA },
                  { label: 'C', val: dailyTotals.vitC },
                  { label: 'D', val: dailyTotals.vitD },
                  { label: 'B12', val: dailyTotals.vitB12 },
                ].map(({ label, val }) => (
                  <div key={label} className={`flex flex-col items-center p-2 rounded-xl ${val > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'opacity-20'}`}>
                    <span className={`text-[10px] font-bold ${val > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>Vit {label}</span>
                    <span className={`text-xs font-black ${val > 0 ? 'text-amber-300' : 'text-zinc-600'}`}>{Math.round(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            <LogList
              logs={todaysLogs}
              onDelete={handleDelete}
              onEdit={(log) => { setEditingLog(log); setIsManualEntryOpen(true); }}
            />
          </div>
        )}

        {currentTab === 'add' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <WaterTracker date={selectedDate} waterGoal={userData?.profile?.waterGoalOz} />
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-4 space-y-3">
              <button
                onClick={() => setIsScanning(true)}
                className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 rounded-2xl text-white font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <ScanLine size={22} /> Scan Barcode
              </button>
              <button
                onClick={() => setIsLabelScanning(true)}
                className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl text-slate-200 font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Type size={18} /> Scan Nutrition Label
              </button>
              <button
                onClick={() => setIsManualEntryOpen(true)}
                className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl text-slate-200 font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Zap size={18} /> Search / Manual Entry
              </button>
            </div>
            <QuickLog onAdd={logFood} />
          </div>
        )}

        {currentTab === 'insights' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <WeightChart />
            <WeeklyInsights dailyCalorieTarget={userData?.targets?.calories || 2000} />
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 px-6 py-3 flex justify-around items-center z-30">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'add', icon: Plus, label: 'Log' },
          { id: 'insights', icon: BarChart2, label: 'Insights' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentTab === id ? 'text-emerald-400' : 'text-zinc-500'}`}
          >
            <Icon size={22} strokeWidth={currentTab === id ? 2.5 : 1.8} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </nav>

      {isSettingsOpen && (
        <SettingsModal
          currentProfile={userData?.profile}
          onClose={() => { setIsSettingsOpen(false); loadData(); }}
        />
      )}

      {isScanning && (
        <BarcodeScanner
          onResult={(p) => {
            const normalizedProduct = {
              ...p,
              source: 'Global',
              nutriments: {
                ...p.nutriments,
                'energy-kcal_100g': p.nutriments['energy-kcal_serving'] || p.nutriments['energy-kcal_100g'] || 0,
                'proteins_100g': p.nutriments['proteins_serving'] || p.nutriments['proteins_100g'] || 0,
                'carbohydrates_100g': p.nutriments['carbohydrates_serving'] || p.nutriments['carbohydrates_100g'] || 0,
                'fat_100g': p.nutriments['fat_serving'] || p.nutriments['fat_100g'] || 0,
              },
            };
            setEditingLog({ product: normalizedProduct, isNewFromScan: true, id: 'new-scan' });
            setIsScanning(false);
            setIsManualEntryOpen(true);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}

      {isLabelScanning && (
        <LabelScanner
          onResult={(p) => {
            setEditingLog({ product: p, isNewFromScan: true, id: 'new-scan' });
            setIsLabelScanning(false);
            setIsManualEntryOpen(true);
          }}
          onClose={() => setIsLabelScanning(false)}
        />
      )}

      {isManualEntryOpen && (
        <ManualEntry
          initialData={editingLog}
          onAdd={(entry) => logFood(entry, editingLog)}
          onClose={handleManualEntryClose}
        />
      )}
    </main>
  );
}

function MicroStat({ label, value, unit, color }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">{label}</p>
      <p className={`text-sm font-black ${color}`}>
        {Math.round(value || 0)}<span className="text-[10px] ml-0.5 text-zinc-600">{unit}</span>
      </p>
    </div>
  );
}
