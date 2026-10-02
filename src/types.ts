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
}

export interface InventoryItem {
  id: string; // e.g. M001 / Barcode
  name: string;
  categoryId: CategoryId;
  quantity: number; // total quantity across all active lots
  unit: string;
  expiryDate?: string; // earliest active lot expiry date (FEFO)
  minStock?: number; // minimum stock threshold (จุดสั่งซื้อ / สต็อกต่ำสุด)
  maxStock?: number; // maximum stock threshold (สต็อกสูงสุด / เกณฑ์เกินคลัง)
  lots?: ItemLot[]; // breakdown of lots with differing expiration dates
}

export interface Transaction {
  id: string;
  itemId: string;
  type: 'RECEIVE' | 'ISSUE' | 'DISPENSE';
  quantity: number;
  timestamp: string;
  expiryDate?: string;
  lotNumber?: string;
  operator?: string;
}

export interface AppState {
  items: InventoryItem[];
  transactions: Transaction[];
  lastUpdated: string;
}
