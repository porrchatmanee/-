import React, { useState } from 'react';
import { useInventory } from '../lib/store';
import { CATEGORIES } from '../lib/constants';
import { InventoryItem } from '../types';
import { formatThaiDate, groupInventoryItems } from '../lib/lots';
import { 
  ArrowRight, PackageOpen, AlertCircle, Search, Package, 
  Tag, Clock, Layers, CheckCircle2, AlertTriangle, X, 
  HelpCircle, Sparkles, Filter, ChevronRight, Edit, SlidersHorizontal, Target, Save,
  FileText, Printer
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { items, transactions, updateItem } = useInventory();
  
  // Search & Filter state for the All Items Stock Table
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'over' | 'out' | 'hasExpiry'>('all');
  
  // Lot inspection modal state
  const [inspectLotItem, setInspectLotItem] = useState<InventoryItem | null>(null);

  // Min-Max configuration modal state (direct from Dashboard)
  const [editMinMaxItem, setEditMinMaxItem] = useState<(InventoryItem & { groupBarcodes?: string[] }) | null>(null);
  const [editMinStock, setEditMinStock] = useState<number>(10);
  const [editMaxStock, setEditMaxStock] = useState<number>(100);

  const openDashboardMinMaxModal = (item: InventoryItem & { groupBarcodes?: string[] }) => {
    setEditMinMaxItem(item);
    setEditMinStock(item.minStock ?? 10);
    setEditMaxStock(item.maxStock ?? 100);
  };

  const handleSaveMinMax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMinMaxItem) return;
    
    const min = Number(editMinStock) || 10;
    const max = Number(editMaxStock) || 100;

    // Apply updates to ALL barcodes in this grouped product to keep them consistent
    const barcodesToUpdate = editMinMaxItem.groupBarcodes || [editMinMaxItem.id];
    
    // Process updates sequentially or in parallel
    for (const barcode of barcodesToUpdate) {
      await updateItem(barcode, {
        minStock: min,
        maxStock: max,
      });
    }
    
    setEditMinMaxItem(null);
  };

  // Summary per category
  const summary = CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.categoryId === cat.id);
    const totalQty = catItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const lowStockCount = catItems.filter(i => i.quantity > 0 && i.quantity <= (i.minStock ?? 10)).length;
    const overStockCount = catItems.filter(i => i.quantity > (i.maxStock ?? 100)).length;
    const outOfStockCount = catItems.filter(i => i.quantity === 0).length;
    return { ...cat, totalQty, lowStockCount, overStockCount, outOfStockCount, count: catItems.length };
  });

  const totalAllItems = items.length;
  const totalAllUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalLowStock = items.filter(i => i.quantity > 0 && i.quantity <= (i.minStock ?? 10)).length;
  const totalOverStock = items.filter(i => i.quantity > (i.maxStock ?? 100)).length;
  const totalOutOfStock = items.filter(i => i.quantity === 0).length;

  // 1. Group items using the centralized utility
  const groupedItems = React.useMemo(() => groupInventoryItems(items), [items]);

  // 2. Filter the grouped items list based on search and filters
  const filteredItems = groupedItems.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.groupBarcodes.some(id => id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.lots && item.lots.some(l => l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = item.quantity > 0 && item.quantity <= (item.minStock ?? 10);
    } else if (stockFilter === 'over') {
      matchesStock = item.quantity > (item.maxStock ?? 100);
    } else if (stockFilter === 'out') {
      matchesStock = item.quantity === 0;
    } else if (stockFilter === 'hasExpiry') {
      matchesStock = !!item.expiryDate;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const recentTransactions = transactions.slice(0, 5);

  const getStatusBadge = (item: InventoryItem) => {
    const min = item.minStock ?? 10;
    const max = item.maxStock ?? 100;
    if (item.quantity === 0) {
      return { label: 'สินค้าหมด (0)', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (item.quantity <= min) {
      return { label: `สต็อกต่ำ (≤${min})`, class: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (item.quantity > max) {
      return { label: `สต็อกเกิน (>${max})`, class: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
    return { label: 'พร้อมใช้ (พอดี)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-full pt-6 md:pt-8 space-y-8 md:space-y-10">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>ภาพรวมคลังสินค้าและจำนวนคงเหลือ</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            ตรวจสอบยอดคงเหลือ กำหนดเกณฑ์ Min-Max และดูวันหมดอายุของทุกล็อต
          </p>
        </div>

        {/* Global Stock Stats Badges & Reports Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={16} />
            <span>ออกรายงาน &amp; พิมพ์ A4</span>
          </button>

          <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">สินค้าทั้งหมด</span>
            <span className="text-lg font-black text-slate-800">{totalAllItems} <span className="text-xs text-slate-500 font-bold">รายการ</span></span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ยอดคงเหลือรวม</span>
            <span className="text-lg font-black text-indigo-600">{totalAllUnits.toLocaleString()} <span className="text-xs text-slate-500 font-bold">ชิ้น/หน่วย</span></span>
          </div>
          {totalLowStock > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 block uppercase">สต็อกต่ำ (≤Min)</span>
              <span className="text-lg font-black text-amber-800">{totalLowStock} <span className="text-xs text-amber-700 font-bold">รายการ</span></span>
            </div>
          )}
          {totalOverStock > 0 && (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-2 shadow-xs">
              <span className="text-[10px] font-bold text-sky-700 block uppercase">สต็อกเกิน (&gt;Max)</span>
              <span className="text-lg font-black text-sky-800">{totalOverStock} <span className="text-xs text-sky-700 font-bold">รายการ</span></span>
            </div>
          )}
          {totalOutOfStock > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2 shadow-xs">
              <span className="text-[10px] font-bold text-rose-700 block uppercase">หมดสต็อก</span>
              <span className="text-lg font-black text-rose-800">{totalOutOfStock} <span className="text-xs text-rose-700 font-bold">รายการ</span></span>
            </div>
          )}
        </div>
      </header>

      {/* ----------------- MULTI-LOT & EXPIRY GUIDE CARD ----------------- */}
      <section className="bg-gradient-to-br from-indigo-50/80 via-white to-rose-50/50 border border-indigo-100 rounded-3xl p-5 md:p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
            <SlidersHorizontal size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-extrabold text-base md:text-lg text-slate-900">
                ระบบจัดการระดับสต็อก Min - Max & วันหมดอายุหลายล็อต (Multi-Lot & FEFO)
              </h3>
              <span className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                มาตรฐานโรงพยาบาล
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              ช่วยให้คุณควบคุมปริมาณเวชภัณฑ์ไม่ให้ขาดแคลนและไม่ล้นคลัง พร้อมติดตามวันหมดอายุของแต่ละล็อตอย่างเป็นระบบ:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
              <div className="bg-white/90 border border-indigo-150/60 rounded-2xl p-3.5 space-y-1 shadow-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center text-[11px]">Min</span>
                  <span>เกณฑ์สต็อกต่ำสุด (Min Stock)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal pl-7">
                  กำหนดจุดสั่งซื้อ เมื่อสินค้าเหลือน้อยกว่าหรือเท่ากับค่า Min ระบบจะแจ้งเตือน <strong>"สต็อกต่ำ"</strong> สีส้ม เพื่อให้เตรียมสั่งซื้อเพิ่มทันเวลา
                </p>
              </div>

              <div className="bg-white/90 border border-indigo-150/60 rounded-2xl p-3.5 space-y-1 shadow-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-xs">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center text-[11px]">Max</span>
                  <span>เกณฑ์สต็อกสูงสุด (Max Stock)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal pl-7">
                  กำหนดความจุคลังสูงสุด เมื่อรับเข้าเกินค่า Max ระบบจะแจ้งเตือน <strong>"สต็อกเกิน"</strong> สีฟ้า เพื่อป้องกันการสั่งของล้นตู้และเสื่อมสภาพ
                </p>
              </div>

              <div className="bg-white/90 border border-indigo-150/60 rounded-2xl p-3.5 space-y-1 shadow-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-xs">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center text-[11px]">FEFO</span>
                  <span>วันหมดอายุหลายล็อต (FEFO)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal pl-7">
                  รับเข้าล็อตใหม่ที่มีวันหมดอายุต่างกันได้เรื่อยๆ ระบบแยกติดตามทุกล็อต และเวลาเบิกจ่ายจะตัดจาก <strong>ล็อตที่หมดอายุเร็วที่สุดให้อัตโนมัติ</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- 1. CATEGORY CARDS SUMMARY ----------------- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            <span>หมวดหมู่คลังสินค้า</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">คลิกหมวดหมู่เพื่อดูสต็อกแยกแผนก</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {summary.map(cat => (
            <div 
              key={cat.id} 
              className={`rounded-3xl p-6 border transition-all hover:shadow-lg cursor-pointer ${cat.bgColor} ${cat.borderColor} group relative overflow-hidden`}
              onClick={() => onNavigate(`category_${cat.id}`)}
            >
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className={`font-black text-xl ${cat.color}`}>{cat.name}</h3>
                  <p className="text-slate-600 text-xs font-bold mt-0.5">{cat.count} รายการในคลัง</p>
                </div>
                <div className={`p-3 rounded-2xl bg-white/70 shadow-xs ${cat.color}`}>
                  <PackageOpen size={22} />
                </div>
              </div>
              
              <div className="flex items-end justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">จำนวนคงเหลือรวม</span>
                  <div className="text-3xl font-black text-slate-800 tracking-tight">
                    {cat.totalQty.toLocaleString()}
                    <span className="text-xs font-bold text-slate-500 ml-1.5 font-normal">ชิ้น/หน่วย</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span className={`text-xs font-black ${cat.color}`}>เข้าสู่คลัง</span>
                  <ArrowRight size={15} className={cat.color} />
                </div>
              </div>

              {(cat.lowStockCount > 0 || cat.overStockCount > 0 || cat.outOfStockCount > 0) && (
                <div className="mt-4 pt-3 border-t border-white/50 flex flex-wrap items-center gap-2 text-xs font-bold">
                  {cat.lowStockCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                      <AlertCircle size={12} />
                      <span>สต็อกต่ำ (≤Min): {cat.lowStockCount}</span>
                    </span>
                  )}
                  {cat.overStockCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-lg border border-sky-200">
                      <Target size={12} />
                      <span>สต็อกเกิน (&gt;Max): {cat.overStockCount}</span>
                    </span>
                  )}
                  {cat.outOfStockCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-lg border border-rose-200">
                      <X size={12} />
                      <span>หมดสต็อก: {cat.outOfStockCount}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ----------------- 2. ALL INVENTORY STOCK & QUANTITY TABLE ----------------- */}
      <section className="bg-white border border-slate-150 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Package size={22} className="text-indigo-600" />
              <h2 className="text-xl font-black text-slate-800">
                ตารางดูจำนวนสินค้าและสต็อกคงเหลือทั้งหมด
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              ตรวจสอบจำนวนชิ้นคงเหลือ กำหนดเกณฑ์ Min-Max และดูวันหมดอายุทุกล็อต ({filteredItems.length} จาก {items.length} รายการ)
            </p>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'all' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({items.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'low' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              📉 สต็อกต่ำ ≤Min ({totalLowStock})
            </button>
            <button
              onClick={() => setStockFilter('over')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'over' 
                  ? 'bg-sky-600 text-white shadow-xs' 
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60'
              }`}
            >
              📈 สต็อกเกิน &gt;Max ({totalOverStock})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'out' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              ❌ หมดสต็อก ({totalOutOfStock})
            </button>
            <button
              onClick={() => setStockFilter('hasExpiry')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'hasExpiry' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📅 มีวันหมดอายุ ({items.filter(i => i.expiryDate).length})
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อสินค้า, รหัสบาร์โค้ด, หรือหมายเลขล็อต..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-medium transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
            >
              <option value="all">ทุกหมวดหมู่คลัง ({items.length})</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({items.filter(i => i.categoryId === cat.id).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The Product Stock Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-150 font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 pl-5">รายการสินค้า & รหัสบาร์โค้ด</th>
                <th className="py-3.5 px-3 text-center w-28 whitespace-nowrap">หมวดหมู่</th>
                <th className="py-3.5 px-3 text-center w-32 whitespace-nowrap">จำนวนคงเหลือ</th>
                <th className="py-3.5 px-3 text-center w-36 whitespace-nowrap">เกณฑ์ Min - Max</th>
                <th className="py-3.5 px-3 text-center w-36 whitespace-nowrap">วันหมดอายุ</th>
                <th className="py-3.5 px-3 text-center w-32 whitespace-nowrap">สถานะ</th>
                <th className="py-3.5 px-3 text-center w-28 pr-4 whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const status = getStatusBadge(item);
                  const cat = CATEGORIES.find(c => c.id === item.categoryId);
                  
                  // Handle grouped barcodes display
                  const displayId = item.id;
                  const hasMultipleBarcodes = (item as any).groupBarcodes?.length > 1;

                  return (
                    <tr key={(item as any).key || item.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Barcode in a unified primary column */}
                      <td className="py-4 px-4 pl-5">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors leading-snug break-words">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100/90 hover:bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-200/80 transition-colors inline-flex items-center gap-1 cursor-default max-w-full"
                              title={`รหัสสินค้า / บาร์โค้ด: ${displayId}`}
                            >
                              <span className="text-[10px] text-slate-400 font-sans">รหัส:</span>
                              <span className="truncate">{displayId}</span>
                            </span>
                            {hasMultipleBarcodes && (
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                +{(item as any).groupBarcodes.length - 1} รหัสอื่นในกลุ่ม
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap ${cat?.bgColor || 'bg-slate-100'} ${cat?.color || 'text-slate-600'} border ${cat?.borderColor || 'border-slate-200'}`}>
                          {cat?.name || item.categoryId}
                        </span>
                      </td>

                      {/* Stock Quantity - High Visibility */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-baseline justify-center gap-1 px-3 py-1 rounded-xl font-mono whitespace-nowrap ${
                          item.quantity === 0 ? 'bg-rose-50 border border-rose-200 text-rose-700 font-black' :
                          item.quantity <= (item.minStock ?? 10) ? 'bg-amber-50 border border-amber-200 text-amber-800 font-black' :
                          item.quantity > (item.maxStock ?? 100) ? 'bg-sky-50 border border-sky-200 text-sky-800 font-black' :
                          'bg-slate-100/90 text-slate-900 font-bold'
                        }`}>
                          <span className="text-base font-black">{item.quantity}</span>
                          <span className="text-xs font-bold text-slate-500 font-sans">{item.unit}</span>
                        </span>
                      </td>

                      {/* Min - Max Column with Click-to-Edit Badge */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDashboardMinMaxModal(item)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100/80 hover:bg-indigo-50 px-2.5 py-1 rounded-xl border border-slate-200/80 transition-all cursor-pointer whitespace-nowrap group"
                          title="คลิกเพื่อแก้ไขเกณฑ์ Min - Max ของสินค้านี้"
                        >
                          <span className="text-amber-700 font-mono font-bold">Min: {item.minStock ?? 10}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-sky-700 font-mono font-bold">Max: {item.maxStock ?? 100}</span>
                          <Edit size={11} className="text-slate-400 group-hover:text-indigo-600 ml-0.5" />
                        </button>
                      </td>

                      {/* Expiry Date & Lots Details */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1 whitespace-nowrap">
                          {item.expiryDate ? (
                            <span className="font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 inline-block whitespace-nowrap">
                              {formatThaiDate(item.expiryDate)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}

                          {/* Always allow viewing lot details if lots exist */}
                          {item.lots && item.lots.length >= 1 && (
                            <button
                              type="button"
                              onClick={() => setInspectLotItem(item)}
                              className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200 cursor-pointer inline-flex items-center justify-center gap-1 transition-all whitespace-nowrap"
                              title="คลิกเพื่อดูล็อตย่อยและวันหมดอายุแต่ละล็อต"
                            >
                              <Tag size={10} className="shrink-0" />
                              <span className="whitespace-nowrap">{item.lots.length} ล็อต (คลิกดู)</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-2xs border ${status.class}`}>
                          {status.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-3 text-center pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openDashboardMinMaxModal(item)}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="ตั้งค่า Min-Max"
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate(`category_${item.categoryId}`)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-0.5"
                            title="ไปคลังแผนก"
                          >
                            <span>คลัง</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-sm">
                    ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ----------------- 3. RECENT TRANSACTIONS ----------------- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">ความเคลื่อนไหวล่าสุด</h2>
        </div>
        <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-xs">
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {recentTransactions.map(tx => {
                const item = items.find(i => i.id === tx.itemId);
                return (
                  <div key={tx.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base ${
                        tx.type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {tx.type === 'RECEIVE' ? '+' : '-'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-base truncate" title={item?.name || `Unknown (${tx.itemId})`}>
                          {item?.name || `Unknown (${tx.itemId})`}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-slate-600">{tx.type === 'RECEIVE' ? 'รับเข้าคลัง' : 'เบิกจ่ายออก'}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          {tx.lotNumber && (
                            <>
                              <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">{tx.lotNumber}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            </>
                          )}
                          <span>{new Date(tx.timestamp).toLocaleString('th-TH', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className={`text-lg font-black ${tx.type === 'RECEIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'RECEIVE' ? '+' : '-'}{tx.quantity} {item?.unit || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p>ยังไม่มีความเคลื่อนไหวใดๆ</p>
            </div>
          )}
        </div>
      </section>

      {/* ----------------- MODAL: QUICK MIN-MAX CONFIGURATION (FROM DASHBOARD) ----------------- */}
      {editMinMaxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-850">กำหนดเกณฑ์ Min - Max</h3>
                  <div className="flex flex-col">
                    <p className="text-xs text-slate-400 font-bold">{editMinMaxItem.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      รหัส: {editMinMaxItem.id}
                      {editMinMaxItem.groupBarcodes && editMinMaxItem.groupBarcodes.length > 1 && (
                        <span className="text-indigo-400 ml-1">(รวม {editMinMaxItem.groupBarcodes.length} รหัสในกลุ่มนี้)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setEditMinMaxItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMinMax} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">คงเหลือปัจจุบัน</span>
                  <span className="text-xl font-black text-slate-900">{editMinMaxItem.quantity} {editMinMaxItem.unit}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">สถานะ</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${getStatusBadge(editMinMaxItem).class}`}>
                    {getStatusBadge(editMinMaxItem).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-800 block">
                    📉 เกณฑ์ต่ำสุด (Min Stock)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-300 px-3 py-2 rounded-xl text-center text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <span className="text-[10px] text-slate-500 block">เตือนสต็อกต่ำเมื่อ ≤ ค่านี้</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-sky-800 block">
                    📈 เกณฑ์สูงสุด (Max Stock)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMaxStock}
                    onChange={(e) => setEditMaxStock(parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-sky-300 px-3 py-2 rounded-xl text-center text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <span className="text-[10px] text-slate-500 block">เตือนสต็อกเกินเมื่อ &gt; ค่านี้</span>
                </div>
              </div>

              {/* Visual Stock Meter Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">ผลการประเมิน:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    editMinMaxItem.quantity === 0 ? 'bg-rose-100 text-rose-700' :
                    editMinMaxItem.quantity <= editMinStock ? 'bg-amber-100 text-amber-800' :
                    editMinMaxItem.quantity > editMaxStock ? 'bg-sky-100 text-sky-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {editMinMaxItem.quantity === 0 ? '❌ สินค้าหมด (0)' :
                     editMinMaxItem.quantity <= editMinStock ? `⚠️ สต็อกต่ำ (≤${editMinStock})` :
                     editMinMaxItem.quantity > editMaxStock ? `📦 สต็อกเกิน (>${editMaxStock})` :
                     '✅ สต็อกพร้อมใช้ (พอดี)'}
                  </span>
                </div>

                <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-amber-400" 
                    style={{ width: `${Math.min(100, (editMinStock / Math.max(1, editMaxStock * 1.2)) * 100)}%` }} 
                  />
                  <div className="h-full bg-emerald-400 flex-1" />
                  <div className="h-full bg-sky-400 w-6" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>0</span>
                  <span className="text-amber-700 font-bold">Min ({editMinStock})</span>
                  <span className="text-sky-700 font-bold">Max ({editMaxStock})</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditMinMaxItem(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 flex justify-center items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Save size={16} />
                  <span>บันทึกเกณฑ์</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: INSPECT LOT DETAILS (FROM DASHBOARD) ----------------- */}
      {inspectLotItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-850">{inspectLotItem.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">รหัสสินค้า: {inspectLotItem.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectLotItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-rose-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">ยอดคงเหลือรวมทุกล็อต</span>
                  <span className="text-2xl font-black text-slate-900">{inspectLotItem.quantity} {inspectLotItem.unit}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-bold block">วันหมดอายุเร็วสุด (FEFO)</span>
                  <span className="text-sm font-black text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-rose-200 inline-block mt-0.5">
                    {formatThaiDate(inspectLotItem.expiryDate || '')}
                  </span>
                </div>
              </div>

              {/* Lots List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    รายการล็อตทั้งหมด ({inspectLotItem.lots?.length || 1} ล็อต)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">เรียงตามหมดอายุก่อน (FEFO)</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {inspectLotItem.lots && inspectLotItem.lots.length > 0 ? (
                    inspectLotItem.lots.map((lot, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div 
                          key={`${lot.lotNumber}_${lot.expiryDate}_${idx}`}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isFirst 
                              ? 'bg-rose-50/40 border-rose-200/80' 
                              : 'bg-white border-slate-200/80'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                {lot.lotNumber}
                              </span>
                              {isFirst && (
                                <span className="text-[10px] font-black text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-full">
                                  🔴 หมดอายุก่อน (ใช้ก่อน)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span>วันหมดอายุ:</span>
                              <strong className="text-slate-800">{formatThaiDate(lot.expiryDate)}</strong>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-black text-slate-900 block">
                              {lot.quantity} {inspectLotItem.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 font-medium">
                      มี 1 ล็อต: {inspectLotItem.quantity} {inspectLotItem.unit} (หมดอายุ: {formatThaiDate(inspectLotItem.expiryDate || '')})
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Go to category view */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const catId = inspectLotItem.categoryId;
                    setInspectLotItem(null);
                    onNavigate(`category_${catId}`);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>ไปจัดการสินค้านี้ในคลังแผนก →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
