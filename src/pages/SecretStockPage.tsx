import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  ShieldAlert, 
  Plus, 
  ArrowLeftRight, 
  History, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  MapPin, 
  Calendar, 
  Package, 
  AlertCircle, 
  Check, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Clock,
  Sparkles
} from 'lucide-react';
import { useInventory } from '../lib/store';
import { SecretStockItem, SecretStockLog } from '../types';

interface SecretStockPageProps {
  onNavigate?: (view: string) => void;
}

export function SecretStockPage({ onNavigate }: SecretStockPageProps) {
  const { 
    secretItems, 
    secretLogs, 
    isSecretUnlocked, 
    unlockSecret, 
    lockSecret, 
    changeSecretPin, 
    addSecretItem, 
    updateSecretItem, 
    deleteSecretItem, 
    adjustSecretStock,
    items: mainInventoryItems 
  } = useInventory();

  // Pin Pad State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Selected Item for Edit or Adjust
  const [selectedItem, setSelectedItem] = useState<SecretStockItem | null>(null);

  // Filter by category / purpose
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HOLIDAY_EMERGENCY' | 'LIFE_SAVING' | 'CRITICAL_SUPPLY' | 'GENERAL_SECRET'>('ALL');

  // Add / Edit Form State
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    location: string;
    expiryDate: string;
    minStock: number;
    notes: string;
    category: 'HOLIDAY_EMERGENCY' | 'LIFE_SAVING' | 'CRITICAL_SUPPLY' | 'GENERAL_SECRET';
  }>({
    id: '',
    name: '',
    quantity: 1,
    unit: 'ชิ้น',
    location: '',
    expiryDate: '',
    minStock: 2,
    notes: '',
    category: 'HOLIDAY_EMERGENCY',
  });

  // Transfer Form State
  const [transferType, setTransferType] = useState<'TRANSFER_FROM_MAIN' | 'TRANSFER_TO_MAIN'>('TRANSFER_FROM_MAIN');
  const [transferItemId, setTransferItemId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferOperator, setTransferOperator] = useState('พยาบาลหัวหน้าเวร');
  const [transferNotes, setTransferNotes] = useState('');

  // Change PIN Form State
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  // Pin Keypad Handlers
  const handleNumberClick = (num: string) => {
    if (pinInput.length < 8) {
      const next = pinInput + num;
      setPinInput(next);
      setPinError(false);
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const handleClearPin = () => {
    setPinInput('');
    setPinError(false);
  };

  const handleUnlockSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput) return;

    const success = unlockSecret(pinInput);
    if (success) {
      setPinInput('');
      setPinError(false);
      setPinErrorMessage('');
    } else {
      setPinError(true);
      setPinErrorMessage('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setPinInput('');
    }
  };

  // Category counts
  const holidayCount = useMemo(() => secretItems.filter(i => (i.category || 'HOLIDAY_EMERGENCY') === 'HOLIDAY_EMERGENCY').length, [secretItems]);
  const lifeSavingCount = useMemo(() => secretItems.filter(i => i.category === 'LIFE_SAVING').length, [secretItems]);
  const criticalCount = useMemo(() => secretItems.filter(i => i.category === 'CRITICAL_SUPPLY').length, [secretItems]);

  // Filtered Secret Items
  const filteredItems = useMemo(() => {
    return secretItems.filter(item => {
      const cat = item.category || 'HOLIDAY_EMERGENCY';
      if (categoryFilter !== 'ALL' && cat !== categoryFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        (item.location && item.location.toLowerCase().includes(term)) ||
        (item.notes && item.notes.toLowerCase().includes(term))
      );
    });
  }, [secretItems, categoryFilter, searchTerm]);

  // Statistics
  const totalUnits = useMemo(() => {
    return secretItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [secretItems]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set(secretItems.map(i => i.location).filter(Boolean));
    return locs.size;
  }, [secretItems]);

  // Quick Adjust (Add or Subtract)
  const handleQuickAdjust = async (item: SecretStockItem, change: number) => {
    const operator = 'พยาบาลผู้รับผิดชอบสต็อกลับ';
    if (change > 0) {
      await adjustSecretStock(item.id, 'IN', change, operator, 'ปรับยอดรับเข้าโดยตรง');
    } else {
      if (item.quantity <= 0) return;
      await adjustSecretStock(item.id, 'OUT', Math.abs(change), operator, 'เบิกใช้ฉุกเฉิน');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: SecretStockItem) => {
    setSelectedItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location || '',
      expiryDate: item.expiryDate || '',
      minStock: item.minStock || 2,
      notes: item.notes || '',
      category: item.category || 'HOLIDAY_EMERGENCY',
    });
    setIsEditModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData({
      id: `SEC-${Date.now().toString().slice(-4)}`,
      name: '',
      quantity: 1,
      unit: 'ชิ้น',
      location: 'ตู้ยาฉุกเฉินกุญแจแดง',
      expiryDate: '',
      minStock: 2,
      notes: '',
      category: 'HOLIDAY_EMERGENCY',
    });
    setIsAddModalOpen(true);
  };

  // Submit Add Item
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await addSecretItem({
      id: formData.id.trim() || `SEC-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      quantity: Number(formData.quantity) || 1,
      unit: formData.unit.trim() || 'ชิ้น',
      location: formData.location.trim() || undefined,
      expiryDate: formData.expiryDate || undefined,
      minStock: Number(formData.minStock) || 2,
      notes: formData.notes.trim() || undefined,
      category: formData.category,
      updatedAt: new Date().toISOString(),
    });

    setIsAddModalOpen(false);
  };

  // Submit Edit Item
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !formData.name.trim()) return;

    await updateSecretItem(selectedItem.id, {
      name: formData.name.trim(),
      quantity: Number(formData.quantity) || 0,
      unit: formData.unit.trim(),
      location: formData.location.trim() || undefined,
      expiryDate: formData.expiryDate || undefined,
      minStock: Number(formData.minStock) || 2,
      notes: formData.notes.trim() || undefined,
      category: formData.category,
    });

    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  // Submit Stock Transfer
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItemId || transferQuantity <= 0) {
      alert('กรุณาเลือกรายการและระบุจำนวนที่ต้องการโอนย้าย');
      return;
    }

    await adjustSecretStock(
      transferItemId,
      transferType,
      transferQuantity,
      transferOperator.trim() || 'พยาบาลผู้ดูแลสต็อกลับ',
      transferNotes.trim() || (transferType === 'TRANSFER_FROM_MAIN' ? 'โอนแบ่งจากคลังหลักเข้าสต็อกลับ' : 'โอนคืนจากสต็อกลับสู่คลังหลัก')
    );

    setIsTransferModalOpen(false);
    setTransferQuantity(1);
    setTransferNotes('');
  };

  // Submit Change PIN
  const handleSaveChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    setChangePinSuccess(false);

    if (newPin.length < 4) {
      setChangePinError('รหัส PIN ใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษรหรือตัวเลข');
      return;
    }

    if (newPin !== confirmPin) {
      setChangePinError('รหัส PIN ใหม่และการยืนยันไม่ตรงกัน');
      return;
    }

    const success = changeSecretPin(oldPin, newPin);
    if (success) {
      setChangePinSuccess(true);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setIsPinModalOpen(false);
        setChangePinSuccess(false);
      }, 1500);
    } else {
      setChangePinError('รหัส PIN เดิมไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
    }
  };

  // =========================================================================
  // VIEW: LOCKED VAULT SCREEN
  // =========================================================================
  if (!isSecretUnlocked) {
    return (
      <div className="p-4 sm:p-6 md:p-8 w-full max-w-full min-h-[85vh] flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center space-y-6 animate-fadeIn">
          
          {/* Cute Lock Icon Emblem */}
          <div className="relative mx-auto w-22 h-22 bg-gradient-to-tr from-pink-100 via-rose-50 to-indigo-50 rounded-3xl flex items-center justify-center text-rose-500 border border-rose-200/80 shadow-md">
            <Lock size={38} strokeWidth={2.5} className="animate-pulse" />
            <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-gradient-to-tr from-amber-400 to-yellow-400 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-2xs">
              🗝️
            </div>
            <div className="absolute -bottom-1 -left-1 text-sm select-none">
              ✨
            </div>
          </div>

          <div>
            <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wider border border-rose-200 shadow-2xs">
              Confidential &amp; Emergency Reserve 🔐
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-2.5">
              คลังสำรองลับเฉพาะ (Secret Stock) 💖
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              พื้นที่จัดเก็บเวชภัณฑ์ลับเฉพาะวอร์ด สำหรับเคสวิกฤตฉุกเฉินและเวรดึก กรุณาใส่รหัส PIN เพื่อเปิดใช้งาน ✨
            </p>
          </div>

          {/* Masked PIN Display */}
          <div className="space-y-2">
            <div className="flex justify-center items-center gap-3 h-12">
              {[0, 1, 2, 3].map(idx => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled 
                        ? 'bg-rose-500 scale-125 shadow-sm' 
                        : 'bg-slate-200'
                    } ${pinError ? 'bg-rose-600 animate-pulse' : ''}`}
                  />
                );
              })}
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 py-1 px-3 rounded-lg border border-rose-200 animate-bounce">
                {pinErrorMessage || 'รหัส PIN ไม่ถูกต้อง'}
              </p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num.toString())}
                className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-rose-50 text-slate-800 font-bold text-xl transition-all active:scale-95 border border-slate-100 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearPin}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold text-xs transition-all active:scale-95 border border-slate-100 cursor-pointer flex items-center justify-center"
            >
              ล้าง
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-rose-50 text-slate-800 font-bold text-xl transition-all active:scale-95 border border-slate-100 shadow-2xs cursor-pointer flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs transition-all active:scale-95 border border-slate-100 cursor-pointer flex items-center justify-center"
            >
              ลบ
            </button>
          </div>

          {/* Unlock Action Button */}
          <button
            type="button"
            disabled={pinInput.length === 0}
            onClick={() => handleUnlockSubmit()}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
              pinInput.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Unlock size={18} />
            <span>ปลดล็อกคลังลับ</span>
          </button>

          {/* Default PIN Hint */}
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-amber-500 shrink-0" />
            <span>รหัส PIN เริ่มต้นจากโรงงาน: <strong className="text-slate-600 font-mono">1234</strong> (เปลี่ยนได้หลังเปิด)</span>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: UNLOCKED SECRET STOCK VAULT
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-full space-y-6">
      
      {/* Top Banner (Unlocked Status & Controls) */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              คลังสำรองลับเปิดใช้งานอยู่ (UNLOCKED)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Unlock size={26} className="text-rose-300" />
            <span>คลังสำรองลับเฉพาะวอร์ด (Secret Stock)</span>
          </h1>
          <p className="text-xs text-rose-200/80 max-w-xl">
            สต็อกลับสำหรับยาฉุกเฉิน เวชภัณฑ์วิกฤต และอุปกรณ์สำรองเวรดึก (ไม่แสดงในยอดคงเหลือทั่วไปของ Dashboard)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsLogsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
          >
            <History size={15} />
            <span>ประวัติสต็อกลับ</span>
          </button>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
          >
            <KeyRound size={15} />
            <span>เปลี่ยนรหัส PIN</span>
          </button>

          <button
            onClick={lockSecret}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Lock size={15} />
            <span>ล็อกคลังลับทันที</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards with Cute Dual-Layer Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 p-5 rounded-3xl border border-rose-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
            <Package size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1">
              <span>รายการสินค้าลับ</span>
              <span>🔐</span>
            </span>
            <p className="text-2xl font-black text-slate-800">{secretItems.length} <span className="text-xs font-bold text-slate-400">รายการ</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-3xl border border-amber-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1">
              <span>ยอดคงเหลือรวม</span>
              <span>✨</span>
            </span>
            <p className="text-2xl font-black text-amber-800">{totalUnits.toLocaleString()} <span className="text-xs font-bold text-slate-400">ชิ้น/หน่วย</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 p-5 rounded-3xl border border-indigo-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
            <MapPin size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1">
              <span>จุดซ่อน / ตู้เก็บ</span>
              <span>📍</span>
            </span>
            <p className="text-2xl font-black text-indigo-800">{uniqueLocations} <span className="text-xs font-bold text-slate-400">จุดที่เก็บ</span></p>
          </div>
        </div>
      </div>

      {/* Action Controls & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้าลับ, รหัสบาร์โค้ด, หรือจุดซ่อน/ลิ้นชักลับ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 text-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTransferType('TRANSFER_FROM_MAIN');
              setTransferNotes('สำรองฉุกเฉินช่วงวันหยุดยาว/เทศกาล ป้องกันของหมด');
              setTransferItemId(secretItems[0]?.id || '');
              setIsTransferModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles size={15} className="text-amber-600" />
            <span>🌴 ดึงของสำรองวันหยุดยาว</span>
          </button>

          <button
            onClick={() => {
              setTransferItemId(secretItems[0]?.id || '');
              setIsTransferModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeftRight size={15} />
            <span>โอนย้าย คลังหลัก ⇄ สต็อกลับ</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>เพิ่มรายการในคลังลับ</span>
          </button>
        </div>

      </div>

      {/* Category Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          ทั้งหมด ({secretItems.length})
        </button>
        <button
          onClick={() => setCategoryFilter('HOLIDAY_EMERGENCY')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            categoryFilter === 'HOLIDAY_EMERGENCY'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          🌴 สำรองวันหยุดยาว ({holidayCount})
        </button>
        <button
          onClick={() => setCategoryFilter('LIFE_SAVING')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            categoryFilter === 'LIFE_SAVING'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          🚨 ยาช่วยชีวิตฉุกเฉิน ({lifeSavingCount})
        </button>
        <button
          onClick={() => setCategoryFilter('CRITICAL_SUPPLY')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            categoryFilter === 'CRITICAL_SUPPLY'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          ⚡ เวชภัณฑ์วิกฤต ({criticalCount})
        </button>
      </div>

      {/* Secret Items Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/60">
                <th className="py-4 px-5 pl-6 w-36 whitespace-nowrap">รหัสลับ</th>
                <th className="py-4 px-4 min-w-[240px]">ชื่อสินค้าลับ & จุดซ่อน / ที่เก็บ</th>
                <th className="py-4 px-4 text-center w-36 whitespace-nowrap">จำนวนคงเหลือ</th>
                <th className="py-4 px-4 text-center w-36 whitespace-nowrap">วันหมดอายุ</th>
                <th className="py-4 px-4 text-center w-40 whitespace-nowrap">ปรับยอดด่วน</th>
                <th className="py-4 px-4 text-center w-36 pr-6 whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isLow = item.quantity <= (item.minStock || 2);
                  const itemCat = item.category || 'HOLIDAY_EMERGENCY';

                  return (
                    <tr key={item.id} className="hover:bg-rose-50/30 transition-colors group">
                      
                      {/* Secret ID */}
                      <td className="py-4 px-5 pl-6 whitespace-nowrap">
                        <span className="font-mono text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                          {item.id}
                        </span>
                      </td>

                      {/* Name & Hidden Location */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm leading-snug break-words">
                              {item.name}
                            </span>
                            {itemCat === 'HOLIDAY_EMERGENCY' && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                🌴 สำรองวันหยุดยาว
                              </span>
                            )}
                            {itemCat === 'LIFE_SAVING' && (
                              <span className="text-[10px] font-bold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                🚨 ยาช่วยชีวิต
                              </span>
                            )}
                            {itemCat === 'CRITICAL_SUPPLY' && (
                              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                ⚡ เวชภัณฑ์วิกฤต
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            {item.location && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                                <MapPin size={10} className="text-amber-600" />
                                จุดซ่อน: {item.location}
                              </span>
                            )}
                            {item.notes && (
                              <span className="text-[11px] text-slate-500 italic truncate max-w-xs" title={item.notes}>
                                🤫 {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-baseline justify-center gap-1 px-3 py-1 rounded-xl font-mono whitespace-nowrap ${
                          item.quantity === 0 ? 'bg-rose-100 text-rose-800 font-black' :
                          isLow ? 'bg-amber-100 text-amber-900 font-black' :
                          'bg-slate-100 text-slate-800 font-bold'
                        }`}>
                          <span className="text-base font-black">{item.quantity}</span>
                          <span className="text-xs font-bold text-slate-500 font-sans">{item.unit}</span>
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-600">
                          {item.expiryDate ? item.expiryDate : '-'}
                        </span>
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleQuickAdjust(item, 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 transition-all active:scale-95 cursor-pointer"
                            title="เพิ่ม 1 หน่วย"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(item, -1)}
                            disabled={item.quantity <= 0}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all active:scale-95 cursor-pointer ${
                              item.quantity <= 0 
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                            title="เบิกใช้ 1 หน่วย"
                          >
                            -1
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 flex items-center justify-center border border-slate-200/80 transition-all active:scale-95 cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการสต็อกลับ "${item.name}"?`)) {
                                deleteSecretItem(item.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center border border-slate-200/80 transition-all active:scale-95 cursor-pointer"
                            title="ลบรายการลับ"
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
                    <p className="text-sm font-bold text-slate-500">ยังไม่มีรายการในคลังสำรองลับ</p>
                    <button
                      onClick={handleOpenAdd}
                      className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                    >
                      ➕ คลิกที่นี่เพื่อเพิ่มรายการใหม่
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SECRET ITEM                                             */}
      {/* ========================================================================= */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2.5 text-rose-800">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  {isEditModalOpen ? <Edit3 size={18} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 leading-tight">
                    {isEditModalOpen ? 'แก้ไขรายการสินค้าลับ' : 'เพิ่มรายการใหม่ในคลังลับ'}
                  </h3>
                  <p className="text-xs text-slate-500">ข้อมูลนี้จะถูกเก็บเป็นความลับและเข้าถึงได้ด้วยรหัส PIN เท่านั้น</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleSaveEdit : handleSaveAdd} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ID */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">รหัสลับ / บาร์โค้ด</label>
                  <input
                    type="text"
                    required
                    disabled={isEditModalOpen}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800"
                  />
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ชื่อสินค้า / ยาสำรองลับ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Adrenaline 1mg/ml (สำรองพิเศษ)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">จำนวนคงเหลือ *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">หน่วยนับ</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="หลอด, ไวอัล, ชิ้น, กล่อง"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>

                {/* Purpose / Category */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>วัตถุประสงค์ในการเก็บลับ / สำรองฉุกเฉิน *</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  >
                    <option value="HOLIDAY_EMERGENCY">🌴 สำรองฉุกเฉินวันหยุดยาว / เทศกาล (สงกรานต์, ปีใหม่)</option>
                    <option value="LIFE_SAVING">🚨 ยาและเวชภัณฑ์กู้ชีพฉุกเฉิน (CPR / Anaphylaxis)</option>
                    <option value="CRITICAL_SUPPLY">⚡ เวชภัณฑ์วิกฤตห้ามเบิกใช้งานทั่วไป</option>
                    <option value="GENERAL_SECRET">🔒 สต็อกลับทั่วไปเฉพาะวอร์ด</option>
                  </select>
                </div>

                {/* Hidden Location */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin size={12} className="text-rose-500" />
                    <span>จุดซ่อน / ลิ้นชักลับที่เก็บของ (มีผลต่อความปลอดภัย) *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตู้ยาฉุกเฉินชั้น 2 กุญแจแดง, ลิ้นชักหลังเคาน์เตอร์, ตู้เย็นช่องลับ"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">วันหมดอายุ</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Min Stock */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">เกณฑ์เตือนขั้นต่ำลับ (Min Stock)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Secret Notes */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">หมายเหตุลับเฉพาะ</label>
                  <input
                    type="text"
                    placeholder="เช่น สำรองสำหรับเคสวิกฤตเท่านั้น ห้ามเบิกทั่วไป"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>บันทึกข้อมูลคลังลับ</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STOCK TRANSFER (คลังหลัก ⇄ สต็อกลับ)                               */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <ArrowLeftRight size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 leading-tight">โอนย้ายสต็อก</h3>
                  <p className="text-xs text-slate-500">โอนระหว่างคลังหลักและคลังสำรองลับ</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="p-6 space-y-4">
              
              {/* Transfer Direction Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ทิศทางการโอนย้าย *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferType('TRANSFER_FROM_MAIN')}
                    className={`p-3 rounded-2xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                      transferType === 'TRANSFER_FROM_MAIN'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs ring-1 ring-rose-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft size={16} className="text-rose-500 shrink-0" />
                    <div>
                      <span className="block font-black">คลังหลัก ➡️ สต็อกลับ</span>
                      <span className="text-[10px] text-slate-500 font-normal">หักคลังใหญ่ เข้าตู้ลับ</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferType('TRANSFER_TO_MAIN')}
                    className={`p-3 rounded-2xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                      transferType === 'TRANSFER_TO_MAIN'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs ring-1 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <span className="block font-black">สต็อกลับ ➡️ คลังหลัก</span>
                      <span className="text-[10px] text-slate-500 font-normal">คืนออกจากตู้ลับ สู่คลังใหญ่</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Select Secret Item */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">เลือกรายการสินค้าในคลังลับ *</label>
                <select
                  required
                  value={transferItemId}
                  onChange={(e) => setTransferItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {secretItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (ในคลังลับมี: {item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">จำนวนที่ต้องการโอน *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800"
                />
              </div>

              {/* Operator */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ผู้ทำรายการโอนย้าย *</label>
                <input
                  type="text"
                  required
                  value={transferOperator}
                  onChange={(e) => setTransferOperator(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">เหตุผล / หมายเหตุการโอนย้าย</label>
                <input
                  type="text"
                  placeholder="เช่น เบิกเตรียมพร้อมรับเคสฉุกเฉิน, คืนส่วนเกินหลังสิ้นสุดเวร"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>ยืนยันการโอนย้าย</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHANGE PIN CODE                                                    */}
      {/* ========================================================================= */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5 text-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 leading-tight">เปลี่ยนรหัสผ่าน PIN คลังลับ</h3>
                  <p className="text-xs text-slate-500">กำหนดรหัส PIN 4-8 หลักใหม่สำหรับความปลอดภัย</p>
                </div>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChangePin} className="p-6 space-y-4">
              
              {changePinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}

              {changePinSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <Check size={16} className="shrink-0" />
                  <span>เปลี่ยนรหัส PIN สำเร็จเรียบร้อยแล้ว!</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">รหัส PIN ปัจจุบัน *</label>
                <input
                  type="password"
                  required
                  placeholder="ใส่รหัส PIN เดิม"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">รหัส PIN ใหม่ (อย่างน้อย 4 หลัก) *</label>
                <input
                  type="password"
                  required
                  placeholder="เช่น 5678"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ยืนยันรหัส PIN ใหม่อีกครั้ง *</label>
                <input
                  type="password"
                  required
                  placeholder="ใส่รหัส PIN ใหม่อีกครั้ง"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>บันทึกรหัส PIN ใหม่</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SECRET AUDIT LOGS                                                  */}
      {/* ========================================================================= */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5 text-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 leading-tight">บันทึกประวัติการปรับปรุงสต็อกลับ</h3>
                  <p className="text-xs text-slate-500">ติดตามรายการรับเข้า เบิกใช้ และโอนย้ายในคลังลับ</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase pb-2">
                      <th className="pb-3 pl-2">วันเวลา</th>
                      <th className="pb-3">ประเภท</th>
                      <th className="pb-3">รายการสินค้า</th>
                      <th className="pb-3 text-center">จำนวน</th>
                      <th className="pb-3">ผู้ทำรายการ</th>
                      <th className="pb-3 pr-2">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {secretLogs.length > 0 ? (
                      secretLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 pl-2 text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              log.type === 'IN' ? 'bg-emerald-50 text-emerald-700' :
                              log.type === 'OUT' ? 'bg-rose-50 text-rose-700' :
                              log.type === 'TRANSFER_FROM_MAIN' ? 'bg-indigo-50 text-indigo-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {log.type === 'IN' ? 'รับเข้า' :
                               log.type === 'OUT' ? 'เบิกใช้' :
                               log.type === 'TRANSFER_FROM_MAIN' ? 'โอนจากคลังหลัก' : 'โอนสู่คลังหลัก'}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-slate-800">{log.itemName}</td>
                          <td className="py-3 text-center font-mono font-bold">
                            {log.type === 'IN' || log.type === 'TRANSFER_FROM_MAIN' ? '+' : '-'}{log.quantity}
                          </td>
                          <td className="py-3 text-slate-600 font-medium">{log.operator}</td>
                          <td className="py-3 pr-2 text-slate-500 italic">{log.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          ยังไม่มีประวัติการทำรายการสต็อกลับ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
