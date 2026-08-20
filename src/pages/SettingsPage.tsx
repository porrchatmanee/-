import React from 'react';
import { useInventory } from '../lib/store';
import { Clock, HardDrive, RefreshCw, Server, AlertCircle } from 'lucide-react';

export function SettingsPage() {
  const { lastUpdated, items, transactions, resetData, isOnline, isSyncing, fetchData, getMaskedUrl, getMaskedKey } = useInventory();

  const handleReset = async () => {
    const confirmation = window.confirm(
      isOnline 
        ? '⚠️ คำเตือน: คุณแน่ใจหรือไม่ที่จะล้างคลังระบบออนไลน์ใน Supabase? ข้อมูลทั้งหมดที่แชร์กับผู้อื่นจะหายไป'
        : 'คุณแน่ใจหรือไม่ว่าต้องการคืนค่าระบบ? ข้อมูลทดสอบทั้งหมดของคุณจะหายไป'
    );
    if (confirmation) {
      await resetData();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10 text-left">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">ตั้งค่าระบบ</h1>
        <p className="text-slate-500 mt-2 text-base md:text-lg">จัดการเชื่อมต่อ Cloud ฐานข้อมูลสากลและการซิงก์ข้อมูลของ SUKJAI Hub</p>
      </header>

      <div className="space-y-6 text-left">
        
        {/* Connection Status Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isOnline ? 'bg-emerald-50 text-[#00c07f]' : 'bg-amber-50 text-amber-500'
            }`}>
              <Server size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">โหมดการประมวลผลระบบ</h2>
              <p className="text-slate-500 text-sm mt-0.5">สถานะการทำงานคลังและการจัดเก็บข้อมูลปัจจุบัน</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">สถานะช่องทางข้อมูล</p>
              {isOnline ? (
                <div>
                  <span className="text-xl font-black text-emerald-600 flex items-center gap-1.5 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ออนไลน์ร่วมกัน (Supabase)
                  </span>
                  <p className="text-xs text-slate-500 mt-2 font-semibold">
                    ซิงก์ประวัติเบิกจ่าย สแกนบาร์โค้ด และข้อมูลเวชภัณฑ์ทั้งหมดแบบเรียลไทม์กับผู้ใช้อื่น
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-xl font-black text-amber-600 flex items-center gap-1.5 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    ออฟไลน์เครื่องเดียว (Local)
                  </span>
                  <p className="text-xs text-slate-500 mt-2 font-semibold">
                    ข้อมูลจะถูกเก็บเป็นความลับบนหน่วยความจำ LocalStorage ของเบราว์เซอร์นี้เท่านั้น
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">การสื่อสารระบบล่าสุด</p>
              <span className="text-md font-black text-slate-800 block mt-1">
                {new Date(lastUpdated).toLocaleString('th-TH', { 
                  dateStyle: 'medium', 
                  timeStyle: 'medium' 
                })}
              </span>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                การถ่ายโอน ลบล้าง และการจัดเก็บตรวจพบล่าสุดในแถมอุปกรณ์ผู้ใช้
              </p>
            </div>
          </div>

          {/* Connection Diagnostics Info Area */}
          <div className="border-t border-slate-100 pt-5 mt-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">รายละเอียดการเชื่อมต่อที่ตรวจพบ (จากแถบความปลอดภัย AI Studio)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">URL (VITE_SUPABASE_URL):</span>
                <span className="text-slate-700 font-extrabold select-all">{getMaskedUrl()}</span>
              </div>
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">🔑 PUBLIC KEY (VITE_SUPABASE_ANON_KEY / ANO):</span>
                <span className="text-slate-700 font-extrabold select-all">{getMaskedKey()}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Database Management Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
              <HardDrive size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">การจัดการข้อมูลในคลัง</h2>
              <p className="text-slate-500 text-sm mt-0.5">ล้างข้อมูล หรือ จัดการรายการต่างๆ</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 items-center justify-between">
            <div className="text-left font-semibold text-slate-700 space-y-1">
              <p>เวชภัณฑ์ยาในระบบคลัง: <span className="text-indigo-600 font-extrabold">{items.length} รายการ</span></p>
              <p>บันทึกประวัติความเคลื่อนไหว: <span className="text-indigo-600 font-extrabold">{transactions.length} รายการ</span></p>
            </div>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 px-6 py-3 rounded-xl font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw size={17} className={isSyncing ? "animate-spin" : ""} />
              <span>รีเซ็ตข้อมูลทั้งหมด (Reset)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Setup SQL Instruction Panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
              <RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">คู่มือสถาปนาและเชื่อมต่อ Supabase</h2>
              <p className="text-slate-500 text-sm mt-0.5">ขั้นตอนการผูกระบบฐานและตั้งค่าตาราง SQL</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm mb-3">📍 วิธีการกำหนดค่าและสิทธิ์คลังบาร์โค้ด:</h3>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-3.5 leading-relaxed font-bold">
                <li>
                  <span className="text-slate-800 font-black">ความต้องการ SQL ใหม่ (มีคอลัมน์ผู้ทำรายการ):</span> เพื่อให้บันทึกผู้ทำรายการสแกนลงบ่อยร่วมกันได้ คุณ <span className="text-indigo-600">จำเป็น</span> ต้องเอาโค้ด SQL ด้านล่างไปวางใน <span className="text-emerald-600">SQL Editor ของโปรเจกต์ Supabase</span> จากนั้นจึงกด <span className="text-rose-600">Run</span> เพื่อสร้างความสัมพันธ์และ Trigger อัปเดตปริมาณยาอัตโนมัติ:
                  
                  <div className="mt-2.5 bg-slate-900 border border-slate-800 text-emerald-400 p-4 rounded-2xl font-mono text-[10px] overflow-x-auto max-h-56 leading-relaxed block whitespace-pre shadow-inner text-left">
{`-- 1. ลบตารางอันเก่าและสลายสิทธิ์เพื่อสร้างใหม่ความถูกต้องเต็ม
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP FUNCTION IF EXISTS update_inventory_quantity() CASCADE;
DROP TYPE IF EXISTS public.transaction_type CASCADE;

-- 2. สร้างหมวดหมู่เก็บรักษาเวชภัณฑ์
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- เตรียมใส่หมวดมาตรฐานโรงพยาบาล
INSERT INTO public.categories (id, name) VALUES
    ('medical', 'คลังเวชภัณฑ์'),
    ('medicine', 'คลังยา'),
    ('iv', 'คลังน้ำเกลือ'),
    ('housekeeping', 'งานบ้านงานครัว'),
    ('computer', 'คลังคอมพิวเตอร์'),
    ('lab', 'คลังชันสูตร');

-- 3. ตารางสแกนจัดเก็บเวชภัณฑ์
CREATE TABLE public.inventory_items (
    id TEXT PRIMARY KEY, -- จะใช้รหัสสแกน Barcode มาตั้งเป็นรหัสสินค้า
    name TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. บันทึกยอดธุรกรรมประวัติ เบิกออก/รับเข้า
CREATE TYPE public.transaction_type AS ENUM ('RECEIVE', 'ISSUE');

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type public.transaction_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expiry_date DATE,
    operator TEXT DEFAULT 'พยาบาล', -- เก็บชื่อพยาบาล/ผู้เบิก
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. เขียนความปลอดภัยเพื่อบวก/ลบ ยอดจริงทันทีเมื่อเพิ่มประวัติทำรายการ
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'RECEIVE' THEN
        UPDATE public.inventory_items
        SET quantity = quantity + NEW.quantity,
            expiry_date = COALESCE(NEW.expiry_date, expiry_date), 
            updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.type = 'ISSUE' THEN
        -- การ UPDATE จะล้มเหลวทันทีหากยอดเบิกลดต่ำกว่าคลัง (มี CHECK constraint บัญญัติไว้ด้านบน)
        UPDATE public.inventory_items
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_transaction_insert
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_quantity();

-- 6. ปลดสิทธิ์ความปลอดภัยเพื่ออนุญาตให้ทุกเครือข่ายแชร์ร่วมกัน (Row Level Security - Public Bypass)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow categories access" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow items access" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Allow transactions access" ON public.transactions FOR ALL USING (true);`}
                  </div>
                </li>
                
                <li>
                  <span className="text-slate-800 font-black">การนำพาสินค้าไปประกอบค่าเข้า AI Studio:</span> เข้าไปที่ปุ่ม <span className="text-indigo-600">Settings / Secrets</span> (อยู่แถบด้านบนขวาของแพลตฟอร์ม) จากนั้นกำหนดความสัมพันธ์ค่าตัวแปรในหน้า Secrets ของคุณ:
                  <ul className="list-disc list-inside ml-6 mt-1.5 text-slate-500 font-mono text-[11px] space-y-1">
                    <li><span className="font-bold text-slate-700">VITE_SUPABASE_URL</span>: คัดลอกค่า "Project URL" ใน Supabase API Settings</li>
                    <li><span className="font-bold text-slate-700">VITE_SUPABASE_ANON_KEY</span>: คัดลอกค่า "anon public API key" ในหน้าเดียวกัน</li>
                  </ul>
                  <p className="text-[10px] text-amber-600 mt-1 font-bold">
                    💡 สำคัญ: หลังจากแก้ไขตัวแปรสิ่งแวดล้อม รหัสเครือข่ายความปลอดภัยจะถูกนำมาใช้อัตโนมัติ และเว็บบอร์ดจะเปลี่ยนเป็นสถานะ "ออนไลน์" สีเขียวมุมล่างซ้ายทันที!
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
