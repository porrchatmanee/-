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

export interface UnitCategory {
  groupName: string;
  units: string[];
}

export const STANDARD_UNIT_GROUPS: UnitCategory[] = [
  {
    groupName: '📄 อุปกรณ์สำนักงาน & กระดาษ (Office & Paper)',
    units: ['รีม', 'ริม', 'เล่ม', 'แผ่น', 'แฟ้ม', 'ด้าม', 'แท่ง', 'ซอง', 'ตั้ง', 'หลอด', 'ตลับหมึก', 'ห่อ']
  },
  {
    groupName: '📦 บรรจุภัณฑ์ทั่วไป (Packaging & General)',
    units: ['กล่อง', 'ลัง', 'แพ็ค', 'ห่อ', 'ถุง', 'โหล', 'ชุด', 'ชิ้น', 'อัน', 'ม้วน', 'คู่', 'ตลับ', 'ใบ', 'กระสอบ']
  },
  {
    groupName: '💊 ยาและเวชภัณฑ์การแพทย์ (Medical & Pharma)',
    units: ['เม็ด', 'แคปซูล', 'แผง', 'ขวด', 'กระปุก', 'หลอด', 'ซอง', 'แอมพูล', 'ไวอัล', 'เข็ม', 'สาย', 'ชิ้น', 'อัน', 'คู่', 'ชุด']
  },
  {
    groupName: '🧪 ของเหลวและปริมาตร (Liquid & Volume)',
    units: ['ขวด', 'แกลลอน', 'ลิตร (L)', 'มิลลิลิตร (ml)', 'ถัง', 'กระป๋อง', 'ขวดลิตร', 'หยด']
  },
  {
    groupName: '⚖️ น้ำหนักและมวล (Weight & Mass)',
    units: ['กิโลกรัม (kg)', 'กรัม (g)', 'มิลลิกรัม (mg)', 'กระสอบ', 'ปอนด์ (lb)', 'ก้อน']
  },
  {
    groupName: '⚙️ คอมพิวเตอร์และเครื่องใช้ (IT & Devices)',
    units: ['เครื่อง', 'ตัว', 'เส้น', 'ชุด', 'แผง', 'พอร์ต', 'กล่อง', 'ชิ้น']
  }
];

export const ALL_STANDARD_UNITS: string[] = Array.from(
  new Set(STANDARD_UNIT_GROUPS.flatMap(g => g.units))
);
