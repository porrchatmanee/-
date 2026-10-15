import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ScannerModal } from './ScannerModal';
import { Dashboard } from '../pages/Dashboard';
import { CategoryView } from '../pages/CategoryView';
import { SettingsPage } from '../pages/SettingsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { BorrowPage } from '../pages/BorrowPage';
import { SecretStockPage } from '../pages/SecretStockPage';
import { InventoryProvider, useInventory } from '../lib/store';
import { ThemeProvider, useTheme } from '../lib/theme';
import { 
  Menu, X, AlertCircle, RefreshCcw, ScanLine, 
  Sparkles, Heart, Sun, Moon, Coffee, Glasses, Check, Zap, Smile
} from 'lucide-react';
import { normalizeBarcode } from '../lib/barcode';
import { MascotAvatar } from '../lib/cuteIcons';

export function LayoutContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom prop to pass the globally scanned barcode to the scanner modal
  const [globalScannedCode, setGlobalScannedCode] = useState('');

  const { dbError, clearDbError, isOnline } = useInventory();
  const { fontSize, setFontSize, fontStyle, setFontStyle } = useTheme();

  // State for pre-selected item when navigating to Borrow page
  const [initialBorrowItem, setInitialBorrowItem] = useState<any>(null);

  const handleNavigate = (view: string, itemData?: any) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    if (view === 'borrow' && itemData) {
      setInitialBorrowItem(itemData);
    }
  };

  // Dynamic greeting based on current time
  const getCuteGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return { text: 'อรุณสวัสดิ์กะเช้า สดใสพร้อมลุยงานนะค้า ☀️', icon: <Sun size={15} className="text-amber-500 animate-spin-slow" /> };
    } else if (hour >= 12 && hour < 18) {
      return { text: 'สู้ๆ นะคะกะบ่าย อย่าลืมพักดื่มน้ำน้า 🧋', icon: <Coffee size={15} className="text-orange-500" /> };
    } else {
      return { text: 'เป็นกำลังใจให้กะดึกนะคะ ดูแลสุขภาพด้วยน้า 🌙', icon: <Moon size={15} className="text-indigo-400" /> };
    }
  };

  const greeting = getCuteGreeting();

  // Global Physical Barcode Scanner Interceptor (Keyboard Wedge)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = 
        activeElement && 
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
      
      if (isInput) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          const cleanCode = normalizeBarcode(buffer);
          setGlobalScannedCode(cleanCode);
          setIsScannerOpen(true);
          buffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          buffer = '';
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#fafbfc] font-sans overflow-hidden text-slate-800 w-full print:h-auto print:overflow-visible print:bg-white">
      
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-indigo-50/80 flex items-center justify-between px-4 z-40 print:hidden shadow-xs">
        <div className="flex items-center gap-2.5">
          <MascotAvatar size="sm" />
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-sm leading-tight">SUKJAI Hub</span>
              <span className="text-[9px] bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black px-1.5 py-0.2 rounded-full">3.0 ✨</span>
            </div>
            <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
              <span>WARD INVENTORY</span>
              <Heart size={9} className="fill-pink-500 text-pink-500" />
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Scan button on Mobile */}
          <button
            onClick={() => {
              setGlobalScannedCode('');
              setIsScannerOpen(true);
            }}
            className="p-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl shadow-xs active:scale-95 transition-all"
            title="สแกนบาร์โค้ด"
          >
            <ScanLine size={18} />
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden print:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 bg-white shrink-0 print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          currentView={currentView} 
          onNavigate={handleNavigate} 
          onOpenScanner={() => {
            setGlobalScannedCode('');
            setIsScannerOpen(true);
            setIsMobileMenuOpen(false);
          }}
        />
      </div>
      
      {/* Container holding Top Nav Bar + Banners + Content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 print:overflow-visible print:h-auto">
        
        {/* Desktop Top Header Bar (Modern, Youthful, Cute) */}
        <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-md border-b border-indigo-50/80 items-center justify-between px-6 z-30 shrink-0 print:hidden">
          {/* Left: Friendly Greeting & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-violet-50 via-pink-50/40 to-indigo-50/50 border border-violet-100/60 rounded-2xl px-3.5 py-1.5 shadow-2xs">
              {greeting.icon}
              <span className="text-xs font-semibold text-slate-700">
                {greeting.text}
              </span>
              <Sparkles size={13} className="text-pink-400" />
            </div>

            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/60 text-emerald-700 px-3 py-1 rounded-2xl text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>สต็อกพร้อมใช้งาน 💖</span>
            </div>
          </div>

          {/* Right: Modern Font Size Presets & Quick Action */}
          <div className="flex items-center gap-3">
            {/* Font Size Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                <Glasses size={13} className="text-violet-500" />
                <span>ตัวหนังสือ:</span>
              </span>
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  fontSize === 'normal'
                    ? 'bg-white text-violet-700 shadow-xs border border-violet-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="ขนาดปกติ โมเดิร์นวัยรุ่น คมชัด"
              >
                🐥 ปกติ
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  fontSize === 'large'
                    ? 'bg-white text-violet-700 shadow-xs border border-violet-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="ขนาดใหญ่ สบายตา เจ้าหน้าที่อ่านง่าย ไม่ปวดตา"
              >
                👓 สบายตา
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  fontSize === 'xlarge'
                    ? 'bg-white text-violet-700 shadow-xs border border-violet-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="ขนาดใหญ่พิเศษ ชัดเจนทุกมุมมอง"
              >
                🔍 ใหญ่สุด
              </button>
            </div>

            {/* Quick Top Scan Button */}
            <button
              onClick={() => {
                setGlobalScannedCode('');
                setIsScannerOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 hover:from-violet-700 hover:via-indigo-700 hover:to-pink-600 text-white px-3.5 py-2 rounded-2xl font-bold text-xs shadow-sm shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
            >
              <ScanLine size={15} className="stroke-[2.5]" />
              <span>สแกนบาร์โค้ด ⚡</span>
            </button>
          </div>
        </header>

        {/* Global Supabase DB Alert Notification */}
        {dbError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 flex flex-wrap items-center justify-between text-rose-900 text-xs md:text-sm font-bold z-50 shadow-sm animate-fade-in gap-3 print:hidden">
            <div className="flex items-center gap-2.5 max-w-[85%]">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span className="leading-relaxed">⚠️ ขัดข้องเกี่ยวกับการบันทึกออนไลน์: {dbError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  localStorage.clear();
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(regs => {
                      for(let reg of regs) reg.unregister();
                    });
                  }
                  window.location.href = window.location.pathname + '?refresh=' + Date.now();
                }}
                className="px-3 py-1.5 rounded-2xl text-white font-extrabold text-xs bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md border border-white/20"
              >
                <RefreshCcw size={14} />
                ล้างแคชและรีโหลดระบบ
              </button>
              <button
                onClick={() => {
                  window.location.href = window.location.pathname + '?t=' + new Date().getTime();
                }}
                className="px-3 py-1.5 rounded-2xl text-white font-extrabold text-xs bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCcw size={14} />
                รีเฟรชหน้าเว็บ
              </button>
              <button
                onClick={clearDbError}
                className="p-1 px-2.5 rounded-2xl text-rose-500 font-extrabold text-xs bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 w-full relative print:p-0 print:overflow-visible">
          {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentView === 'borrow' && (
            <BorrowPage 
              onNavigate={handleNavigate} 
              initialItem={initialBorrowItem}
              onClearInitialItem={() => setInitialBorrowItem(null)}
            />
          )}
          {currentView === 'secret_stock' && <SecretStockPage onNavigate={handleNavigate} />}
          {currentView === 'reports' && <ReportsPage />}
          {currentView.startsWith('category_') && (
            <CategoryView 
              categoryId={currentView.replace('category_', '')} 
              onNavigate={handleNavigate}
            />
          )}
          {currentView === 'settings' && <SettingsPage />}
        </main>
      </div>

      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => {
          setIsScannerOpen(false);
          setGlobalScannedCode('');
        }} 
        currentView={currentView}
        initialCode={globalScannedCode}
      />
    </div>
  );
}

export function Layout() {
  return (
    <ThemeProvider>
      <InventoryProvider>
        <LayoutContent />
      </InventoryProvider>
    </ThemeProvider>
  );
}
