export type CategoryId = 'medical' | 'medicine' | 'iv' | 'housekeeping' | 'computer' | 'lab';

export interface Category {
  id: CategoryId;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

export interface InventoryItem {
  id: string; // e.g. M001
  name: string;
  categoryId: CategoryId;
  quantity: number;
  unit: string;
  expiryDate?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  type: 'RECEIVE' | 'ISSUE';
  quantity: number;
  timestamp: string;
  expiryDate?: string;
  operator?: string; // Add operator field!
}

export interface AppState {
  items: InventoryItem[];
  transactions: Transaction[];
  lastUpdated: string;
}
