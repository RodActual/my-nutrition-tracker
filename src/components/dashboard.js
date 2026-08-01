'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/lib/storage';
import { getMicronutrientTargets, formatFullDate } from '@/lib/trends';
import { Home, Plus, BarChart2, Settings, ScanLine, Type, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import DailyProgress from './daily-progress';
import BarcodeScanner from './barcode-scanner';
import LabelScanner from './label-scanner';
import WeightReminderBanner from './weight-reminder-banner';
import ManualEntry from './manual-entry';
import LogList from './log-list';
import SettingsModal from './settings-modal';
import QuickLog from './quick-log';
import FrequentFoods from './frequent-foods';
import RecipesCard from './recipes-card';
import RecipeBuilder from './recipe-builder';
import StreakCard from './streak-card';
import ActivitySummary from './activity-summary';
import WaterQuickLog from './water-quick-log';
import WeighInCard from './weigh-in-card';
import WeightHistory from './weight-history';
import GoalCelebration from './goal-celebration';
import TimeRangeSelector from './time-range-selector';
import WeightTrendChart from './charts/weight-trend-chart';
import GoalProgressCard from './goal-progress-card';
import EnergyBalanceChart from './charts/energy-balance-chart';
import MacroTrendChart from './charts/macro-trend-chart';
import ActivityChart from './charts/activity-chart';
import WaterChart from './charts/water-chart';
import NutrientExplorerChart from './charts/nutrient-explorer-chart';
import WaterTracker from './water-tracker';
import WeeklyReport from './weekly-report';

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
  const [trendRange, setTrendRange] = useState(30);
  const microTargets = useMemo(() => {
    const list = getMicronutrientTargets(userData?.profile?.healthProfile);
    return Object.fromEntries(list.map(m => [m.key, m]));
  }, [userData?.profile?.healthProfile]);
  const [undoEntry, setUndoEntry] = useState(null);
  const [isRecipeBuilderOpen, setIsRecipeBuilderOpen] = useState(false);
  const [recipesVersion, setRecipesVersion] = useState(0);

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
      const saved = storage.addLog(foodEntry);
      const productName = foodEntry.name?.toLowerCase().trim();
      if (productName && productName !== 'unknown item') {
        storage.setProduct(productName, { ...foodEntry });
      }
      // One-tap adds get a 5s undo toast (no confirm dialog to slow logging down)
      if (['Quick', 'Frequent', 'Recipe'].includes(product.source)) {
        setUndoEntry({ id: saved.id, name: saved.name });
        setTimeout(() => setUndoEntry(u => (u?.id === saved.id ? null : u)), 5000);
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

  const copyLogsToToday = (entries) => {
    for (const entry of entries) {
      const { id, ...rest } = entry;
      // preserve the original time-of-day so meal grouping carries over
      const time = typeof rest.timestamp === 'string' && rest.timestamp.includes('T')
        ? rest.timestamp.slice(11)
        : '12:00:00.000Z';
      storage.addLog({ ...rest, date: today, timestamp: `${today}T${time}` });
    }
    setSelectedDate(today);
    loadData();
  };

  const copyYesterday = () => {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    const entries = storage.getLogs(yesterday).filter(l => l.source !== 'AppleHealth');
    if (!entries.length) {
      alert('Nothing logged yesterday to copy.');
      return;
    }
    copyLogsToToday(entries);
  };

  const changeDate = (days) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === today;

  return (
    <main className="min-h-screen bg-[var(--bg)] pb-24">
      <WeightReminderBanner onSaved={loadData} />

      <header
        className="px-5 pb-4 flex justify-between items-center"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <h1 className="text-lg font-black text-[var(--text-primary)]">
          {currentTab === 'home' ? 'My Day' : currentTab === 'add' ? 'Log Food' : 'Trends'}
        </h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 bg-[var(--surface-2)] rounded-2xl border border-[var(--border-2)] active:scale-95 transition-all"
        >
          <Settings size={18} className="text-[var(--text-secondary)]" />
        </button>
      </header>

      <div className="px-4 max-w-md mx-auto">

        {currentTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-[var(--surface)] rounded-2xl border border-[var(--border)] px-4 py-3">
              <button onClick={() => changeDate(-1)} className="p-1 text-[var(--text-secondary)] active:text-[var(--text-primary)] transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {isToday ? 'Today' : formatFullDate(selectedDate)}
              </span>
              <button onClick={() => changeDate(1)} disabled={isToday} className="p-1 text-[var(--text-secondary)] active:text-[var(--text-primary)] transition-colors disabled:opacity-20">
                <ChevronRight size={20} />
              </button>
            </div>

            <GoalProgressCard profile={userData?.profile} onClick={() => setCurrentTab('insights')} />

            {userData?.targets && (
              <DailyProgress targets={userData.targets} current={dailyTotals} />
            )}

            <ActivitySummary date={selectedDate} refreshKey={todaysLogs.length} />

            <WaterQuickLog date={selectedDate} waterGoal={userData?.profile?.waterGoalOz} />

            <WeighInCard onSaved={loadData} />

            <StreakCard targets={userData?.targets} refreshKey={todaysLogs.length} />

            <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
              <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Micronutrients · % of daily target</p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <MicroStat label="Fiber" value={dailyTotals.fiber} unit="g" rda={microTargets.fiber.rda} color="#34d399" />
                <MicroStat label="Sodium" value={dailyTotals.sodium} unit="mg" rda={microTargets.sodium.rda} limit color="#fb923c" />
                <MicroStat label="Potassium" value={dailyTotals.potassium} unit="mg" rda={microTargets.potassium.rda} color="#60a5fa" />
                <MicroStat label="Sugar" value={dailyTotals.sugar} unit="g" rda={microTargets.sugar.rda} limit color="#fb7185" />
                <MicroStat label="Iron" value={dailyTotals.iron} unit="mg" rda={microTargets.iron.rda} color="#f87171" />
                <MicroStat label="Calcium" value={dailyTotals.calcium} unit="mg" rda={microTargets.calcium.rda} color="#c084fc" />
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-4 gap-2">
                {[
                  { label: 'A', val: dailyTotals.vitA },
                  { label: 'C', val: dailyTotals.vitC },
                  { label: 'D', val: dailyTotals.vitD },
                  { label: 'B12', val: dailyTotals.vitB12 },
                ].map(({ label, val }) => (
                  <div key={label} className={`flex flex-col items-center p-2 rounded-xl ${val > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'opacity-20'}`}>
                    <span className={`text-[10px] font-bold ${val > 0 ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}`}>Vit {label}</span>
                    <span className={`text-xs font-black ${val > 0 ? 'text-amber-300' : 'text-[var(--text-tertiary)]'}`}>{Math.round(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            <LogList
              logs={todaysLogs}
              onDelete={handleDelete}
              onEdit={(log) => { setEditingLog(log); setIsManualEntryOpen(true); }}
              onCopyMeal={!isToday ? copyLogsToToday : undefined}
              onCopyYesterday={isToday ? copyYesterday : undefined}
            />
          </div>
        )}

        {currentTab === 'add' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <WaterTracker date={selectedDate} waterGoal={userData?.profile?.waterGoalOz} />
            <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-4 space-y-3">
              <button
                onClick={() => setIsScanning(true)}
                className="w-full h-16 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-2xl text-white font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <ScanLine size={22} /> Scan Barcode
              </button>
              <button
                onClick={() => setIsLabelScanning(true)}
                className="w-full h-14 bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] rounded-2xl text-[var(--text-primary)] font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Type size={18} /> Scan Nutrition Label
              </button>
              <button
                onClick={() => setIsManualEntryOpen(true)}
                className="w-full h-14 bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] rounded-2xl text-[var(--text-primary)] font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Zap size={18} /> Search / Manual Entry
              </button>
            </div>
            <RecipesCard
              key={recipesVersion}
              onAdd={logFood}
              onOpenBuilder={() => setIsRecipeBuilderOpen(true)}
            />
            <FrequentFoods onAdd={logFood} />
            <QuickLog onAdd={logFood} />
          </div>
        )}

        {currentTab === 'insights' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <TimeRangeSelector value={trendRange} onChange={setTrendRange} />
            <WeightTrendChart days={trendRange} profile={userData?.profile} />
            <WeightHistory onChanged={loadData} />
            <EnergyBalanceChart days={trendRange} profile={userData?.profile} />
            <MacroTrendChart days={trendRange} targets={userData?.targets} />
            <ActivityChart days={trendRange} />
            <WaterChart days={trendRange} waterGoal={userData?.profile?.waterGoalOz} />
            <NutrientExplorerChart days={trendRange} healthProfile={userData?.profile?.healthProfile} />
            <WeeklyReport profile={userData?.profile} />
          </div>
        )}
      </div>

      {undoEntry && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3 flex items-center justify-between z-40 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-sm text-[var(--text-primary)] truncate flex-1">Logged {undoEntry.name}</p>
          <button
            type="button"
            onClick={() => {
              storage.deleteLog(undoEntry.id);
              setUndoEntry(null);
              loadData();
            }}
            className="ml-3 text-xs font-black uppercase tracking-wider text-[var(--accent)] shrink-0"
          >
            Undo
          </button>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 bg-[var(--surface-translucent)] backdrop-blur-xl border-t border-[var(--border)] px-6 pt-3 flex justify-around items-center z-30"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'add', icon: Plus, label: 'Log' },
          { id: 'insights', icon: BarChart2, label: 'Insights' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentTab === id ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}
          >
            <Icon size={22} strokeWidth={currentTab === id ? 2.5 : 1.8} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </nav>

      <GoalCelebration
        profile={userData?.profile}
        onUpdated={(action) => {
          loadData();
          if (action === 'open-settings') setIsSettingsOpen(true);
        }}
      />

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

      {isRecipeBuilderOpen && (
        <RecipeBuilder
          onClose={() => setIsRecipeBuilderOpen(false)}
          onSaved={() => setRecipesVersion(v => v + 1)}
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

// RDA-based micronutrient bar. `limit` nutrients (sodium, sugar) turn red past 100%.
function MicroStat({ label, value, unit, rda, limit = false, color }) {
  const pct = rda ? Math.min(100, Math.round(((value || 0) / rda) * 100)) : 0;
  const over = limit && (value || 0) > rda;
  const barColor = over ? '#ef4444' : color;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">{label}</p>
        <p className="text-[10px] font-black" style={{ color: barColor }}>
          {Math.round(value || 0)}<span className="text-[var(--text-tertiary)] font-bold">/{rda}{unit}</span>
        </p>
      </div>
      <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
