import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ScannerModal } from './ScannerModal';
import { Dashboard } from '../pages/Dashboard';
import { CategoryView } from '../pages/CategoryView';
import { SettingsPage } from '../pages/SettingsPage';
import { InventoryProvider, useInventory } from '../lib/store';
import { Menu, X, AlertCircle, RefreshCcw } from 'lucide-react';

export function LayoutContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom prop to pass the globally scanned barcode to the scanner modal
  const [globalScannedCode, setGlobalScannedCode] = useState('');

  const { dbError, clearDbError, isOnline } = useInventory();

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

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
      
      // If user is naturally typing in an input field, do not intercept, let it flow naturally
      if (isInput) return;

      const currentTime = Date.now();
      
      // Typically, physical barcode scanners type very rapidly (<30ms per character).
      // If there's more than 100ms between key strokes, it's likely human typing, so we reset.
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      // Handle the physical "Enter" sent by scanner guns at the end of a scan
      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          // It's a scanned barcode!
          e.preventDefault();
          setGlobalScannedCode(buffer);
          setIsScannerOpen(true);
          buffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Collect standard alphanumeric characters
        buffer += e.key;
        
        // Safety timeout to clear buffer if Enter never arrives
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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800 w-full">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 font-bold">
            SJ
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">SUKJAI Hub</span>
            <span className="text-[10px] text-slate-400 font-semibold">WARD INVENTORY</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Light-weight status indicator on mobile header */}
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 bg-white shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          currentView={currentView} 
          onNavigate={handleNavigate} 
          onOpenScanner={() => {
            setGlobalScannedCode(''); // Clear on manual open
            setIsScannerOpen(true);
            setIsMobileMenuOpen(false);
          }}
        />
      </div>
      
      {/* Container holding Banners + Content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        
        {/* Global Supabase DB Alert Notification */}
        {dbError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 flex flex-wrap items-center justify-between text-rose-900 text-xs md:text-sm font-bold z-50 shadow-sm animate-fade-in gap-3">
            <div className="flex items-center gap-2.5 max-w-[85%]">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span className="leading-relaxed">⚠️ ขัดข้องเกี่ยวกับการบันทึกออนไลน์: {dbError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xs bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCcw size={14} />
                อัปเดตระบบเพื่อแก้ไข
              </button>
              <button
                onClick={clearDbError}
                className="p-1 px-2.5 rounded-xl text-rose-500 font-extrabold text-xs bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 w-full relative">
          {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentView.startsWith('category_') && (
            <CategoryView categoryId={currentView.replace('category_', '')} />
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
    <InventoryProvider>
      <LayoutContent />
    </InventoryProvider>
  );
}
