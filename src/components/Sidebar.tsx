import React from 'react';
import { 
  Package, ScanLine, LayoutDashboard, Settings, Layers, 
  FileText, ArrowLeftRight, Lock, Unlock, Sparkles, Heart, 
  RotateCcw, ShieldCheck, HeartPulse, Stethoscope, Pill,
  Droplets, Laptop, TestTubes, Glasses, Eye, Star
} from 'lucide-react';
import { CATEGORIES } from '../lib/constants';
import { useInventory } from '../lib/store';
import { useTheme } from '../lib/theme';
import { MascotAvatar, getCategoryVisual } from '../lib/cuteIcons';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenScanner: () => void;
}

export function Sidebar({ currentView, onNavigate, onOpenScanner }: SidebarProps) {
  const { isOnline, isSyncing, borrowRecords, isSecretUnlocked } = useInventory();
  const { fontSize, setFontSize } = useTheme();

  const activeBorrowedCount = (borrowRecords || []).filter(r => r.status !== 'RETURNED').length;

  return (
    <div className="w-64 bg-white/95 backdrop-blur-md border-r border-indigo-50/80 flex flex-col h-full shadow-[2px_0_16px_rgba(99,102,241,0.03)] select-none">
      
      {/* Brand Header with Mascot */}
      <div className="p-4 pb-3 border-b border-indigo-50/50">
        <div className="flex items-center gap-3">
          <MascotAvatar size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base tracking-tight text-slate-800 font-sans">
                SUKJAI Hub
              </h1>
              <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                3.0 ✨
              </span>
            </div>
            <p className="text-[11px] text-indigo-500/90 font-bold tracking-wide flex items-center gap-1">
              <span>คลังวอร์ดสุขใจ</span>
              <Heart size={10} className="fill-pink-500 text-pink-500 animate-pulse" />
              <span className="text-slate-400 font-normal">v-cute</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Scanner Action Button */}
      <div className="p-3 pb-2">
        <button
          onClick={onOpenScanner}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 hover:from-indigo-600 hover:via-violet-600 hover:to-pink-600 text-white rounded-2xl py-3 px-4 font-extrabold text-sm tracking-wide shadow-md shadow-indigo-200/70 hover:shadow-lg hover:shadow-indigo-300/80 active:scale-95 transition-all duration-200 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <ScanLine size={16} className="stroke-[2.5]" />
          </div>
          <span>สแกนรับ-จ่าย ⚡</span>
        </button>
      </div>

      {/* Navigation Area */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar text-sm font-medium">
        
        {/* Main Section */}
        <div className="px-3 pt-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={12} className="text-violet-400" />
          <span>เมนูหลัก</span>
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200 text-left group ${
            currentView === 'dashboard'
              ? 'bg-gradient-to-r from-violet-50 to-indigo-50/70 text-violet-700 font-bold border border-violet-100/80 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            currentView === 'dashboard' ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
          }`}>
            <LayoutDashboard size={16} />
          </div>
          <span className="flex-1 truncate">ภาพรวมสต็อก</span>
          <span className="text-xs">📊</span>
        </button>

        <button
          onClick={() => onNavigate('borrow')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 text-left group ${
            currentView === 'borrow'
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50/70 text-indigo-700 font-bold border border-indigo-100/80 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              currentView === 'borrow' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
            }`}>
              <ArrowLeftRight size={16} />
            </div>
            <span className="truncate">ระบบยืม-คืน</span>
          </div>
          <div className="flex items-center gap-1">
            {activeBorrowedCount > 0 ? (
              <span className="text-[10px] font-black bg-pink-100 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full">
                {activeBorrowedCount}
              </span>
            ) : (
              <span className="text-xs">🤝</span>
            )}
          </div>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200 text-left group ${
            currentView === 'reports'
              ? 'bg-gradient-to-r from-violet-50 to-indigo-50/70 text-violet-700 font-bold border border-violet-100/80 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            currentView === 'reports' ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
          }`}>
            <FileText size={16} />
          </div>
          <span className="flex-1 truncate">รายงาน &amp; พิมพ์</span>
          <span className="text-xs">📑</span>
        </button>

        {/* Categories Section with Cute Icons */}
        <div className="pt-3 pb-1.5 px-3 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-pink-400" />
            <span>หมวดหมู่คลัง</span>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{CATEGORIES.length} หมวด</span>
        </div>
        
        {CATEGORIES.map(category => {
          const isActive = currentView === `category_${category.id}`;
          const visual = getCategoryVisual(category.id);
          const CatIcon = visual.icon;

          return (
            <button
              key={category.id}
              onClick={() => onNavigate(`category_${category.id}`)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all duration-200 text-left group ${
                isActive
                  ? `${category.bgColor} ${category.color} font-bold ring-1 ring-inset ${category.borderColor} shadow-2xs`
                  : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-800'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs ${
                isActive ? 'bg-white shadow-xs' : visual.badgeBg
              } border ${visual.borderColor}`}>
                <CatIcon size={14} className={visual.accentColor} />
              </div>
              <span className="flex-1 text-xs font-bold truncate">{category.name}</span>
              <span className="text-xs group-hover:scale-110 transition-transform">{visual.emoji}</span>
            </button>
          );
        })}

        {/* System & Secret */}
        <div className="pt-3 pb-1.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Settings size={12} className="text-indigo-400" />
          <span>ระบบ &amp; คลังพิเศษ</span>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200 text-left group ${
            currentView === 'settings'
              ? 'bg-slate-100 text-slate-800 font-bold border border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            currentView === 'settings' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            <Settings size={15} />
          </div>
          <span className="flex-1 truncate">ตั้งค่าระบบ</span>
          <span className="text-xs">⚙️</span>
        </button>

        {/* Secret Stock Pill */}
        <button
          onClick={() => onNavigate('secret_stock')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 text-left group ${
            currentView === 'secret_stock'
              ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200 shadow-2xs'
              : 'text-slate-500 hover:bg-rose-50/40 hover:text-rose-600'
          }`}
          title="คลังสำรองลับเฉพาะวอร์ด"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              currentView === 'secret_stock' ? 'bg-rose-500 text-white' : 'bg-rose-100/70 text-rose-500'
            }`}>
              {isSecretUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
            </div>
            <span className="text-xs font-bold">Stock ลับวอร์ด 🔐</span>
          </div>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            isSecretUnlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
          }`}>
            {isSecretUnlocked ? '🔓 เปิด' : '🔒 ล็อก'}
          </span>
        </button>
      </nav>
      
      {/* Footer System Status & Quick Font Size */}
      <div className="p-3 border-t border-indigo-50/80 bg-slate-50/60">
        
        {/* Quick Text Size Switcher with Cute Icons */}
        <div className="mb-2 bg-white rounded-2xl p-2 border border-slate-150/80 shadow-2xs flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 pl-1">
            <Glasses size={13} className="text-violet-500" />
            <span>ตัวอักษร:</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all flex items-center gap-0.5 cursor-pointer ${
                fontSize === 'normal' 
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-2xs' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="ขนาดปกติ สไตล์โมเดิร์นวัยรุ่น"
            >
              <span>🐥 ปกติ</span>
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all flex items-center gap-0.5 cursor-pointer ${
                fontSize === 'large' 
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-2xs' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="ขนาดใหญ่ สบายตา เจ้าหน้าที่อ่านง่าย"
            >
              <span>👓 ใหญ่</span>
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all flex items-center gap-0.5 cursor-pointer ${
                fontSize === 'xlarge' 
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-2xs' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="ขนาดใหญ่พิเศษ ชัดเจนสุดๆ"
            >
              <span>🔍 โตสุด</span>
            </button>
          </div>
        </div>

        {/* Sync & Connection Status */}
        <div className="flex items-center justify-between text-[11px] px-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
              <span>{isOnline ? 'ออนไลน์เรียลไทม์' : 'ออฟไลน์ (เซฟในเครื่อง)'}</span>
              <Heart size={10} className="fill-pink-500 text-pink-500 animate-pulse" />
            </span>
          </div>
          {isSyncing && (
            <span className="text-[10px] text-violet-600 bg-violet-100 px-1.5 py-0.2 rounded-md font-bold animate-pulse">
              ซิงก์...
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if ((window as any).forceAppUpdate) {
              (window as any).forceAppUpdate();
            } else {
              localStorage.removeItem('app_version_cache');
              window.location.reload();
            }
          }}
          className="mt-2 w-full text-[10px] font-bold text-slate-500 hover:text-violet-600 bg-white hover:bg-violet-50 border border-slate-200/80 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <RotateCcw size={11} />
          <span>รีเฟรชเวอร์ชันล่าสุด ✨</span>
        </button>
      </div>

    </div>
  );
}
