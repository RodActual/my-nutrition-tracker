'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, deleteDoc, query, where, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import DailyProgress from './daily-progress';
import BarcodeScanner from './barcode-scanner';
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
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  
  const [currentTab, setCurrentTab] = useState('home'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [isScanning, setIsScanning] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // State for the log currently being edited or confirmed from a scan
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
      let totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      const logs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        totals.calories += data.calories || 0;
        totals.protein += data.protein || 0;
        totals.carbs += data.carbs || 0;
        totals.fats += data.fats || 0;
        logs.push({ id: doc.id, ...data });
      });
      setDailyTotals(totals);
      setTodaysLogs(logs);
    });
    return () => unsubLogs();
  }, [userId, selectedDate]);

  const logFood = async (product, existingLogId = null) => {
    // This helper extracts nutrients whether they are labeled as _serving or _100g
    const getNutrient = (keyStub) => Math.round(product.nutriments[`${keyStub}_serving`] || product.nutriments[`${keyStub}_100g`] || 0);
    
    const foodEntry = {
      name: product.product_name || "Unknown Item",
      brand: product.brands || "",
      calories: Math.round(product.nutriments['energy-kcal_serving'] || product.nutriments['energy-kcal_100g'] || 0),
      protein: getNutrient('proteins'),
      carbs: getNutrient('carbohydrates'),
      fats: getNutrient('fat'),
      date: selectedDate,
      timestamp: editingLog?.timestamp || new Date().toISOString()
    };

    try {
      if (existingLogId) {
        // UPDATE Existing Log
        await updateDoc(doc(db, "users", userId, "logs", existingLogId), foodEntry);
      } else {
        // CREATE New Log
        await addDoc(collection(db, "users", userId, "logs"), foodEntry);
        
        // Save to global Learning Database for shared search
        if (product.product_name) {
          const productId = product.product_name.toLowerCase().trim();
          await setDoc(doc(db, "products", productId), {
            product_name: product.product_name,
            brands: product.brands || "",
            nutriments: product.nutriments,
            lastLogged: new Date().toISOString()
          }, { merge: true });
        }
      }

      setEditingLog(null);
      setIsManualEntryOpen(false);
      setCurrentTab('home');
    } catch (error) { 
      console.error("Save error:", error); 
    }
  };

  const handleDelete = async (logId) => {
    if (confirm("Remove this item?")) {
      try {
        await deleteDoc(doc(db, "users", userId, "logs", logId));
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const changeDate = (days) => {
    const current = new Date(selectedDate + 'T12:00:00'); 
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-slate-300 uppercase tracking-widest">
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
          <h1 className="text-xl font-black text-slate-800 capitalize">
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
            <nav className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100">
              <button onClick={() => changeDate(-1)} className="p-2 text-slate-400">◀</button>
              <p className="text-sm font-black text-slate-800">{isToday ? "Today" : selectedDate}</p>
              <button onClick={() => changeDate(1)} className="p-2 text-slate-400">▶</button>
            </nav>
            <div className="bg-white p-1 rounded-[2rem] shadow-xl shadow-slate-200/50">
              {userData?.targets && <DailyProgress targets={userData.targets} current={dailyTotals} />}
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
                    <button 
                      onClick={() => setIsScanning(true)} 
                      className="w-full h-20 bg-blue-600 rounded-3xl text-white font-black flex items-center justify-center gap-4 active:scale-95 transition-all text-lg shadow-lg shadow-blue-100"
                    >
                        <span className="text-2xl">📷</span> SCAN BARCODE
                    </button>
                    <button 
                      onClick={() => setIsManualEntryOpen(true)} 
                      className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl text-slate-600 font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
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
        <button onClick={() => setCurrentTab('home')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentTab === 'home' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
          <span className="text-2xl">🏠</span>
          <span className="text-[9px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => setCurrentTab('add')} className={`flex items-center justify-center -mt-12 w-16 h-16 rounded-full shadow-2xl transition-all border-4 border-slate-50 ${currentTab === 'add' ? 'bg-blue-600 text-white rotate-45 shadow-blue-200' : 'bg-slate-800 text-white shadow-slate-200'}`}>
          <span className="text-3xl font-light">+</span>
        </button>
        <button onClick={() => setCurrentTab('insights')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentTab === 'insights' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
          <span className="text-2xl">📊</span>
          <span className="text-[9px] font-black uppercase">Charts</span>
        </button>
      </nav>

      {isSettingsOpen && <SettingsModal userId={userId} currentProfile={userData?.profile} onClose={() => setIsSettingsOpen(false)} />}
      
      {/* SCANNER HAND-OFF WITH DATA NORMALIZATION */}
      {isScanning && (
        <BarcodeScanner 
          onResult={(p) => {
            // Normalize the nutriment keys before sending to the ManualEntry modal
            const normalizedProduct = {
              ...p,
              nutriments: {
                'energy-kcal_100g': p.nutriments['energy-kcal_serving'] || p.nutriments['energy-kcal_100g'] || 0,
                'proteins_100g': p.nutriments['proteins_serving'] || p.nutriments['proteins_100g'] || 0,
                'carbohydrates_100g': p.nutriments['carbohydrates_serving'] || p.nutriments['carbohydrates_100g'] || 0,
                'fat_100g': p.nutriments['fat_serving'] || p.nutriments['fat_100g'] || 0,
              }
            };
            setEditingLog({ product: normalizedProduct, isNewFromScan: true });
            setIsScanning(false);
            setIsManualEntryOpen(true);
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {isManualEntryOpen && (
        <ManualEntry 
          initialData={editingLog}
          onAdd={(data) => logFood(data, editingLog?.id)} 
          onClose={() => {
            setIsManualEntryOpen(false);
            setEditingLog(null);
          }} 
        />
      )}
    </main>
  );
}