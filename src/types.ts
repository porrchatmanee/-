export type CategoryId = 'medical' | 'medicine' | 'iv' | 'housekeeping' | 'computer' | 'lab';

export interface Category {
  id: CategoryId;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

export interface ItemLot {
  lotNumber: string; // e.g. "LOT-6701" or date-based
  expiryDate: string; // YYYY-MM-DD
  quantity: number; // remaining in this lot
  receivedDate?: string;
  pricePerUnit?: number; // ราคาต่อหน่วยในรอบ/ล็อตนี้ (บาท)
}

export interface InventoryItem {
  id: string; // e.g. M001 / Barcode
  name: string;
  categoryId: CategoryId;
  quantity: number; // total quantity across all active lots
  unit: string;
  price?: number; // ราคาต่อหน่วยล่าสุด/ราคาทุน (บาท)
  expiryDate?: string; // earliest active lot expiry date (FEFO)
  minStock?: number; // minimum stock threshold (จุดสั่งซื้อ / สต็อกต่ำสุด)
  maxStock?: number; // maximum stock threshold (สต็อกสูงสุด / เกณฑ์เกินคลัง)
  lots?: ItemLot[]; // breakdown of lots with differing expiration dates
  isHidden?: boolean; // ซ่อนไอเทมนี้จากหน้าจอทั่วไป (สำหรับสำรองวันหยุดยาว/ฉุกเฉิน)
}

export interface Transaction {
  id: string;
  itemId: string;
  type: 'RECEIVE' | 'ISSUE' | 'DISPENSE';
  quantity: number;
  timestamp: string;
  expiryDate?: string;
  lotNumber?: string;
  pricePerUnit?: number; // ราคาต่อหน่วยในรอบนี้ (บาท)
  totalPrice?: number; // มูลค่ารวมของรอบนี้ (บาท)
  operator?: string;
}

export interface BorrowRecord {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  borrowerName: string; // ชื่อผู้ยืม
  borrowerDepartment: string; // แผนก / วอร์ด
  borrowerPhone?: string; // เบอร์โทรศัพท์ภายใน / มือถือ
  borrowDate: string; // วันที่ยืม YYYY-MM-DD HH:mm
  expectedReturnDate: string; // กำหนดคืน YYYY-MM-DD
  actualReturnDate?: string; // วันที่คืนจริง
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE';
  notes?: string; // วัตถุประสงค์ / หมายเหตุ
  returnCondition?: 'NORMAL' | 'DAMAGED' | 'LOST'; // สภาพของตอนคืน
  returnReceiver?: string; // ผู้รับคืน
  deductFromStock?: boolean; // ตัดยอดสต็อกคลังหลักหรือไม่
}

export interface SecretStockItem {
  id: string; // Barcode / Secret ID
  name: string;
  quantity: number;
  unit: string;
  location?: string; // จุดซ่อน / ตู้ลับ
  expiryDate?: string;
  lotNumber?: string;
  minStock?: number;
  notes?: string;
  updatedAt: string;
  category?: 'HOLIDAY_EMERGENCY' | 'LIFE_SAVING' | 'CRITICAL_SUPPLY' | 'GENERAL_SECRET'; // ป้ายวัตถุประสงค์ เช่น สำรองวันหยุดยาว
}

export interface SecretStockLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT' | 'TRANSFER_FROM_MAIN' | 'TRANSFER_TO_MAIN';
  quantity: number;
  operator: string;
  timestamp: string;
  notes?: string;
}

export interface AppState {
  items: InventoryItem[];
  transactions: Transaction[];
  borrowRecords?: BorrowRecord[];
  secretItems?: SecretStockItem[];
  secretLogs?: SecretStockLog[];
  lastUpdated: string;
}
