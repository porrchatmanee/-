-- =========================================================
-- SUKJAI Hub (WARD INVENTORY) - Complete Database Schema (SQL)
-- =========================================================
-- วิธีใช้:
-- 1. เข้าเว็บ Supabase (https://supabase.com/dashboard)
-- 2. เลือกโปรเจกต์ของคุณ -> ไปที่เมนู "SQL Editor" ด้านซ้าย
-- 3. กด "New Query" วางโค้ด SQL ด้านล่างนี้ทั้งหมด แล้วกด "Run" (สีเขียว)
-- =========================================================

-- 0. ล้างตารางเดิมออก (Clean up previous tables)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP FUNCTION IF EXISTS update_inventory_quantity() CASCADE;
DROP TYPE IF EXISTS public.transaction_type CASCADE;

-- 1. สร้างตารางหมวดหมู่คลังสินค้า (Categories)
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ใส่หมวดหมู่ทั้ง 6 หมวด
INSERT INTO public.categories (id, name) VALUES
    ('medical', 'คลังเวชภัณฑ์'),
    ('medicine', 'คลังยา'),
    ('iv', 'คลังน้ำเกลือ'),
    ('housekeeping', 'งานบ้านงานครัว'),
    ('computer', 'คลังคอมพิวเตอร์'),
    ('lab', 'คลังชันสูตร');

-- 2. สร้างตารางรายการสินค้าและยา (Inventory Items)
CREATE TABLE public.inventory_items (
    id TEXT PRIMARY KEY,                       -- รหัสบาร์โค้ด
    name TEXT NOT NULL,                        -- ชื่อสินค้า/ยา
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), -- จำนวนคงเหลือ
    unit TEXT NOT NULL,                        -- หน่วยนับ เช่น เม็ด, ชิ้น, ขวด
    min_stock INTEGER DEFAULT 10,              -- เกณฑ์สต็อกขั้นต่ำ (Min)
    max_stock INTEGER DEFAULT 100,             -- เกณฑ์สต็อกสูงสุด (Max)
    expiry_date DATE,                          -- วันหมดอายุ (ล็อตแรกสุด)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. สร้างตารางประวัติการรับเข้า-เบิกจ่าย (Transactions)
CREATE TYPE public.transaction_type AS ENUM ('RECEIVE', 'ISSUE', 'DISPENSE');

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type public.transaction_type NOT NULL,     -- 'RECEIVE' (รับเข้า), 'ISSUE' (เบิกจ่าย)
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expiry_date DATE,                          -- วันหมดอายุของล็อตนี้
    operator TEXT DEFAULT 'พยาบาล',            -- ผู้ทำรายการ หรือ [Lot:xxxx]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ระบบคำนวณและตัดสต็อกอัตโนมัติ (Trigger Function)
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'RECEIVE' THEN
        UPDATE public.inventory_items
        SET quantity = quantity + NEW.quantity,
            expiry_date = COALESCE(NEW.expiry_date, expiry_date), 
            updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.type = 'ISSUE' OR NEW.type = 'DISPENSE' THEN
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

-- 5. เปิดสิทธิ์การอ่าน-เขียนข้อมูลให้เว็บไซต์ (Row Level Security: RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow public read-write for inventory_items" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Allow public read-write for transactions" ON public.transactions FOR ALL USING (true);

-- 6. เพิ่มข้อมูลตัวอย่างเริ่มต้น (Optional Initial Items)
INSERT INTO public.inventory_items (id, name, category_id, quantity, unit, min_stock, max_stock, expiry_date) VALUES
    ('8850001', 'Paracetamol 500mg', 'medicine', 50, 'เม็ด', 20, 200, CURRENT_DATE + INTERVAL '180 days'),
    ('8850002', 'Amoxicillin 500mg', 'medicine', 30, 'แคปซูล', 15, 100, CURRENT_DATE + INTERVAL '120 days'),
    ('8850003', '0.9% NSS 1000ml', 'iv', 25, 'ขวด', 10, 50, CURRENT_DATE + INTERVAL '365 days'),
    ('8850004', 'Syringe 5ml', 'medical', 80, 'ชิ้น', 30, 300, CURRENT_DATE + INTERVAL '700 days'),
    ('8850005', 'N95 Mask', 'medical', 45, 'ชิ้น', 20, 150, CURRENT_DATE + INTERVAL '500 days');
