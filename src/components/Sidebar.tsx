import React from 'react';
import { Package, ScanLine, LayoutDashboard, Settings, Layers } from 'lucide-react';
import { CATEGORIES } from '../lib/constants';
import { useInventory } from '../lib/store';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenScanner: () => void;
}

export function Sidebar({ currentView, onNavigate, onOpenScanner }: SidebarProps) {
  const { isOnline, isSyncing } = useInventory();

  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col h-full shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 text-slate-800">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
            <Package size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">SUKJAI Hub</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">WARD INVENTORY</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6">
        <button
          onClick={onOpenScanner}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 px-4 font-semibold transition-all shadow-md shadow-indigo-200 active:scale-[0.98]"
        >
          <ScanLine size={20} />
          <span>สแกนรับ-จ่าย</span>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Main</div>
        
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
            currentView === 'dashboard'
              ? 'bg-slate-100 text-slate-800'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard size={18} />
          <span>ภาพรวม (Dashboard)</span>
        </button>

        <div className="mt-8 mb-3 px-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Layers size={14} />
          <span>คลังสินค้า</span>
        </div>
        
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => onNavigate(`category_${category.id}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
              currentView === `category_${category.id}`
                ? `${category.bgColor} ${category.color} ring-1 ring-inset ${category.borderColor}`
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full bg-current opacity-80`} />
            <span>{category.name}</span>
          </button>
        ))}

        <div className="mt-8 mb-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</div>
        
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
            currentView === 'settings'
              ? 'bg-slate-100 text-slate-800'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <Settings size={18} />
          <span>ตั้งค่าระบบ</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50/75 rounded-2xl p-3.5 flex flex-col gap-1 border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">สถานะคลังระบบ</span>
            {isSyncing && (
              <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg font-bold animate-pulse">
                ซิงก์...
              </span>
            )}
          </div>
          {isOnline ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c07f] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c07f]"></span>
              </span>
              <span className="text-xs text-[#00c07f] font-black">
                ออนไลน์ (Supabase)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              <span className="text-xs text-amber-600 font-extrabold">
                ออฟไลน์ (เครื่องนี้)
              </span>
            </div>
          )}
          <span className="text-[9px] text-slate-400 leading-normal mt-0.5">
            {isOnline ? 'แชร์ข้อมูลเรียลไทม์กับทุกเครื่องแล้ว' : 'เซฟลงเครื่องนี้เท่านั้น (เปิดแชร์ออนไลน์ในคีย์ระบบ)'}
          </span>
        </div>
      </div>
    </div>
  );
}
