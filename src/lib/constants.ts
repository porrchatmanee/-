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

export const DEFAULT_BORROW_DEPARTMENTS = [
  'ICU (ไอซียู)',
  'ER (ห้องฉุกเฉิน)',
  'OPD (ผู้ป่วยนอก)',
  'OR (ห้องผ่าตัด)',
  'LR (ห้องคลอด)',
  'Ward 2 (อายุรกรรม)',
  'Ward 3 (ศัลยกรรม)',
  'Ward 4 (กุมารเวช)',
  'Ward พิเศษ',
  'ห้องตรวจไตเทียม / HD',
  'กายภาพบำบัด',
  'ห้องชันสูตร (Lab)',
  'เภสัชกรรม',
  'หน่วยจ่ายกลาง (CSSD)',
  'หน่วยกู้ชีพ 1669',
  'แพทย์เวรประจำวอร์ด',
];

export const DEFAULT_SECRET_PIN = '1234';

export const SAMPLE_BORROW_RECORDS = [
  {
    id: 'BRW-6710-001',
    itemName: 'เครื่อง Infusion Pump (Terumo TE-112)',
    quantity: 1,
    unit: 'เครื่อง',
    borrowerName: 'พว.สุกัญญา แก้วมณี',
    borrowerDepartment: 'ICU (ไอซียู)',
    borrowerPhone: '5102',
    borrowDate: '2026-10-14 09:30',
    expectedReturnDate: '2026-10-16',
    status: 'BORROWED' as const,
    notes: 'ยืมใช้เคสผู้ป่วยวิกฤตความดันตกเร่งด่วน',
    deductFromStock: false,
  },
  {
    id: 'BRW-6710-002',
    itemName: 'เครื่องวัดความดัน Digital (Omron HBP-1300)',
    quantity: 1,
    unit: 'เครื่อง',
    borrowerName: 'นพ.ธีรเดช สุขสวัสดิ์',
    borrowerDepartment: 'OPD (ผู้ป่วยนอก)',
    borrowerPhone: '5311',
    borrowDate: '2026-10-10 14:00',
    expectedReturnDate: '2026-10-12',
    status: 'OVERDUE' as const,
    notes: 'ยืมตรวจคลินิกพิเศษนอกเวลา (เกินกำหนดคืน)',
    deductFromStock: false,
  },
  {
    id: 'BRW-6710-003',
    itemName: 'เครื่องดูดเสมหะเคลื่อนที่ (Portable Suction)',
    quantity: 1,
    unit: 'เครื่อง',
    borrowerName: 'พว.ชลธิชา จิตดี',
    borrowerDepartment: 'Ward 4 (กุมารเวช)',
    borrowerPhone: '5401',
    borrowDate: '2026-10-11 11:15',
    expectedReturnDate: '2026-10-13',
    actualReturnDate: '2026-10-13 16:30',
    status: 'RETURNED' as const,
    returnCondition: 'NORMAL' as const,
    returnReceiver: 'พว.สมใจ (พยาบาลหัวหน้าเวร)',
    notes: 'คืนเรียบร้อยแล้ว ตรวจสอบอุปกรณ์และสายดูดครบถ้วน',
    deductFromStock: false,
  },
];

export const SAMPLE_SECRET_ITEMS = [
  {
    id: 'SEC-001',
    name: 'Adrenaline (Epinephrine) 1mg/1ml (สำรองฉุกเฉินลับ)',
    quantity: 5,
    unit: 'หลอด',
    location: 'ตู้ยาฉุกเฉินชั้น 2 กุญแจแดง',
    expiryDate: '2027-08-31',
    minStock: 2,
    category: 'LIFE_SAVING' as const,
    notes: 'สำรองสำหรับเคส Anaphylaxis / CPR ฉุกเฉินเท่านั้น',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SEC-002',
    name: 'Norepinephrine 4mg/4ml (กล่องสำรองพิเศษ)',
    quantity: 4,
    unit: 'ไวอัล',
    location: 'ตู้เย็นยาช่องลับด้านหลัง',
    expiryDate: '2027-05-15',
    minStock: 2,
    category: 'HOLIDAY_EMERGENCY' as const,
    notes: 'สต็อกลับสำรองช่วงวันหยุดยาว/เทศกาล เมื่อคลังใหญ่ปิดทำการ',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SEC-003',
    name: 'Tracheostomy Tube No. 7.5 (Cuffed) ล็อตสำรอง',
    quantity: 3,
    unit: 'ชุด',
    location: 'ตู้เก็บอุปกรณ์วิกฤตบนสุดห้องหัวหน้า',
    expiryDate: '2028-12-31',
    minStock: 1,
    category: 'HOLIDAY_EMERGENCY' as const,
    notes: 'ชุดสำรองใส่ท่อช่วยหายใจเร่งด่วนช่วงหยุดยาวสงกรานต์/ปีใหม่',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SEC-004',
    name: 'IV Catheter 20G (กล่องเซฟเวรดึก)',
    quantity: 30,
    unit: 'ชิ้น',
    location: 'ลิ้นชักลับใต้เคาน์เตอร์พยาบาล',
    expiryDate: '2028-06-30',
    minStock: 10,
    category: 'CRITICAL_SUPPLY' as const,
    notes: 'สำรองเวรดึกและวันหยุด ห้ามเบิกทั่วไปเด็ดขาด',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SEC-005',
    name: 'ชุด Dressing Set สำรองฉุกเฉิน',
    quantity: 5,
    unit: 'ชุด',
    location: 'กล่องทึบติดผนังหลังม่าน',
    expiryDate: '2027-11-30',
    minStock: 2,
    category: 'HOLIDAY_EMERGENCY' as const,
    notes: 'ชุดทำแผลปลอดเชื้อฉุกเฉินสำหรับเทศกาลวันหยุดยาว',
    updatedAt: new Date().toISOString(),
  },
];

export const SAMPLE_SECRET_LOGS = [
  {
    id: 'SLOG-001',
    itemId: 'SEC-001',
    itemName: 'Adrenaline (Epinephrine) 1mg/1ml (สำรองฉุกเฉินลับ)',
    type: 'IN' as const,
    quantity: 5,
    operator: 'พยาบาลหัวหน้าเวร',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    notes: 'เก็บสำรองเข้าตู้ลับกุญแจแดง',
  },
  {
    id: 'SLOG-002',
    itemId: 'SEC-004',
    itemName: 'IV Catheter 20G (กล่องเซฟเวรดึก)',
    type: 'TRANSFER_FROM_MAIN' as const,
    quantity: 30,
    operator: 'พว.สมศรี',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: 'โอนแบ่งจากคลังเวชภัณฑ์เข้าสต็อกลับเพื่อความพร้อมเวรดึก',
  },
];
