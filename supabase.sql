-- ==========================================
-- SUKJAI Hub (WARD INVENTORY) - Supabase Schema
-- ==========================================

-- 0. Clean up existing objects 
-- (Drop table CASCADE will automatically drop its triggers, so we don't need DROP TRIGGER)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP FUNCTION IF EXISTS update_inventory_quantity() CASCADE;
DROP TYPE IF EXISTS public.transaction_type CASCADE;

-- 1. Create Categories Table
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Categories
INSERT INTO public.categories (id, name) VALUES
    ('medical', 'คลังเวชภัณฑ์'),
    ('medicine', 'คลังยา'),
    ('iv', 'คลังน้ำเกลือ'),
    ('housekeeping', 'งานบ้านงานครัว'),
    ('computer', 'คลังคอมพิวเตอร์'),
    ('lab', 'คลังชันสูตร');

-- 2. Create Inventory Items Table
CREATE TABLE public.inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Transactions Table
CREATE TYPE public.transaction_type AS ENUM ('RECEIVE', 'ISSUE');

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type public.transaction_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expiry_date DATE,
    operator TEXT DEFAULT 'พยาบาล',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Trigger to automatically update quantity
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


-- 5. Setup Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow public read-write for inventory_items" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Allow public read-write for transactions" ON public.transactions FOR ALL USING (true);
