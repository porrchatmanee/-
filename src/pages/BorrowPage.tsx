import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  Building2, 
  Phone, 
  FileText, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Printer, 
  X, 
  Check, 
  Package,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  MapPin
} from 'lucide-react';
import { useInventory } from '../lib/store';
import { BorrowRecord, InventoryItem } from '../types';
import { DEFAULT_BORROW_DEPARTMENTS, ALL_STANDARD_UNITS, CATEGORIES } from '../lib/constants';

interface BorrowPageProps {
  onNavigate?: (view: string, itemData?: any) => void;
  initialItem?: any;
  onClearInitialItem?: () => void;
}

export function BorrowPage({ onNavigate, initialItem, onClearInitialItem }: BorrowPageProps) {
  const { 
    borrowRecords, 
    addBorrowRecord, 
    returnBorrowRecord, 
    deleteBorrowRecord, 
    updateBorrowRecord, 
    items 
  } = useInventory();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BORROWED' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BorrowRecord | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Item selector source inside Add Modal: INVENTORY vs CUSTOM
  const [borrowSourceType, setBorrowSourceType] = useState<'INVENTORY' | 'CUSTOM'>('INVENTORY');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCatFilter, setInventoryCatFilter] = useState('ALL');

  // New Borrow Form State
  const [newItemName, setNewItemName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState('เครื่อง');
  const [newBorrowerName, setNewBorrowerName] = useState('');
  const [newBorrowerDept, setNewBorrowerDept] = useState('ICU (ไอซียู)');
  const [newCustomDept, setNewCustomDept] = useState('');
  const [newBorrowerPhone, setNewBorrowerPhone] = useState('');
  const [newBorrowDate, setNewBorrowDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [newExpectedReturnDate, setNewExpectedReturnDate] = useState(() => {
    const next = new Date(Date.now() + 86400000 * 2); // 2 days default
    return next.toISOString().split('T')[0];
  });
  const [newNotes, setNewNotes] = useState('');
  const [newDeductFromStock, setNewDeductFromStock] = useState(false);

  // Return Form State
  const [returnReceiver, setReturnReceiver] = useState('พยาบาลหัวหน้าเวร');
  const [returnCondition, setReturnCondition] = useState<'NORMAL' | 'DAMAGED' | 'LOST'>('NORMAL');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 16));

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to determine real-time status
  const getRecordStatus = (record: BorrowRecord): 'BORROWED' | 'OVERDUE' | 'RETURNED' => {
    if (record.status === 'RETURNED') return 'RETURNED';
    if (record.expectedReturnDate && record.expectedReturnDate < todayStr) {
      return 'OVERDUE';
    }
    return 'BORROWED';
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return borrowRecords.filter(rec => {
      const realStatus = getRecordStatus(rec);
      if (statusFilter !== 'ALL' && realStatus !== statusFilter) return false;
      if (deptFilter !== 'ALL' && rec.borrowerDepartment !== deptFilter) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        rec.itemName.toLowerCase().includes(term) ||
        rec.borrowerName.toLowerCase().includes(term) ||
        rec.borrowerDepartment.toLowerCase().includes(term) ||
        (rec.borrowerPhone && rec.borrowerPhone.includes(term)) ||
        rec.id.toLowerCase().includes(term) ||
        (rec.notes && rec.notes.toLowerCase().includes(term))
      );
    });
  }, [borrowRecords, statusFilter, deptFilter, searchTerm, todayStr]);

  // Statistics
  const stats = useMemo(() => {
    let borrowed = 0;
    let overdue = 0;
    let returned = 0;

    borrowRecords.forEach(rec => {
      const s = getRecordStatus(rec);
      if (s === 'BORROWED') borrowed++;
      else if (s === 'OVERDUE') overdue++;
      else if (s === 'RETURNED') returned++;
    });

    return {
      total: borrowRecords.length,
      borrowed,
      overdue,
      returned
    };
  }, [borrowRecords, todayStr]);

  // Listen to initialItem (when clicking "ยืมของ" from Dashboard or CategoryView)
  useEffect(() => {
    if (initialItem) {
      handleSelectItem(initialItem);
      setIsAddModalOpen(true);
      setBorrowSourceType('INVENTORY');
      onClearInitialItem?.();
    }
  }, [initialItem]);

  // Selected item object from store
  const selectedInventoryItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find(i => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Filtered Inventory Items for borrowing (ALL items in inventory)
  const selectableInventoryItems = useMemo(() => {
    return items.filter(item => {
      if (inventoryCatFilter !== 'ALL' && item.categoryId !== inventoryCatFilter) return false;
      if (!inventorySearch.trim()) return true;
      const q = inventorySearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q))
      );
    });
  }, [items, inventoryCatFilter, inventorySearch]);

  // Handle Select Item from Main Inventory
  const handleSelectItem = (item: any) => {
    setSelectedItemId(item.id);
    setNewItemName(item.name);
    setNewUnit(item.unit || 'ชิ้น');
  };

  // Clear selected item
  const handleClearSelectedItem = () => {
    setSelectedItemId('');
    setNewItemName('');
    setNewUnit('ชิ้น');
    setNewDeductFromStock(false);
  };

  // Handle Submit New Borrow
  const handleSubmitBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newBorrowerName.trim()) {
      alert('กรุณากรอกชื่ออุปกรณ์ที่ยืม และชื่อผู้ยืมให้ครบถ้วน');
      return;
    }

    const effectiveDept = newBorrowerDept === 'OTHER' ? newCustomDept.trim() || 'แผนกทั่วไป' : newBorrowerDept;

    await addBorrowRecord({
      itemId: selectedItemId || undefined,
      itemName: newItemName.trim(),
      quantity: Number(newQuantity) || 1,
      unit: newUnit.trim() || 'ชิ้น',
      borrowerName: newBorrowerName.trim(),
      borrowerDepartment: effectiveDept,
      borrowerPhone: newBorrowerPhone.trim() || undefined,
      borrowDate: newBorrowDate,
      expectedReturnDate: newExpectedReturnDate,
      notes: newNotes.trim() || undefined,
      deductFromStock: newDeductFromStock,
    });

    setIsAddModalOpen(false);
    // Reset Form
    setNewItemName('');
    setSelectedItemId('');
    setNewQuantity(1);
    setNewBorrowerName('');
    setNewBorrowerPhone('');
    setNewNotes('');
    setNewDeductFromStock(false);
  };

  // Handle Submit Return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    await returnBorrowRecord(selectedRecord.id, {
      actualReturnDate: returnDate,
      returnCondition,
      returnReceiver: returnReceiver.trim() || 'เจ้าหน้าที่',
      notes: returnNotes.trim() || undefined,
    });

    setIsReturnModalOpen(false);
    setSelectedRecord(null);
  };

  // Print Handlers
  const handlePrintSlip = (record: BorrowRecord) => {
    setSelectedRecord(record);
    setIsSlipModalOpen(true);
  };

  const executePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-full space-y-6">
      
      {/* ========================================================================= */}
      {/* SCREEN VIEW (Hidden when printing)                                       */}
      {/* ========================================================================= */}
      <div className="print:hidden space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-pink-500/10 p-6 rounded-3xl border border-violet-100/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-200">
              <ArrowLeftRight size={22} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-indigo-700 border border-indigo-200/60 shadow-2xs mb-2">
                <Sparkles size={13} className="text-pink-500" />
                <span>Hospital Loan &amp; Borrowing Register 🌸</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                ระบบยืม-คืนของและเครื่องมือวอร์ด 🤝
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                บันทึกประวัติการยืมเครื่องมือแพทย์ เวชภัณฑ์ และอุปกรณ์ต่างแผนก ติดตามกำหนดส่งคืน และออกใบยืม-คืน 💖
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-indigo-200 active:scale-95 cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>บันทึกการยืมของใหม่ ➕</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Badges with Cute Dual-Layer Icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div 
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 rounded-3xl border transition-all cursor-pointer ${
              statusFilter === 'ALL' 
                ? 'bg-gradient-to-br from-indigo-50 to-violet-50/60 border-indigo-200 shadow-xs' 
                : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">บันทึกทั้งหมด</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm shadow-2xs">
                📑
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">รายการประวัติยืมทั้งหมด ✨</p>
          </div>

          <div 
            onClick={() => setStatusFilter('BORROWED')}
            className={`p-4 rounded-3xl border transition-all cursor-pointer ${
              statusFilter === 'BORROWED' 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200 shadow-xs' 
                : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase">กำลังยืม (ยังไม่คืน)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm shadow-2xs">
                ⏳
              </div>
            </div>
            <p className="text-2xl font-black text-amber-700 mt-2">{stats.borrowed}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">อยู่ในความดูแลของผู้ยืม 📦</p>
          </div>

          <div 
            onClick={() => setStatusFilter('OVERDUE')}
            className={`p-4 rounded-3xl border transition-all cursor-pointer ${
              statusFilter === 'OVERDUE' 
                ? 'bg-gradient-to-br from-rose-50 to-pink-50/60 border-rose-200 shadow-xs' 
                : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase">เกินกำหนดคืน</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm shadow-2xs animate-bounce">
                🚨
              </div>
            </div>
            <p className="text-2xl font-black text-rose-700 mt-2">{stats.overdue}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">ต้องติดต่อทวงถามด่วน ⚠️</p>
          </div>

          <div 
            onClick={() => setStatusFilter('RETURNED')}
            className={`p-4 rounded-3xl border transition-all cursor-pointer ${
              statusFilter === 'RETURNED' 
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50/60 border-emerald-200 shadow-xs' 
                : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase">คืนแล้วเสร็จ</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-2xs">
                ✅
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-2">{stats.returned}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">ส่งคืนคลังเรียบร้อย 💖</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่ออุปกรณ์, ชื่อผู้ยืม, แผนก, รหัสใบยืม, หรือเบอร์โทร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ทั้งหมด ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('BORROWED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'BORROWED' ? 'bg-amber-50 text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                กำลังยืม ({stats.borrowed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OVERDUE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'OVERDUE' ? 'bg-rose-50 text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                เกินกำหนด ({stats.overdue})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RETURNED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'RETURNED' ? 'bg-emerald-50 text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                คืนแล้ว ({stats.returned})
              </button>
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">ทุกแผนก / วอร์ด</option>
              {DEFAULT_BORROW_DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/60">
                  <th className="py-4 px-5 pl-6 w-36 whitespace-nowrap">รหัส / วันที่ยืม</th>
                  <th className="py-4 px-4 min-w-[240px]">อุปกรณ์ & จำนวนที่ยืม</th>
                  <th className="py-4 px-4 min-w-[200px]">ผู้ยืม & แผนก / เบอร์โทร</th>
                  <th className="py-4 px-4 text-center w-36 whitespace-nowrap">กำหนดคืน</th>
                  <th className="py-4 px-4 text-center w-32 whitespace-nowrap">สถานะ</th>
                  <th className="py-4 px-4 text-center w-48 pr-6 whitespace-nowrap">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(rec => {
                    const status = getRecordStatus(rec);
                    const isOver = status === 'OVERDUE';
                    const isRet = status === 'RETURNED';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                        
                        {/* ID & Borrow Date */}
                        <td className="py-4 px-5 pl-6 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 inline-block w-fit">
                              {rec.id}
                            </span>
                            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {rec.borrowDate.replace('T', ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Item Name & Quantity */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-slate-800 text-sm leading-snug break-words">
                              {rec.itemName}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-mono font-black text-indigo-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {rec.quantity} {rec.unit}
                              </span>
                              {rec.deductFromStock && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                  ตัดคลังหลักชั่วคราว
                                </span>
                              )}
                              {rec.notes && (
                                <span className="text-[11px] text-slate-500 italic truncate max-w-xs" title={rec.notes}>
                                  หมายเหตุ: {rec.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Borrower & Department */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              <User size={13} className="text-slate-400 shrink-0" />
                              <span>{rec.borrowerName}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-[11px] text-slate-700">
                                <Building2 size={11} className="text-slate-400" />
                                {rec.borrowerDepartment}
                              </span>
                              {rec.borrowerPhone && (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                                  <Phone size={11} className="text-slate-400" />
                                  {rec.borrowerPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Expected Return Date & Realtime Tag */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`font-mono text-xs font-bold ${
                              isOver ? 'text-rose-600 font-black' : isRet ? 'text-slate-500' : 'text-slate-800'
                            }`}>
                              {rec.expectedReturnDate}
                            </span>
                            {isRet ? (
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                คืนเมื่อ {rec.actualReturnDate ? rec.actualReturnDate.slice(0, 10) : '-'}
                              </span>
                            ) : isOver ? (
                              <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                                เกินกำหนดส่งคืน!
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                รอส่งคืน
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {isRet ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 size={12} />
                              คืนแล้ว
                            </span>
                          ) : isOver ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                              <AlertTriangle size={12} />
                              เกินกำหนด
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                              <Clock size={12} />
                              กำลังยืม
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center pr-6 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isRet ? (
                              <button
                                onClick={() => {
                                  setSelectedRecord(rec);
                                  setIsReturnModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                title="กดรับคืนอุปกรณ์"
                              >
                                <Check size={14} />
                                <span>รับคืน</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-xl">
                                คืนแล้ว ({rec.returnCondition === 'NORMAL' ? 'สภาพปกติ' : rec.returnCondition === 'DAMAGED' ? 'ชำรุด' : 'สูญหาย'})
                              </span>
                            )}

                            <button
                              onClick={() => handlePrintSlip(rec)}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 flex items-center justify-center border border-slate-200/80 transition-all active:scale-95 cursor-pointer"
                              title="พิมพ์ใบยืม-คืนของ"
                            >
                              <Printer size={14} />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบประวัติการยืมรหัส ${rec.id}?`)) {
                                  deleteBorrowRecord(rec.id);
                                }
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center border border-slate-200/80 transition-all active:scale-95 cursor-pointer"
                              title="ลบประวัติ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ArrowLeftRight size={32} className="text-slate-300" />
                        <span className="text-sm font-bold text-slate-500">ไม่พบรายการยืม-คืนตามเงื่อนไขที่ค้นหา</span>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          ➕ คลิกที่นี่เพื่อบันทึกการยืมของใหม่
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW BORROW RECORD                                             */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 leading-tight">บันทึกการยืมของ / เครื่องมือ</h3>
                  <p className="text-xs text-slate-400">กรอกข้อมูลผู้ยืม แผนก และกำหนดวันส่งคืนอุปกรณ์</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitBorrow} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* ----------------- INVENTORY ITEM SELECTION MODE ----------------- */}
              <div className="space-y-3">
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBorrowSourceType('INVENTORY');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      borrowSourceType === 'INVENTORY'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Package size={14} />
                    <span>เลือกจากคลังสินค้าทั้งหมดที่มี ({items.length} รายการ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBorrowSourceType('CUSTOM');
                      handleClearSelectedItem();
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      borrowSourceType === 'CUSTOM'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Edit3 size={14} />
                    <span>ระบุอุปกรณ์ภายนอก / พิมพ์เอง</span>
                  </button>
                </div>

                {borrowSourceType === 'INVENTORY' && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-150/80 space-y-3">
                    
                    {/* Selected Item Preview Box */}
                    {selectedInventoryItem ? (
                      <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-500 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                            <Check size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                                รายการที่เลือกจากคลัง
                              </span>
                              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                รหัส: {selectedInventoryItem.id}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm md:text-base text-slate-800 mt-0.5">
                              {selectedInventoryItem.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="font-bold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md">
                                คงเหลือในคลัง: {selectedInventoryItem.quantity} {selectedInventoryItem.unit}
                              </span>
                              {selectedInventoryItem.location && (
                                <span className="text-slate-500 flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400" />
                                  <span>{selectedInventoryItem.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleClearSelectedItem}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shrink-0"
                        >
                          เปลี่ยน / เลือกชิ้นอื่น
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                            <Package size={15} className="text-indigo-600" />
                            <span>ค้นหาและเลือกของในคลังที่ต้องการยืม (มีทั้งหมด {items.length} รายการ):</span>
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">คลิกเพื่อเลือกรายการ</span>
                        </div>

                        {/* Search & Category Filter for Inventory Items */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2 relative">
                            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="ค้นหาชื่ออุปกรณ์, รหัสบาร์โค้ด, จุดจัดเก็บ..."
                              value={inventorySearch}
                              onChange={(e) => setInventorySearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {inventorySearch && (
                              <button
                                type="button"
                                onClick={() => setInventorySearch('')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          <select
                            value={inventoryCatFilter}
                            onChange={(e) => setInventoryCatFilter(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="ALL">ทุกหมวดหมู่ ({items.length})</option>
                            {CATEGORIES.map(c => {
                              const count = items.filter(i => i.categoryId === c.id).length;
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({count})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Scrollable Inventory Items List */}
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-indigo-100 rounded-xl p-1 bg-white/70">
                          {selectableInventoryItems.length > 0 ? (
                            selectableInventoryItems.map(item => {
                              const isSelected = selectedItemId === item.id;
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleSelectItem(item)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-white hover:bg-indigo-50/70 border-slate-100 hover:border-indigo-200 text-slate-800'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-black text-xs md:text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                        {item.name}
                                      </span>
                                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                        {item.id}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                      <span className={`${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        หมวด: {item.categoryId}
                                      </span>
                                      {item.location && (
                                        <span className={`${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                          • ที่เก็บ: {item.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
                                      isSelected
                                        ? 'bg-white text-indigo-800'
                                        : item.quantity === 0
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      คงเหลือ: {item.quantity} {item.unit}
                                    </span>
                                    <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                                      isSelected
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}>
                                      {isSelected ? '✓ เลือกแล้ว' : 'เลือก'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center text-xs text-slate-400">
                              ไม่พบรายการสินค้าที่ตรงกับคำค้นหา
                              <button
                                type="button"
                                onClick={() => setBorrowSourceType('CUSTOM')}
                                className="block mx-auto mt-2 text-indigo-600 font-bold underline cursor-pointer"
                              >
                                คลิกที่นี่เพื่อพิมพ์ระบุชื่ออุปกรณ์เอง
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Item Name */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ชื่ออุปกรณ์ / รายการของที่ยืม *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เครื่อง Infusion Pump, เครื่องวัดความดัน, ชุด Dressing"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">จำนวนที่ยืม *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">หน่วยนับ</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="เครื่อง, ชุด, ตัว, ชิ้น"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Borrower Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ชื่อผู้ยืม (พยาบาล / แพทย์ / เจ้าหน้าที่) *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="เช่น พว.สุกัญญา, นพ.ธีรเดช"
                      value={newBorrowerName}
                      onChange={(e) => setNewBorrowerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Borrower Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">แผนก / วอร์ดที่ยืม *</label>
                  <select
                    value={newBorrowerDept}
                    onChange={(e) => setNewBorrowerDept(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {DEFAULT_BORROW_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="OTHER">-- ระบุแผนกอื่น ๆ --</option>
                  </select>
                  {newBorrowerDept === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="พิมพ์ระบุชื่อแผนกที่ยืม..."
                      value={newCustomDept}
                      onChange={(e) => setNewCustomDept(e.target.value)}
                      className="w-full mt-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  )}
                </div>

                {/* Borrower Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">เบอร์โทรศัพท์ภายใน / เบอร์มือถือ</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="เช่น 5102, 081-xxx-xxxx"
                      value={newBorrowerPhone}
                      onChange={(e) => setNewBorrowerPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Expected Return Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">กำหนดส่งคืน (วันส่งคืน) *</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={newExpectedReturnDate}
                      onChange={(e) => setNewExpectedReturnDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 86400000);
                        setNewExpectedReturnDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer"
                    >
                      พรุ่งนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 86400000 * 3);
                        setNewExpectedReturnDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer"
                    >
                      3 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 86400000 * 7);
                        setNewExpectedReturnDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer"
                    >
                      1 สัปดาห์
                    </button>
                  </div>
                </div>

                {/* Deduct Stock Option */}
                {selectedItemId && (
                  <div className="md:col-span-2 p-3 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="deductStock"
                      checked={newDeductFromStock}
                      onChange={(e) => setNewDeductFromStock(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="deductStock" className="text-xs text-amber-900 font-bold cursor-pointer">
                      หักยอดจากคลังหลักชั่วคราว (ระบบจะบันทึกเป็นรายการเบิกจ่ายออก และจะรับคืนเข้าคลังให้อัตโนมัติเมื่อกดรับคืน)
                    </label>
                  </div>
                )}

                {/* Notes / Purpose */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">วัตถุประสงค์ / หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ใช้กับเคสผู้ป่วยวิกฤตเตียง 4, อุปกรณ์ของวอร์ด 2 เสียส่งซ่อม"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>บันทึกข้อมูลการยืม</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RETURN BORROWED ITEM                                              */}
      {/* ========================================================================= */}
      {isReturnModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-2 text-emerald-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 leading-tight">บันทึกรับคืนของ / อุปกรณ์</h3>
                  <p className="text-xs text-slate-500">รหัสใบยืม: {selectedRecord.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4">
              
              {/* Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400 font-bold">รายการอุปกรณ์:</span>
                  <span className="text-sm font-black text-slate-800 text-right">{selectedRecord.itemName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">จำนวน:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedRecord.quantity} {selectedRecord.unit}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">ผู้ยืม / แผนก:</span>
                  <span className="font-bold text-slate-700">{selectedRecord.borrowerName} ({selectedRecord.borrowerDepartment})</span>
                </div>
              </div>

              {/* Condition on Return */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">สภาพอุปกรณ์ตอนรับคืน *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnCondition('NORMAL')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      returnCondition === 'NORMAL' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✅ สมบูรณ์ปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnCondition('DAMAGED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      returnCondition === 'DAMAGED' 
                        ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚠️ ชำรุด/มีปัญหา
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnCondition('LOST')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      returnCondition === 'LOST' 
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ❌ สูญหาย
                  </button>
                </div>
              </div>

              {/* Receiver Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ชื่อผู้รับคืน (เจ้าหน้าที่ผู้ตรวจรับ) *</label>
                <input
                  type="text"
                  required
                  value={returnReceiver}
                  onChange={(e) => setReturnReceiver(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">หมายเหตุตอนรับคืน</label>
                <input
                  type="text"
                  placeholder="เช่น ตรวจสอบสายไฟและอุปกรณ์ครบถ้วนพร้อมใช้งานต่อ"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>ยืนยันรับคืนอุปกรณ์</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT SLIP PREVIEW                                                */}
      {/* ========================================================================= */}
      {isSlipModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Printer size={18} />
                <span>ตัวอย่างใบยืม-คืนของ (Loan Slip)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                >
                  <Printer size={14} />
                  <span>สั่งพิมพ์ทันที</span>
                </button>
                <button
                  onClick={() => setIsSlipModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-300 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
              {/* Slip Document */}
              <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 w-full max-w-lg text-slate-800 space-y-6">
                
                {/* Header */}
                <div className="text-center border-b pb-4 border-slate-200">
                  <h2 className="font-extrabold text-xl tracking-tight text-slate-900">ใบยืม - คืนเครื่องมือและเวชภัณฑ์</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">SUKJAI Hub • WARD INVENTORY MANAGEMENT</p>
                  <div className="mt-2 inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-700">
                    เลขที่เอกสาร: {selectedRecord.id}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">วันเวลาที่ยืม:</span>
                    <span className="font-semibold text-slate-800">{selectedRecord.borrowDate.replace('T', ' ')} น.</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">กำหนดส่งคืน:</span>
                    <span className="font-bold text-rose-600">{selectedRecord.expectedReturnDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">รายการอุปกรณ์:</span>
                    <span className="font-black text-slate-900 text-sm">{selectedRecord.itemName}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">จำนวนที่ยืม:</span>
                    <span className="font-black text-indigo-700 text-sm">{selectedRecord.quantity} {selectedRecord.unit}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">ผู้ยืม:</span>
                    <span className="font-bold text-slate-800">{selectedRecord.borrowerName}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">แผนก / วอร์ด:</span>
                    <span className="font-bold text-slate-800">{selectedRecord.borrowerDepartment}</span>
                  </div>
                  {selectedRecord.borrowerPhone && (
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="font-bold text-slate-500">เบอร์โทรศัพท์:</span>
                      <span className="font-mono text-slate-800">{selectedRecord.borrowerPhone}</span>
                    </div>
                  )}
                  {selectedRecord.notes && (
                    <div className="border-b border-dashed border-slate-200 pb-2">
                      <span className="font-bold text-slate-500 block">วัตถุประสงค์ / หมายเหตุ:</span>
                      <span className="text-slate-700 italic">{selectedRecord.notes}</span>
                    </div>
                  )}
                  {selectedRecord.status === 'RETURNED' && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                      <div className="flex justify-between font-bold text-emerald-800">
                        <span>สถานะ: คืนเรียบร้อยแล้ว</span>
                        <span>{selectedRecord.actualReturnDate?.slice(0, 10)}</span>
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        ผู้ตรวจรับคืน: {selectedRecord.returnReceiver || '-'} (สภาพ: {selectedRecord.returnCondition === 'NORMAL' ? 'สมบูรณ์' : selectedRecord.returnCondition === 'DAMAGED' ? 'ชำรุด' : 'สูญหาย'})
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature Lines */}
                <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="h-12 border-b border-slate-400"></div>
                    <p className="mt-2 font-bold text-slate-700">({selectedRecord.borrowerName})</p>
                    <p className="text-[10px] text-slate-400">ลงชื่อผู้ยืมอุปกรณ์</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-slate-400"></div>
                    <p className="mt-2 font-bold text-slate-700">(...................................................)</p>
                    <p className="text-[10px] text-slate-400">ลงชื่อเจ้าหน้าที่ผู้จ่ายของ</p>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 border-t pt-3">
                  พิมพ์จากระบบ SUKJAI Hub เมื่อ {new Date().toLocaleString('th-TH')}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT-ONLY VIEW (A4 Paper Print)                                         */}
      {/* ========================================================================= */}
      <div className="hidden print:block font-sans text-black p-4">
        <div className="text-center pb-4 border-b-2 border-black mb-6">
          <h1 className="text-2xl font-black">ทะเบียนและรายงานการยืม-คืนอุปกรณ์คลังวอร์ด</h1>
          <p className="text-xs font-bold text-gray-600 mt-1">SUKJAI HUB • HOSPITAL INVENTORY LOAN REGISTER</p>
          <p className="text-xs text-gray-500 mt-1">พิมพ์ข้อมูล ณ วันที่ {new Date().toLocaleString('th-TH')}</p>
        </div>

        <table className="w-full text-left border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-black font-bold">
              <th className="p-2 border-r border-black">รหัสใบยืม</th>
              <th className="p-2 border-r border-black">วันที่ยืม</th>
              <th className="p-2 border-r border-black">รายการที่ยืม</th>
              <th className="p-2 border-r border-black text-center">จำนวน</th>
              <th className="p-2 border-r border-black">ผู้ยืม & แผนก</th>
              <th className="p-2 border-r border-black text-center">กำหนดคืน</th>
              <th className="p-2 border-r border-black text-center">สถานะ</th>
              <th className="p-2 text-center">วันที่คืนจริง / ผู้รับคืน</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map(rec => (
              <tr key={rec.id} className="border-b border-black">
                <td className="p-2 border-r border-black font-mono font-bold">{rec.id}</td>
                <td className="p-2 border-r border-black">{rec.borrowDate.slice(0, 10)}</td>
                <td className="p-2 border-r border-black font-bold">{rec.itemName}</td>
                <td className="p-2 border-r border-black text-center">{rec.quantity} {rec.unit}</td>
                <td className="p-2 border-r border-black">{rec.borrowerName} ({rec.borrowerDepartment})</td>
                <td className="p-2 border-r border-black text-center font-bold">{rec.expectedReturnDate}</td>
                <td className="p-2 border-r border-black text-center font-bold">
                  {rec.status === 'RETURNED' ? 'คืนแล้ว' : rec.expectedReturnDate < todayStr ? 'เกินกำหนด' : 'กำลังยืม'}
                </td>
                <td className="p-2 text-center">
                  {rec.actualReturnDate ? `${rec.actualReturnDate.slice(0, 10)} (${rec.returnReceiver || 'เจ้าหน้าที่'})` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="h-14 border-b border-black"></div>
            <p className="mt-2 font-bold">ลงชื่อ.......................................................</p>
            <p className="text-[10px] text-gray-500">พยาบาลหัวหน้าเวร / ผู้ดูแลคลัง</p>
          </div>
          <div>
            <div className="h-14 border-b border-black"></div>
            <p className="mt-2 font-bold">ลงชื่อ.......................................................</p>
            <p className="text-[10px] text-gray-500">หัวหน้าหอผู้ป่วย / ผู้มีอำนาจอนุมัติ</p>
          </div>
        </div>
      </div>

    </div>
  );
}
