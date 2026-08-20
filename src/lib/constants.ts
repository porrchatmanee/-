import { Category, InventoryItem } from '../types';

export const CATEGORIES: Category[] = [
  { id: 'medical', name: 'คลังเวชภัณฑ์', color: 'text-rose-500', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  { id: 'medicine', name: 'คลังยา', color: 'text-sky-500', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  { id: 'iv', name: 'คลังน้ำเกลือ', color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
  { id: 'housekeeping', name: 'งานบ้านงานครัว', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'computer', name: 'คลังคอมพิวเตอร์', color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-50', borderColor: 'border-fuchsia-200' },
  { id: 'lab', name: 'คลังชันสูตร', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
];

export const INITIAL_ITEMS: InventoryItem[] = [];
