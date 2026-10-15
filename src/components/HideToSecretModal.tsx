import React, { useState, useEffect } from 'react';
import { Lock, EyeOff, Eye, ShieldAlert, ArrowRight, Check, X, MapPin, Calendar, Sparkles } from 'lucide-react';
import { useInventory } from '../lib/store';
import { InventoryItem } from '../types';

interface HideToSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onNavigateToSecret?: () => void;
}

export function HideToSecretModal({ isOpen, onClose, item, onNavigateToSecret }: HideToSecretModalProps) {
  const { hideItemToSecretStock, toggleItemHidden } = useInventory();

  const [mode, setMode] = useState<'TRANSFER' | 'TOGGLE_HIDE'>('TRANSFER');
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState('สำรองฉุกเฉินช่วงวันหยุดยาว/เทศกาล ป้องกันของหมด');
  const [location, setLocation] = useState('ตู้ยาฉุกเฉินกุญแจแดง');
  const [customLocation, setCustomLocation] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (item) {
      setQuantity(Math.min(item.quantity, Math.max(1, Math.floor(item.quantity / 2) || 1)));
      setIsSuccess(false);
      setSuccessMessage('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocation = customLocation.trim() || location;
    
    await hideItemToSecretStock(
      item.id,
      quantity,
      finalLocation,
      purpose
    );

    setIsSuccess(true);
    setSuccessMessage(`ย้าย "${item.name}" จำนวน ${quantity} ${item.unit} เข้าคลังสำรองลับเรียบร้อยแล้ว`);
    setTimeout(() => {
      onClose();
      setIsSuccess(false);
    }, 1600);
  };

  const handleToggleHideSubmit = async () => {
    await toggleItemHidden(item.id);
    const nowHidden = !item.isHidden;
    setIsSuccess(true);
    setSuccessMessage(nowHidden ? `ซ่อนรายการ "${item.name}" จากหน้าจอทั่วไปเรียบร้อยแล้ว` : `ยกเลิกการซ่อนรายการ "${item.name}" แล้ว`);
    setTimeout(() => {
      onClose();
      setIsSuccess(false);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                ซ่อนไอเทม / ย้ายเข้า Stock ลับ
              </h2>
              <p className="text-xs text-slate-400">
                สำรองกรณีฉุกเฉินหรือวันหยุดยาวต่อเนื่อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected Item Info Card */}
        <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md inline-block mb-1">
              {item.id}
            </span>
            <h3 className="text-sm font-bold text-slate-800 truncate" title={item.name}>
              {item.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              สถานะปัจจุบัน: {item.isHidden ? '🔒 กำลังซ่อนจากหน้าจอ' : '👁️ แสดงปกติ'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 block font-medium">คงเหลือในคลังหลัก</span>
            <span className="text-lg font-black text-slate-800">
              {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
            </span>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
              <Check size={28} strokeWidth={3} />
            </div>
            <p className="text-sm font-bold text-slate-700">{successMessage}</p>
            <p className="text-xs text-slate-400">กำลังบันทึกข้อมูลและปิดหน้าต่าง...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('TRANSFER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'TRANSFER'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Lock size={14} />
                <span>ย้ายยอดเข้าคลังลับ (โอนยอด)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('TOGGLE_HIDE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'TOGGLE_HIDE'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {item.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{item.isHidden ? 'ยกเลิกการซ่อน' : 'ซ่อนไอเทมทั้งรายการ'}</span>
              </button>
            </div>

            {mode === 'TRANSFER' ? (
              <form onSubmit={handleTransferSubmit} className="space-y-4 pt-1">
                {/* Quantity */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      จำนวนที่ต้องการย้ายเข้า Stock ลับ
                    </label>
                    <span className="text-xs text-slate-400">
                      สูงสุด: {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(item.quantity, Math.max(1, Number(e.target.value))))}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      required
                    />
                    <div className="flex gap-1">
                      {[1, 2, 5].map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuantity(Math.min(item.quantity, q))}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer transition-all"
                        >
                          +{q}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setQuantity(item.quantity)}
                        className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer transition-all"
                      >
                        ทั้งหมด
                      </button>
                    </div>
                  </div>
                </div>

                {/* Purpose / Emergency Preset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    วัตถุประสงค์ในการเก็บลับ / สำรองฉุกเฉิน
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer"
                  >
                    <option value="สำรองฉุกเฉินช่วงวันหยุดยาว/เทศกาล ป้องกันของหมด">🌴 สำรองฉุกเฉินช่วงวันหยุดยาว/เทศกาล (สงกรานต์/ปีใหม่)</option>
                    <option value="ยา-เวชภัณฑ์ช่วยชีวิตฉุกเฉิน (CPR / Anaphylaxis)">🚨 ยา-เวชภัณฑ์ช่วยชีวิตฉุกเฉิน (CPR / Anaphylaxis)</option>
                    <option value="สำรองกรณีฉุกเฉินเวรดึกเมื่อคลังใหญ่ปิด">🌙 สำรองกรณีฉุกเฉินเวรดึกเมื่อคลังใหญ่ปิด</option>
                    <option value="เวชภัณฑ์วิกฤตห้ามเบิกใช้งานทั่วไป">⚡ เวชภัณฑ์วิกฤตห้ามเบิกใช้งานทั่วไป</option>
                  </select>
                </div>

                {/* Secret Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    จุดซ่อน / ตู้ลับที่เก็บของ
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer mb-2"
                  >
                    <option value="ตู้ยาฉุกเฉินกุญแจแดง">ตู้ยาฉุกเฉินกุญแจแดง</option>
                    <option value="ตู้เซฟหัวหน้าเวร">ตู้เซฟหัวหน้าเวร</option>
                    <option value="ตู้เย็นยาช่องลับด้านหลัง">ตู้เย็นยาช่องลับด้านหลัง</option>
                    <option value="ลิ้นชักลับใต้เคาน์เตอร์พยาบาล">ลิ้นชักลับใต้เคาน์เตอร์พยาบาล</option>
                    <option value="กล่องทึบติดผนังหลังม่าน">กล่องทึบติดผนังหลังม่าน</option>
                    <option value="OTHER">ระบุจุดซ่อนอื่น ๆ...</option>
                  </select>

                  {location === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="พิมพ์จุดซ่อนหรือตำแหน่งตู้ลับ..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                      required
                    />
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={quantity <= 0 || item.quantity <= 0}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock size={14} />
                    <span>ยืนยันย้ายเข้าคลังลับ</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldAlert size={14} />
                    <span>คำแนะนำการซ่อนไอเทม</span>
                  </p>
                  <p>
                    {item.isHidden 
                      ? 'ไอเทมนี้ถูกซ่อนอยู่ เมื่อกด "ยกเลิกการซ่อน" รายการนี้จะกลับมาแสดงผลในตารางคลังหลักตามปกติ'
                      : 'เมื่อกด "ซ่อนไอเทมนี้" รายการนี้จะไม่แสดงในตารางคลังสินค้าทั่วไป เพื่อป้องกันไม่ให้คนอื่นเห็นหรือเบิกจนหมดก่อนวันหยุดยาว เจ้าหน้าที่จะต้องเปิดโหมดแสดงของซ่อนเพื่อดูรายการนี้'}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleHideSubmit}
                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      item.isHidden 
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' 
                        : 'bg-slate-800 hover:bg-slate-900 shadow-slate-300'
                    }`}
                  >
                    {item.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{item.isHidden ? 'ยกเลิกการซ่อน (แสดงปกติ)' : 'ซ่อนไอเทมนี้ทันที'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
