'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, deleteDoc, query, where, orderBy, setDoc, updateDoc } from 'firebase/firestore';
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

export default function Dashboard({ userId, onSignOut }) {
  const [userData, setUserData] = useState(null);
  const [todaysLogs, setTodaysLogs] = useState([]); 
  const [dailyTotals, setDailyTotals] = useState({ 
    calories: 0, protein: 0, carbs: 0, fats: 0,
    fiber: 0, sodium: 0, potassium: 0, sugar: 0, calcium: 0, iron: 0, magnesium: 0, zinc: 0,
    vitA: 0, vitC: 0, vitD: 0, vitB12: 0
  });
  
  const [currentTab, setCurrentTab] = useState('home'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [isScanning, setIsScanning] = useState(false);
  const [isLabelScanning, setIsLabelScanning] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        if (!data.profile?.weight || !data.profile?.age) {
          setCurrentTab('add');
          setIsSettingsOpen(true);
        }
      } else {
        setCurrentTab('add');
        setIsSettingsOpen(true);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    const logsRef = collection(db, "users", userId, "logs");
    const q = query(logsRef, where("date", "==", selectedDate), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(q, (snapshot) => {
      let totals = { 
        calories: 0, protein: 0, carbs: 0, fats: 0,
        fiber: 0, sodium: 0, potassium: 0, sugar: 0, calcium: 0, iron: 0, magnesium: 0, zinc: 0,
        vitA: 0, vitC: 0, vitD: 0, vitB12: 0
      };
      const logs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        totals.calories += data.calories || 0;
        totals.protein += data.protein || 0;
        totals.carbs += data.carbs || 0;
        totals.fats += data.fats || 0;
        totals.fiber += data.fiber || 0;
        totals.sodium += data.sodium || 0;
        totals.potassium += data.potassium || 0;
        totals.sugar += data.sugar || 0;
        totals.iron += data.iron || 0;
        totals.calcium += data.calcium || 0;
        totals.magnesium += data.magnesium || 0;
        totals.zinc += data.zinc || 0;
        totals.vitA += data.vitA || 0;
        totals.vitC += data.vitC || 0;
        totals.vitD += data.vitD || 0;
        totals.vitB12 += data.vitB12 || 0;
        logs.push({ id: doc.id, ...data });
      });
      setDailyTotals(totals);
      setTodaysLogs(logs);
    });
    return () => unsubLogs();
  }, [userId, selectedDate]);

  const logFood = async (product, existingLogId = null) => {
    const getNutrient = (keyStub) => {
        const val = product.nutriments?.[`${keyStub}_serving`] || 
                    product.nutriments?.[`${keyStub}_100g`] || 
                    product[keyStub] || 0;
        return Number(val);
    };

    // FIX: Unified sodium handling. Sodium from the Open Food Facts API is stored
    // in kg/100g (e.g. 0.001 = 1mg), so we multiply by 1000 to convert to mg.
    // Sodium from manual entry, OCR (label-scanner), and the local FOOD_DATABASE
    // is already in mg, so no conversion is needed for those paths.
    // We detect the "Global DB" source to apply the conversion only where required.
    const rawSodium = getNutrient('sodium');
    const isGlobalSource = product.source === 'Global';
    const sodiumMg = isGlobalSource ? rawSodium * 1000 : rawSodium;
    
    const foodEntry = {
      name: product.product_name || product.name || "Unknown Item",
      brand: product.brands || product.brand || "",
      calories: Math.round(getNutrient('energy-kcal') || getNutrient('calories')),
      protein: Number(getNutrient('proteins') || getNutrient('protein')),
      carbs: Number(getNutrient('carbohydrates') || getNutrient('carbs')),
      fats: Number(getNutrient('fat') || getNutrient('fats')),
      fiber: getNutrient('fiber'),
      sodium: sodiumMg,
      potassium: getNutrient('potassium'),
      sugar: getNutrient('sugars') || getNutrient('sugar'),
      iron: getNutrient('iron'),
      calcium: getNutrient('calcium'),
      magnesium: getNutrient('magnesium'),
      zinc: getNutrient('zinc'),
      vitA: getNutrient('vitamin-a') || getNutrient('vitA'),
      vitC: getNutrient('vitamin-c') || getNutrient('vitC'),
      vitD: getNutrient('vitamin-d') || getNutrient('vitD'),
      vitB12: getNutrient('vitamin-b12') || getNutrient('vitB12'),
      date: selectedDate,
      timestamp: editingLog?.timestamp || new Date().toISOString()
    };

    try {
      if (existingLogId && existingLogId !== "new-scan") {
        await updateDoc(doc(db, "users", userId, "logs", existingLogId), foodEntry);
      } else {
        await addDoc(collection(db, "users", userId, "logs"), foodEntry);
        if (foodEntry.name) {
          const productId = foodEntry.name.toLowerCase().trim();
          await setDoc(doc(db, "products", productId), {
            product_name: foodEntry.name,
            brands: foodEntry.brand,
            nutriments: product.nutriments || product,
            lastLogged: new Date().toISOString()
          }, { merge: true });
        }
      }
      setEditingLog(null);
      setIsManualEntryOpen(false);
      setCurrentTab('home');
    } catch (error) { console.error("Save error:", error); }
  };

  const handleDelete = async (logId) => {
    if (confirm("Remove this item?")) {
      try {
        await deleteDoc(doc(db, "users", userId, "logs", logId));
      } catch (error) { console.error("Delete error:", error); }
    }
  };

  const changeDate = (days) => {
    const current = new Date(selectedDate + 'T12:00:00'); 
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-slate-700 uppercase tracking-widest">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      Syncing...
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-32 animate-in fade-in duration-500">
      <WeightReminderBanner lastUpdated={userData?.profile?.lastUpdated} />

      <header className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-20 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <span className="text-xl">⚙️</span>
          </button>
          <h1 className="text-xl font-black text-black capitalize">
            {currentTab === 'home' ? 'My Day' : currentTab === 'add' ? 'Log Entry' : 'Insights'}
          </h1>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl active:scale-95 transition-all">
          <span className="text-[10px] font-black uppercase tracking-tighter">Switch</span>
          <span className="text-sm">👤</span>
        </button>
      </header>

      <div className="p-6 max-w-md mx-auto">
        {currentTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-300">
            <nav className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-2 text-slate-900">◀</button>
              <p className="text-sm font-black text-black">{isToday ? "Today" : selectedDate}</p>
              <button onClick={() => changeDate(1)} className="p-2 text-slate-900">▶</button>
            </nav>

            <div className="bg-white p-1 rounded-[2rem] shadow-xl shadow-slate-200/50">
              {userData?.targets && <DailyProgress targets={userData.targets} current={dailyTotals} />}
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Nutrient Snapshot</h3>
                <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                    <MicroStat label="Fiber" value={dailyTotals.fiber} unit="g" color="text-emerald-600" />
                    <MicroStat label="Sodium" value={dailyTotals.sodium} unit="mg" color="text-orange-600" />
                    <MicroStat label="Potassium" value={dailyTotals.potassium} unit="mg" color="text-blue-600" />
                    <MicroStat label="Sugar" value={dailyTotals.sugar} unit="g" color="text-rose-600" />
                    <MicroStat label="Iron" value={dailyTotals.iron} unit="mg" color="text-red-600" />
                    <MicroStat label="Calcium" value={dailyTotals.calcium} unit="mg" color="text-purple-600" />
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-4 gap-2">
                    <VitIcon label="A" val={dailyTotals.vitA} />
                    <VitIcon label="C" val={dailyTotals.vitC} />
                    <VitIcon label="D" val={dailyTotals.vitD} />
                    <VitIcon label="B12" val={dailyTotals.vitB12} />
                </div>
            </div>

            <LogList 
              logs={todaysLogs} 
              onDelete={handleDelete} 
              onEdit={(log) => {
                setEditingLog(log);
                setIsManualEntryOpen(true);
              }}
            />
          </div>
        )}

        {currentTab === 'add' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-200">
            <WaterTracker userId={userId} date={selectedDate} />
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-50 space-y-6">
                <div className="space-y-4">
                    <button onClick={() => setIsScanning(true)} className="w-full h-20 bg-blue-600 rounded-3xl text-white font-black flex items-center justify-center gap-4 active:scale-95 transition-all text-lg shadow-lg shadow-blue-100">
                        <span className="text-2xl">📷</span> SCAN BARCODE
                    </button>
                    <button 
                      onClick={() => setIsLabelScanning(true)} 
                      className="w-full h-16 bg-slate-800 border-2 border-slate-700 rounded-3xl text-white font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span>📸</span> SCAN NUTRITION FACTS
                    </button>
                    <button onClick={() => setIsManualEntryOpen(true)} className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl text-black font-black flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <span>✏️</span> SEARCH / MANUAL
                    </button>
                </div>
            </div>
            <QuickLog onLog={logFood} />
          </div>
        )}

        {currentTab === 'insights' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <WeightChart userId={userId} />
            <WeeklyInsights userId={userId} dailyCalorieTarget={userData?.targets?.calories || 2000} />
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-between items-center z-30 shadow-2xl">
        <button onClick={() => setCurrentTab('home')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentTab === 'home' ? 'text-blue-600 scale-110' : 'text-slate-700'}`}>
          <span className="text-2xl">🏠</span>
          <span className="text-[9px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => setCurrentTab('add')} className={`flex items-center justify-center -mt-12 w-16 h-16 rounded-full shadow-2xl transition-all border-4 border-slate-50 ${currentTab === 'add' ? 'bg-blue-600 text-white rotate-45 shadow-blue-200' : 'bg-slate-800 text-white shadow-slate-200'}`}>
          <span className="text-3xl font-light">+</span>
        </button>
        <button onClick={() => setCurrentTab('insights')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentTab === 'insights' ? 'text-blue-600 scale-110' : 'text-slate-700'}`}>
          <span className="text-2xl">📊</span>
          <span className="text-[9px] font-black uppercase">Charts</span>
        </button>
      </nav>

      {isSettingsOpen && <SettingsModal userId={userId} currentProfile={userData?.profile} onClose={() => setIsSettingsOpen(false)} />}
      
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
              }
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
            // OCR results have no 'source' field, so sodium won't be double-converted
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
          onAdd={(data, id) => logFood(data, id)} 
          onClose={() => {
            setIsManualEntryOpen(false);
            setEditingLog(null);
          }} 
        />
      )}
    </main>
  );
}

function MicroStat({ label, value, unit, color }) {
    return (
      <div className="text-center">
        <p className="text-[9px] font-black text-slate-700 uppercase mb-1">{label}</p>
        <p className={`text-sm font-black ${color}`}>{Math.round(value || 0)}<span className="text-[10px] ml-0.5">{unit}</span></p>
      </div>
    );
}
  
function VitIcon({ label, val }) {
    const hasValue = val > 0;
    return (
      <div className={`flex flex-col items-center p-2 rounded-2xl transition-all ${hasValue ? 'bg-yellow-50 border border-yellow-100' : 'opacity-20 grayscale'}`}>
        <span className={`text-[10px] font-black ${hasValue ? 'text-yellow-700' : 'text-slate-900'}`}>{label}</span>
      </div>
    );
}