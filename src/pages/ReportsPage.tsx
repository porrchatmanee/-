import React, { useState, useMemo } from 'react';
import { useInventory } from '../lib/store';
import { CATEGORIES } from '../lib/constants';
import { InventoryItem, Transaction } from '../types';
import { formatThaiDate, getDaysUntilExpiry } from '../lib/lots';
import { 
  Printer, Download, FileText, Filter, Calendar, 
  Package, AlertTriangle, CheckCircle2, Search, ArrowUpRight, 
  ArrowDownLeft, Clock, Layers, RefreshCw, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, Building2, Eye
} from 'lucide-react';

type ReportTab = 'inventory' | 'transactions' | 'fiscal_monthly' | 'alerts';

// Helper to determine Thai Fiscal Year from a Date object
// Fiscal Year starts Oct 1 (Month 10) of previous calendar year and ends Sep 30 of current year.
function getFiscalYearBE(date: Date): number {
  const yearAD = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const fyAD = month >= 10 ? yearAD + 1 : yearAD;
  return fyAD + 543;
}

const FISCAL_MONTH_ORDER = [
  { monthIndex: 9, name: 'ตุลาคม', shortName: 'ต.ค.', isPrevYear: true },
  { monthIndex: 10, name: 'พฤศจิกายน', shortName: 'พ.ย.', isPrevYear: true },
  { monthIndex: 11, name: 'ธันวาคม', shortName: 'ธ.ค.', isPrevYear: true },
  { monthIndex: 0, name: 'มกราคม', shortName: 'ม.ค.', isPrevYear: false },
  { monthIndex: 1, name: 'กุมภาพันธ์', shortName: 'ก.พ.', isPrevYear: false },
  { monthIndex: 2, name: 'มีนาคม', shortName: 'มี.ค.', isPrevYear: false },
  { monthIndex: 3, name: 'เมษายน', shortName: 'เม.ย.', isPrevYear: false },
  { monthIndex: 4, name: 'พฤษภาคม', shortName: 'พ.ค.', isPrevYear: false },
  { monthIndex: 5, name: 'มิถุนายน', shortName: 'มิ.ย.', isPrevYear: false },
  { monthIndex: 6, name: 'กรกฎาคม', shortName: 'ก.ค.', isPrevYear: false },
  { monthIndex: 7, name: 'สิงหาคม', shortName: 'ส.ค.', isPrevYear: false },
  { monthIndex: 8, name: 'กันยายน', shortName: 'ก.ย.', isPrevYear: false },
];

export function ReportsPage() {
  const { items, transactions } = useInventory();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('fiscal_monthly');
  
  // Filters for inventory tab
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filters for transactions tab
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txDateRange, setTxDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');

  // Filters for Fiscal Year & Monthly summary tab
  const currentFiscalYear = useMemo(() => getFiscalYearBE(new Date()), []);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(currentFiscalYear);
  const [fiscalSubView, setFiscalSubView] = useState<'monthly' | 'items' | 'categories'>('items');
  const [fiscalMonthFilter, setFiscalMonthFilter] = useState<number | 'all'>('all'); // monthIndex 0-11 or 'all'
  const [selectedFiscalCategory, setSelectedFiscalCategory] = useState<string>('all'); // 'all' or categoryId

  // Ward & Hospital metadata for print header
  const [wardName, setWardName] = useState<string>('วอร์ดผู้ป่วยใน (Inpatient Ward)');
  const [reporterName, setReporterName] = useState<string>('พยาบาลประจำวอร์ด');

  // List of available fiscal years from data
  const availableFiscalYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentFiscalYear);
    yearsSet.add(currentFiscalYear - 1);
    yearsSet.add(currentFiscalYear - 2);

    transactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      if (!isNaN(d.getTime())) {
        yearsSet.add(getFiscalYearBE(d));
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentFiscalYear]);

  // Filtered inventory items
  const filteredInventory = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      
      const min = item.minStock ?? 10;
      const max = item.maxStock ?? 100;
      let matchesStatus = true;
      
      if (stockStatusFilter === 'low') {
        matchesStatus = item.quantity > 0 && item.quantity <= min;
      } else if (stockStatusFilter === 'over') {
        matchesStatus = item.quantity > max;
      } else if (stockStatusFilter === 'out') {
        matchesStatus = item.quantity === 0;
      } else if (stockStatusFilter === 'expiring') {
        if (!item.expiryDate) return false;
        const days = getDaysUntilExpiry(item.expiryDate);
        matchesStatus = days <= 90;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, selectedCategory, stockStatusFilter]);

  // Critical alerts items
  const criticalItems = useMemo(() => {
    return items.filter(item => {
      const min = item.minStock ?? 10;
      const isLow = item.quantity <= min;
      const isOver = item.quantity > (item.maxStock ?? 100);
      let isExpiring = false;
      if (item.expiryDate) {
        const days = getDaysUntilExpiry(item.expiryDate);
        isExpiring = days <= 90;
      }
      return isLow || isOver || isExpiring;
    });
  }, [items]);

  // Filtered transactions for standard log
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) {
        return false;
      }

      if (txDateRange !== 'all') {
        const txDate = new Date(tx.timestamp);
        const diffMs = now.getTime() - txDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (txDateRange === 'today' && diffDays > 1) return false;
        if (txDateRange === '7days' && diffDays > 7) return false;
        if (txDateRange === '30days' && diffDays > 30) return false;
      }

      if (txSearchQuery) {
        const item = items.find(i => i.id === tx.itemId);
        const itemName = item?.name || '';
        const match = 
          tx.itemId.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
          itemName.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
          (tx.lotNumber && tx.lotNumber.toLowerCase().includes(txSearchQuery.toLowerCase()));
        if (!match) return false;
      }

      return true;
    });
  }, [transactions, txTypeFilter, txDateRange, txSearchQuery, items]);

  // =========================================================================
  // FISCAL YEAR & MONTHLY AGGREGATIONS (With Warehouse / Category Filtering)
  // =========================================================================
  const fiscalData = useMemo(() => {
    // 1. Transactions belonging to selected fiscal year
    const fyTransactions = transactions.filter(tx => {
      const d = new Date(tx.timestamp);
      return !isNaN(d.getTime()) && getFiscalYearBE(d) === selectedFiscalYear;
    });

    // 2. Filter transactions by warehouse/category if selected
    const categoryFilteredTransactions = selectedFiscalCategory === 'all'
      ? fyTransactions
      : fyTransactions.filter(tx => {
          const item = items.find(i => i.id === tx.itemId);
          return item && item.categoryId === selectedFiscalCategory;
        });

    // 3. 12-Month breakdown for the chosen category/warehouse
    const monthlyStats = FISCAL_MONTH_ORDER.map(fm => {
      const calYearBE = fm.isPrevYear ? selectedFiscalYear - 1 : selectedFiscalYear;
      const calYearAD = calYearBE - 543;

      const txInMonth = categoryFilteredTransactions.filter(tx => {
        const d = new Date(tx.timestamp);
        return d.getFullYear() === calYearAD && d.getMonth() === fm.monthIndex;
      });

      const totalReceive = txInMonth
        .filter(t => t.type === 'RECEIVE')
        .reduce((sum, t) => sum + t.quantity, 0);

      const totalIssue = txInMonth
        .filter(t => t.type === 'ISSUE' || t.type === 'DISPENSE')
        .reduce((sum, t) => sum + t.quantity, 0);

      const net = totalReceive - totalIssue;

      return {
        ...fm,
        calYearBE,
        totalReceive,
        totalIssue,
        net,
        txCount: txInMonth.length,
      };
    });

    const totalYearReceive = monthlyStats.reduce((sum, m) => sum + m.totalReceive, 0);
    const totalYearIssue = monthlyStats.reduce((sum, m) => sum + m.totalIssue, 0);
    const totalYearNet = totalYearReceive - totalYearIssue;
    const totalYearTxCount = monthlyStats.reduce((sum, m) => sum + m.txCount, 0);

    const peakIssueMonth = [...monthlyStats].sort((a, b) => b.totalIssue - a.totalIssue)[0];

    // 4. Target transactions for Item-level view (applying Month filter & Category filter)
    let targetTransactions = categoryFilteredTransactions;
    if (fiscalMonthFilter !== 'all') {
      targetTransactions = categoryFilteredTransactions.filter(tx => {
        const d = new Date(tx.timestamp);
        return d.getMonth() === fiscalMonthFilter;
      });
    }

    const itemStatsMap = new Map<string, { receive: number; issue: number }>();
    targetTransactions.forEach(tx => {
      const curr = itemStatsMap.get(tx.itemId) || { receive: 0, issue: 0 };
      if (tx.type === 'RECEIVE') {
        curr.receive += tx.quantity;
      } else {
        curr.issue += tx.quantity;
      }
      itemStatsMap.set(tx.itemId, curr);
    });

    // Items list filtered by category
    const baseItems = selectedFiscalCategory === 'all'
      ? items
      : items.filter(i => i.categoryId === selectedFiscalCategory);

    const itemStatsList = baseItems.map(item => {
      const stats = itemStatsMap.get(item.id) || { receive: 0, issue: 0 };
      return {
        ...item,
        fiscalReceive: stats.receive,
        fiscalIssue: stats.issue,
        fiscalNet: stats.receive - stats.issue,
      };
    });

    // 5. Category breakdown
    const categoryStats = CATEGORIES.map(cat => {
      const catItems = items.filter(i => i.categoryId === cat.id);
      const catItemIds = new Set(catItems.map(i => i.id));
      
      const catTxs = (fiscalMonthFilter === 'all' ? fyTransactions : fyTransactions.filter(tx => new Date(tx.timestamp).getMonth() === fiscalMonthFilter))
        .filter(t => catItemIds.has(t.itemId));
      
      const receive = catTxs.filter(t => t.type === 'RECEIVE').reduce((s, t) => s + t.quantity, 0);
      const issue = catTxs.filter(t => t.type === 'ISSUE' || t.type === 'DISPENSE').reduce((s, t) => s + t.quantity, 0);

      return {
        ...cat,
        receive,
        issue,
        net: receive - issue,
        totalStock: catItems.reduce((s, i) => s + i.quantity, 0)
      };
    });

    const activeMonthObj = fiscalMonthFilter !== 'all' 
      ? FISCAL_MONTH_ORDER.find(m => m.monthIndex === fiscalMonthFilter)
      : null;

    const activeCategoryObj = selectedFiscalCategory !== 'all'
      ? CATEGORIES.find(c => c.id === selectedFiscalCategory)
      : null;

    return {
      monthlyStats,
      totalYearReceive,
      totalYearIssue,
      totalYearNet,
      totalYearTxCount,
      peakIssueMonth,
      itemStatsList,
      categoryStats,
      txCountInView: targetTransactions.length,
      activeMonthObj,
      activeCategoryObj,
      itemStatsReceiveSum: itemStatsList.reduce((s, i) => s + i.fiscalReceive, 0),
      itemStatsIssueSum: itemStatsList.reduce((s, i) => s + i.fiscalIssue, 0),
      itemStatsStockSum: itemStatsList.reduce((s, i) => s + i.quantity, 0),
    };
  }, [transactions, selectedFiscalYear, fiscalMonthFilter, selectedFiscalCategory, items]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export CSV function (UTF-8 with BOM for Excel compatibility)
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // BOM
    const timestamp = new Date().toISOString().slice(0, 10);
    const catName = fiscalData.activeCategoryObj ? fiscalData.activeCategoryObj.name : 'ทุกคลัง';
    const monthName = fiscalData.activeMonthObj ? fiscalData.activeMonthObj.name : 'ทั้งปีงบประมาณ';

    if (activeTab === 'fiscal_monthly') {
      csvContent += `รายงานสรุปยอดรับ-จ่าย ประจำ${catName} - ${monthName} (ปีงบประมาณ ${selectedFiscalYear})\n`;
      csvContent += `หน่วยงาน/วอร์ด: ${wardName}, ผู้จัดทำ: ${reporterName}, วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}\n\n`;

      if (fiscalSubView === 'monthly') {
        csvContent += 'ลำดับ,เดือน,ปี พ.ศ.,ยอดรับเข้า (IN),ยอดเบิกจ่าย (OUT),ยอดสุทธิ (Net),จำนวนรายการ\n';
        fiscalData.monthlyStats.forEach((m, idx) => {
          csvContent += `${idx + 1},"${m.name}",${m.calYearBE},${m.totalReceive},${m.totalIssue},${m.net},${m.txCount}\n`;
        });
        csvContent += `\nรวมทั้งปีงบประมาณ,,,${fiscalData.totalYearReceive},${fiscalData.totalYearIssue},${fiscalData.totalYearNet},${fiscalData.totalYearTxCount}\n`;
      } else {
        csvContent += 'ลำดับ,รหัสสินค้า,ชื่อยา/เวชภัณฑ์,หมวดหมู่คลัง,รับเข้า (IN),เบิกจ่าย (OUT),ยอดสุทธิ,คงเหลือในคลัง,หน่วย,เกณฑ์ Min-Max,วันหมดอายุ(FEFO)\n';
        fiscalData.itemStatsList.forEach((item, idx) => {
          const cat = CATEGORIES.find(c => c.id === item.categoryId)?.name || item.categoryId;
          const min = item.minStock ?? 10;
          const max = item.maxStock ?? 100;
          csvContent += `${idx + 1},"${item.id}","${item.name}","${cat}",${item.fiscalReceive},${item.fiscalIssue},${item.fiscalNet},${item.quantity},"${item.unit}","${min}-${max}","${item.expiryDate || '-'}"\n`;
        });
        csvContent += `\nรวมทั้งสิ้น,,,,${fiscalData.itemStatsReceiveSum},${fiscalData.itemStatsIssueSum},${fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum},${fiscalData.itemStatsStockSum},ชิ้น,,\n`;
      }

      downloadCSV(csvContent, `SUKJAI_${catName}_${monthName}_FY${selectedFiscalYear}_${timestamp}.csv`);

    } else if (activeTab === 'inventory') {
      csvContent += 'รหัสบาร์โค้ด,ชื่อยา/เวชภัณฑ์,หมวดหมู่,คงเหลือ,หน่วย,Min (ต่ำสุด),Max (สูงสุด),วันหมดอายุ(FEFO),สถานะสต็อก,จำนวน Lot\n';
      filteredInventory.forEach(item => {
        const cat = CATEGORIES.find(c => c.id === item.categoryId)?.name || item.categoryId;
        const min = item.minStock ?? 10;
        const max = item.maxStock ?? 100;
        let status = 'ปกติ';
        if (item.quantity === 0) status = 'หมดสต็อก';
        else if (item.quantity <= min) status = 'สต็อกต่ำ';
        else if (item.quantity > max) status = 'สต็อกเกิน';
        
        const lotCount = item.lots?.length || 1;
        csvContent += `"${item.id}","${item.name}","${cat}",${item.quantity},"${item.unit}",${min},${max},"${item.expiryDate || '-'}","${status}",${lotCount}\n`;
      });
      downloadCSV(csvContent, `SUKJAI_Stock_Report_${timestamp}.csv`);

    } else if (activeTab === 'transactions') {
      csvContent += 'วัน-เวลา,ประเภทรายการ,รหัสสินค้า,ชื่อสินค้า,จำนวน,หน่วย,Lot Number,วันหมดอายุ,ผู้ทำรายการ\n';
      filteredTransactions.forEach(tx => {
        const item = items.find(i => i.id === tx.itemId);
        const itemName = item?.name || tx.itemId;
        const unit = item?.unit || 'ชิ้น';
        const typeLabel = tx.type === 'RECEIVE' ? 'รับเข้า' : 'เบิกจ่าย';
        const formattedDate = new Date(tx.timestamp).toLocaleString('th-TH');

        csvContent += `"${formattedDate}","${typeLabel}","${tx.itemId}","${itemName}",${tx.quantity},"${unit}","${tx.lotNumber || '-'}","${tx.expiryDate || '-'}","${tx.operator || 'เจ้าหน้าที่'}"\n`;
      });
      downloadCSV(csvContent, `SUKJAI_Transaction_Report_${timestamp}.csv`);

    } else {
      csvContent += 'รหัสบาร์โค้ด,ชื่อยา/เวชภัณฑ์,หมวดหมู่,คงเหลือ,หน่วย,Min,Max,วันหมดอายุ,สาเหตุการเตือน\n';
      criticalItems.forEach(item => {
        const cat = CATEGORIES.find(c => c.id === item.categoryId)?.name || item.categoryId;
        const min = item.minStock ?? 10;
        const max = item.maxStock ?? 100;
        let reason = [];
        if (item.quantity === 0) reason.push('สินค้าหมด');
        else if (item.quantity <= min) reason.push(`สต็อกต่ำ (เหลือ ${item.quantity} <= ${min})`);
        else if (item.quantity > max) reason.push(`สต็อกเกิน (มี ${item.quantity} > ${max})`);
        
        if (item.expiryDate) {
          const days = getDaysUntilExpiry(item.expiryDate);
          if (days <= 0) reason.push('หมดอายุแล้ว');
          else if (days <= 90) reason.push(`ใกล้หมดอายุ (อีก ${days} วัน)`);
        }

        csvContent += `"${item.id}","${item.name}","${cat}",${item.quantity},"${item.unit}",${min},${max},"${item.expiryDate || '-'}","${reason.join('; ')}"\n`;
      });
      downloadCSV(csvContent, `SUKJAI_Critical_Alerts_${timestamp}.csv`);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* ========================================================================= */}
      {/* SCREEN VIEW ONLY (Hidden when printing)                                  */}
      {/* ========================================================================= */}
      <div className="print:hidden space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <FileText size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Hospital Inventory Reports</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายงานและพิมพ์เอกสารคลังวอร์ด</h1>
            <p className="text-sm text-slate-500 mt-1">
              พิมพ์รายงานสรุปรับ-จ่ายแยกรายเดือน, แยกรายคลัง (ยา, เวชภัณฑ์, น้ำเกลือ), และรายงานประจำปีงบประมาณ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-sm transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              <span>ส่งออก Excel (CSV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-200 active:scale-95 cursor-pointer"
            >
              <Printer size={18} />
              <span>พิมพ์รายงาน (Print A4)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('fiscal_monthly')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'fiscal_monthly'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100'
            }`}
          >
            <BarChart3 size={17} />
            <span>🌟 สรุปรับ-จ่าย (รายเดือน / แยกแต่ละคลัง)</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package size={16} />
            <span>รายงานสต็อกคงคลัง ({filteredInventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock size={16} />
            <span>ประวัติการเบิก-จ่าย-รับเข้า ({filteredTransactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'alerts'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle size={16} />
            <span>ยาใกล้หมดอายุ & สต็อกวิกฤต ({criticalItems.length})</span>
          </button>
        </div>

        {/* Header Metadata Settings for Print Output */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">ชื่อหน่วยงาน/วอร์ด:</span>
              <input
                type="text"
                value={wardName}
                onChange={e => setWardName(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">ชื่อผู้พิมพ์รายงาน:</span>
              <input
                type="text"
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
              />
            </div>
          </div>
          <span className="text-slate-400 italic">
            * ข้อมูลส่วนนี้จะปรากฏที่หัวกระดาษและท้ายกระดาษเมื่อกดสั่งพิมพ์ A4
          </span>
        </div>

        {/* ========================================================================= */}
        {/* TAB: FISCAL YEAR & MONTHLY IN/OUT SUMMARY                                 */}
        {/* ========================================================================= */}
        {activeTab === 'fiscal_monthly' && (
          <div className="space-y-6">
            
            {/* Filter Bar: 1. Choose Warehouse, 2. Choose Month, 3. Choose Fiscal Year */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={14} className="text-indigo-600" />
                  <span>ตัวกรองสำหรับออกรายงานและพิมพ์เอกสาร</span>
                </span>
                <span className="text-xs text-indigo-600 font-bold">
                  กำลังเลือก: {fiscalData.activeCategoryObj?.name || 'ทุกคลัง'} • {fiscalData.activeMonthObj?.name || 'ทั้งปีงบประมาณ'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Warehouse / Category Selector */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    <span>1. เลือกคลังสินค้า (แยกตามคลัง):</span>
                  </label>
                  <select
                    value={selectedFiscalCategory}
                    onChange={e => setSelectedFiscalCategory(e.target.value)}
                    className="w-full bg-white text-slate-800 font-bold text-xs rounded-lg p-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">📦 ทุกคลังรวมกัน (All Warehouses)</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Month Selector */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-600" />
                    <span>2. เลือกเดือนที่ต้องการสรุป:</span>
                  </label>
                  <select
                    value={fiscalMonthFilter}
                    onChange={e => setFiscalMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full bg-white text-slate-800 font-bold text-xs rounded-lg p-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">🗓️ ทั้งปีงบประมาณ (12 เดือน)</option>
                    {FISCAL_MONTH_ORDER.map(m => (
                      <option key={m.monthIndex} value={m.monthIndex}>
                        {m.name} ({m.isPrevYear ? selectedFiscalYear - 1 : selectedFiscalYear})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Fiscal Year Selector */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-600" />
                    <span>3. เลือกปีงบประมาณ:</span>
                  </label>
                  <select
                    value={selectedFiscalYear}
                    onChange={e => setSelectedFiscalYear(Number(e.target.value))}
                    className="w-full bg-white text-slate-800 font-bold text-xs rounded-lg p-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {availableFiscalYears.map(year => (
                      <option key={year} value={year}>
                        ปีงบประมาณ {year} (1 ต.ค. {year - 1} - 30 ก.ย. {year})
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
                  <button
                    onClick={() => setFiscalSubView('items')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      fiscalSubView === 'items' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    แจกแจงรายตัวยา/เวชภัณฑ์ ({fiscalData.itemStatsList.length} รายการ)
                  </button>
                  <button
                    onClick={() => setFiscalSubView('monthly')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      fiscalSubView === 'monthly' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    สรุป 12 เดือนของคลังนี้
                  </button>
                  <button
                    onClick={() => setFiscalSubView('categories')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      fiscalSubView === 'categories' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    เปรียบเทียบทุกคลัง
                  </button>
                </div>

                <span className="text-xs text-slate-500">
                  ทำรายการทั้งหมด <strong>{fiscalData.txCountInView}</strong> ครั้ง
                </span>
              </div>
            </div>

            {/* Current Selection Header & KPI Badges */}
            <div className="bg-indigo-50/60 border border-indigo-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 block uppercase">รายงานสรุปผลการดำเนินงาน</span>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>{fiscalData.activeCategoryObj ? fiscalData.activeCategoryObj.name : 'สรุปรวมทุกคลัง'}</span>
                  <span>•</span>
                  <span className="text-indigo-700">
                    {fiscalData.activeMonthObj 
                      ? `ประจำเดือน ${fiscalData.activeMonthObj.name} (ปีงบ ${selectedFiscalYear})` 
                      : `ประจำปีงบประมาณ ${selectedFiscalYear}`}
                  </span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-white border border-emerald-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">รับเข้า (IN)</span>
                  <span className="font-black text-emerald-700 text-sm">+{fiscalData.itemStatsReceiveSum.toLocaleString()} ชิ้น</span>
                </div>
                <div className="bg-white border border-rose-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">เบิกจ่าย (OUT)</span>
                  <span className="font-black text-rose-700 text-sm">-{fiscalData.itemStatsIssueSum.toLocaleString()} ชิ้น</span>
                </div>
                <div className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">สุทธิ (Net)</span>
                  <span className="font-black text-indigo-700 text-sm">
                    {fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum >= 0 ? '+' : ''}
                    {(fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum).toLocaleString()} ชิ้น
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">คงเหลือในคลัง</span>
                  <span className="font-black text-slate-900 text-sm">{fiscalData.itemStatsStockSum.toLocaleString()} ชิ้น</span>
                </div>
              </div>
            </div>

            {/* SubView 1: Itemized List for this Warehouse & Month */}
            {fiscalSubView === 'items' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                        <th className="py-3 px-4">รหัสสินค้า</th>
                        <th className="py-3 px-4">ชื่อยา / เวชภัณฑ์</th>
                        <th className="py-3 px-4">คลังสินค้า</th>
                        <th className="py-3 px-4 text-center">เกณฑ์ Min-Max</th>
                        <th className="py-3 px-4 text-center">วันหมดอายุ (FEFO)</th>
                        <th className="py-3 px-4 text-right text-emerald-700">รับเข้า (IN)</th>
                        <th className="py-3 px-4 text-right text-rose-700">เบิกจ่าย (OUT)</th>
                        <th className="py-3 px-4 text-right">ยอดสุทธิ (Net)</th>
                        <th className="py-3 px-4 text-right">คงเหลือปัจจุบัน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fiscalData.itemStatsList.map((item, idx) => {
                        const cat = CATEGORIES.find(c => c.id === item.categoryId);
                        const min = item.minStock ?? 10;
                        const max = item.maxStock ?? 100;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-600">{item.id}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                            <td className="py-3 px-4 text-slate-600">{cat?.name || item.categoryId}</td>
                            <td className="py-3 px-4 text-center text-slate-500 font-mono">{min} - {max}</td>
                            <td className="py-3 px-4 text-center font-mono">
                              {item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                              {item.fiscalReceive > 0 ? `+${item.fiscalReceive.toLocaleString()}` : '0'}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-rose-600 font-mono">
                              {item.fiscalIssue > 0 ? `-${item.fiscalIssue.toLocaleString()}` : '0'}
                            </td>
                            <td className="py-3 px-4 text-right font-black font-mono">
                              <span className={item.fiscalNet > 0 ? 'text-indigo-600' : item.fiscalNet < 0 ? 'text-amber-600' : 'text-slate-400'}>
                                {item.fiscalNet > 0 ? `+${item.fiscalNet.toLocaleString()}` : item.fiscalNet.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900">
                              {item.quantity} <span className="text-slate-400 font-normal">{item.unit}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-black text-slate-900">
                        <td colSpan={6} className="py-3 px-4 text-center">
                          รวมทั้งสิ้น ({fiscalData.activeCategoryObj?.name || 'ทุกคลัง'} • {fiscalData.activeMonthObj?.name || 'ทั้งปีงบประมาณ'})
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-mono">
                          +{fiscalData.itemStatsReceiveSum.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-700 font-mono">
                          -{fiscalData.itemStatsIssueSum.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum >= 0 ? '+' : ''}
                          {(fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-indigo-700">
                          {fiscalData.itemStatsStockSum.toLocaleString()} ชิ้น
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SubView 2: 12-Month Breakdown for Selected Warehouse */}
            {fiscalSubView === 'monthly' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600" />
                    <span>ตารางสรุป 12 เดือน ประจำ{fiscalData.activeCategoryObj?.name || 'ทุกคลัง'} (ปีงบ {selectedFiscalYear})</span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                        <th className="py-3 px-4">เดือน (ปีงบประมาณ)</th>
                        <th className="py-3 px-4 text-center">ปี พ.ศ.</th>
                        <th className="py-3 px-4 text-right text-emerald-700">รับเข้า (IN)</th>
                        <th className="py-3 px-4 text-right text-rose-700">เบิกจ่าย (OUT)</th>
                        <th className="py-3 px-4 text-right">ยอดสุทธิ (Net)</th>
                        <th className="py-3 px-4 text-center">รายการ</th>
                        <th className="py-3 px-4">สัดส่วน รับเข้า vs เบิกจ่าย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fiscalData.monthlyStats.map((m, idx) => {
                        const totalActivity = m.totalReceive + m.totalIssue;
                        const receivePct = totalActivity > 0 ? (m.totalReceive / totalActivity) * 100 : 50;
                        const issuePct = totalActivity > 0 ? (m.totalIssue / totalActivity) * 100 : 50;

                        return (
                          <tr key={m.monthIndex} className="hover:bg-slate-50/75 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {m.name}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-500">
                              {m.calYearBE}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                              {m.totalReceive > 0 ? `+${m.totalReceive.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-rose-600 font-mono">
                              {m.totalIssue > 0 ? `-${m.totalIssue.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-black font-mono">
                              <span className={m.net > 0 ? 'text-indigo-600' : m.net < 0 ? 'text-amber-600' : 'text-slate-400'}>
                                {m.net > 0 ? `+${m.net.toLocaleString()}` : m.net < 0 ? m.net.toLocaleString() : '0'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-500">
                              {m.txCount} ครั้ง
                            </td>
                            <td className="py-3 px-4">
                              {totalActivity > 0 ? (
                                <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden max-w-xs">
                                  <div style={{ width: `${receivePct}%` }} className="bg-emerald-500" title={`รับเข้า: ${m.totalReceive}`} />
                                  <div style={{ width: `${issuePct}%` }} className="bg-rose-500" title={`เบิกจ่าย: ${m.totalIssue}`} />
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">ไม่มีความเคลื่อนไหว</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-black text-slate-900">
                        <td colSpan={3} className="py-3 px-4 text-center">รวมทั้งสิ้น ({fiscalData.activeCategoryObj?.name || 'ทุกคลัง'})</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-mono">
                          +{fiscalData.totalYearReceive.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-700 font-mono">
                          -{fiscalData.totalYearIssue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {fiscalData.totalYearNet >= 0 ? `+${fiscalData.totalYearNet.toLocaleString()}` : fiscalData.totalYearNet.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{fiscalData.totalYearTxCount} ครั้ง</td>
                        <td className="py-3 px-4 text-[11px] text-slate-500 font-bold">12 เดือนครบถ้วน</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SubView 3: Categories Comparison */}
            {fiscalSubView === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fiscalData.categoryStats.map(cat => (
                  <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${cat.bgColor} ${cat.color}`}>
                          <Layers size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{cat.name}</h4>
                          <span className="text-xs text-slate-400">คงเหลือในคลังปัจจุบัน: {cat.totalStock.toLocaleString()} ชิ้น</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedFiscalCategory(cat.id);
                          setFiscalSubView('items');
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        ดูเฉพาะคลังนี้
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">รับเข้ารวม</span>
                        <span className="font-black text-emerald-600 text-sm">+{cat.receive.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">เบิกจ่ายรวม</span>
                        <span className="font-black text-rose-600 text-sm">-{cat.issue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">สุทธิ (Net)</span>
                        <span className={`font-black text-sm ${cat.net >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {cat.net > 0 ? `+${cat.net.toLocaleString()}` : cat.net.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: INVENTORY REPORT FILTERS & PREVIEW                                 */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อยา, รหัสบาร์โค้ด..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={e => setStockStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกสถานะสต็อก</option>
                  <option value="low">เฉพาะสต็อกต่ำ (≤ Min)</option>
                  <option value="over">เฉพาะสต็อกเกิน (&gt; Max)</option>
                  <option value="out">เฉพาะสินค้าหมด (0)</option>
                  <option value="expiring">เฉพาะยาใกล้หมดอายุ (&lt; 90 วัน)</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                พบทั้งหมด <strong className="text-slate-900">{filteredInventory.length}</strong> รายการ
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                      <th className="py-3 px-4">รหัสบาร์โค้ด</th>
                      <th className="py-3 px-4">ชื่อยา / เวชภัณฑ์</th>
                      <th className="py-3 px-4">หมวดหมู่</th>
                      <th className="py-3 px-4 text-center">เกณฑ์ Min-Max</th>
                      <th className="py-3 px-4 text-center">วันหมดอายุ (FEFO)</th>
                      <th className="py-3 px-4 text-right">ยอดคงเหลือ</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((item, index) => {
                      const cat = CATEGORIES.find(c => c.id === item.categoryId);
                      const min = item.minStock ?? 10;
                      const max = item.maxStock ?? 100;
                      
                      let statusBadge = { label: 'ปกติ', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                      if (item.quantity === 0) {
                        statusBadge = { label: 'สินค้าหมด', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
                      } else if (item.quantity <= min) {
                        statusBadge = { label: 'สต็อกต่ำ', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
                      } else if (item.quantity > max) {
                        statusBadge = { label: 'สต็อกเกิน', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{item.id}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {item.name}
                            {item.lots && item.lots.length > 1 && (
                              <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                {item.lots.length} Lots
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{cat?.name || item.categoryId}</td>
                          <td className="py-3 px-4 text-center text-slate-500 font-mono">
                            {min} - {max}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-extrabold text-sm text-slate-900">{item.quantity}</span>{' '}
                            <span className="text-slate-400">{item.unit}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TRANSACTIONS REPORT FILTERS & PREVIEW                              */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อยา, รหัสบาร์โค้ด..."
                    value={txSearchQuery}
                    onChange={e => setTxSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={txTypeFilter}
                  onChange={e => setTxTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกประเภทรายการ</option>
                  <option value="ISSUE">เฉพาะการเบิกจ่าย (ออก)</option>
                  <option value="RECEIVE">เฉพาะการรับเข้า (เข้า)</option>
                </select>

                <select
                  value={txDateRange}
                  onChange={e => setTxDateRange(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="today">เฉพาะวันนี้</option>
                  <option value="7days">7 วันล่าสุด</option>
                  <option value="30days">30 วันล่าสุด</option>
                  <option value="all">ประวัติทั้งหมด</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                พบทั้งหมด <strong className="text-slate-900">{filteredTransactions.length}</strong> รายการ
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                      <th className="py-3 px-4">วัน-เวลา</th>
                      <th className="py-3 px-4 text-center">ประเภท</th>
                      <th className="py-3 px-4">รหัส / ชื่อยา</th>
                      <th className="py-3 px-4 text-center">Lot Number</th>
                      <th className="py-3 px-4 text-right">จำนวน</th>
                      <th className="py-3 px-4 text-center">ผู้ทำรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx, index) => {
                      const item = items.find(i => i.id === tx.itemId);
                      const isReceive = tx.type === 'RECEIVE';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {new Date(tx.timestamp).toLocaleString('th-TH', { 
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isReceive 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isReceive ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              {isReceive ? 'รับเข้า' : 'เบิกจ่าย'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800">{item?.name || tx.itemId}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{tx.itemId}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {tx.lotNumber || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-black text-sm ${isReceive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isReceive ? '+' : '-'}{tx.quantity}
                            </span>{' '}
                            <span className="text-slate-400">{item?.unit || 'ชิ้น'}</span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500">
                            {tx.operator || 'เจ้าหน้าที่วอร์ด'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CRITICAL ALERTS & EXPIRY WARNING REPORT                            */}
        {/* ========================================================================= */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">ใบแจ้งเตือนรายการยาและเวชภัณฑ์วิกฤต</h4>
                  <p className="text-rose-700 mt-0.5">
                    รวมรายการยาที่สต็อกต่ำกว่าเกณฑ์ Min, เกิน Max, หรือมีวันหมดอายุใกล้ถึงกำหนดภายใน 90 วัน
                  </p>
                </div>
              </div>
              <span className="bg-rose-600 text-white font-extrabold px-3 py-1 rounded-xl text-xs">
                วิกฤต {criticalItems.length} รายการ
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                      <th className="py-3 px-4">รหัสบาร์โค้ด</th>
                      <th className="py-3 px-4">ชื่อยา / เวชภัณฑ์</th>
                      <th className="py-3 px-4 text-center">คงเหลือ / เกณฑ์ Min</th>
                      <th className="py-3 px-4 text-center">วันหมดอายุ (FEFO)</th>
                      <th className="py-3 px-4">ข้อตรวจพบ / สาเหตุเตือน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criticalItems.map((item, index) => {
                      const min = item.minStock ?? 10;
                      const max = item.maxStock ?? 100;
                      
                      const alerts = [];
                      if (item.quantity === 0) {
                        alerts.push({ text: 'ยาหมดสต็อก (0)', type: 'danger' });
                      } else if (item.quantity <= min) {
                        alerts.push({ text: `สต็อกต่ำกว่าเกณฑ์ Min (${item.quantity} <= ${min})`, type: 'warning' });
                      } else if (item.quantity > max) {
                        alerts.push({ text: `สต็อกเกินเกณฑ์ Max (${item.quantity} > ${max})`, type: 'info' });
                      }

                      if (item.expiryDate) {
                        const days = getDaysUntilExpiry(item.expiryDate);
                        if (days <= 0) {
                          alerts.push({ text: 'ยาหมดอายุแล้ว!', type: 'danger' });
                        } else if (days <= 90) {
                          alerts.push({ text: `ใกล้หมดอายุ (เหลืออีก ${days} วัน)`, type: 'warning' });
                        }
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{item.id}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                          <td className="py-3 px-4 text-center">
                            <strong className="text-slate-900">{item.quantity}</strong> / Min {min} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            {alerts.map((al, idx) => (
                              <span 
                                key={idx} 
                                className={`inline-block mr-1.5 px-2 py-0.5 rounded font-bold text-[10px] ${
                                  al.type === 'danger' ? 'bg-rose-100 text-rose-800' :
                                  al.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                                  'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {al.text}
                              </span>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>


      {/* ========================================================================= */}
      {/* PRINT-ONLY FORM LAYOUT (Rendered exclusively when window.print() is fired) */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-slate-900 font-sans p-6 text-sm">
        
        {/* Hospital & Ward Print Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center relative">
          <h2 className="text-xl font-black uppercase tracking-wide">
            โรงพยาบาล / ระบบบริหารจัดการคลังยา SUKJAI Hub
          </h2>
          <h3 className="text-base font-bold mt-1 text-slate-800">
            {activeTab === 'fiscal_monthly' && (
              <span>
                ใบรายงานสรุปยอดรับ-จ่าย ประจำ{fiscalData.activeCategoryObj?.name || 'ทุกคลัง'}
                {fiscalData.activeMonthObj 
                  ? ` (ประจำเดือน ${fiscalData.activeMonthObj.name})` 
                  : ` (ประจำปีงบประมาณ ${selectedFiscalYear})`}
              </span>
            )}
            {activeTab === 'inventory' && 'ใบรายงานสรุปยอดสต็อกยาและเวชภัณฑ์คงคลังประจำวอร์ด'}
            {activeTab === 'transactions' && 'ใบรายงานประวัติการเบิก-จ่าย-รับเข้าคลังยา'}
            {activeTab === 'alerts' && 'ใบแจ้งเตือนรายการยาใกล้หมดอายุและสต็อกวิกฤต'}
          </h3>
          <div className="flex justify-between items-center text-xs mt-3 text-slate-600 font-medium">
            <span><strong>หน่วยงาน / วอร์ด:</strong> {wardName}</span>
            {activeTab === 'fiscal_monthly' && (
              <span>
                <strong>คลังสินค้า:</strong> {fiscalData.activeCategoryObj?.name || 'ทุกคลัง'} | 
                <strong> ปีงบประมาณ:</strong> {selectedFiscalYear}
              </span>
            )}
            <span><strong>วันที่พิมพ์:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</span>
          </div>
        </div>

        {/* Print Content for Fiscal Year & Monthly Summary */}
        {activeTab === 'fiscal_monthly' && (
          <div className="space-y-4 mt-4">
            
            {/* Summary KPI Badges on Print */}
            <div className="grid grid-cols-4 gap-2 text-center border border-slate-400 p-2.5 bg-slate-50 text-xs">
              <div>
                <span className="block font-bold text-slate-600">รับเข้ารวม (IN):</span>
                <span className="text-sm font-black text-emerald-800">+{fiscalData.itemStatsReceiveSum.toLocaleString()} ชิ้น</span>
              </div>
              <div>
                <span className="block font-bold text-slate-600">เบิกจ่ายรวม (OUT):</span>
                <span className="text-sm font-black text-rose-800">-{fiscalData.itemStatsIssueSum.toLocaleString()} ชิ้น</span>
              </div>
              <div>
                <span className="block font-bold text-slate-600">ยอดสุทธิ (Net):</span>
                <span className="text-sm font-black text-slate-900">
                  {fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum >= 0 ? '+' : ''}
                  {(fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum).toLocaleString()} ชิ้น
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-600">คงเหลือในคลัง:</span>
                <span className="text-sm font-black text-slate-900">{fiscalData.itemStatsStockSum.toLocaleString()} ชิ้น</span>
              </div>
            </div>

            {/* If items view, print itemized table */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                  <th className="border border-slate-300 p-1.5 text-center w-8">ลำดับ</th>
                  <th className="border border-slate-300 p-1.5 text-left">รหัสสินค้า</th>
                  <th className="border border-slate-300 p-1.5 text-left">ชื่อยา / เวชภัณฑ์</th>
                  <th className="border border-slate-300 p-1.5 text-left">หมวดหมู่</th>
                  <th className="border border-slate-300 p-1.5 text-center">Min-Max</th>
                  <th className="border border-slate-300 p-1.5 text-center">วันหมดอายุ</th>
                  <th className="border border-slate-300 p-1.5 text-right">รับเข้า (IN)</th>
                  <th className="border border-slate-300 p-1.5 text-right">เบิกจ่าย (OUT)</th>
                  <th className="border border-slate-300 p-1.5 text-right">สุทธิ</th>
                  <th className="border border-slate-300 p-1.5 text-right">คงเหลือ</th>
                  <th className="border border-slate-300 p-1.5 text-center">หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {fiscalData.itemStatsList.map((item, idx) => {
                  const cat = CATEGORIES.find(c => c.id === item.categoryId);
                  const min = item.minStock ?? 10;
                  const max = item.maxStock ?? 100;
                  return (
                    <tr key={item.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5 font-mono font-bold">{item.id}</td>
                      <td className="border border-slate-300 p-1.5 font-bold">{item.name}</td>
                      <td className="border border-slate-300 p-1.5">{cat?.name || item.categoryId}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{min} - {max}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold">
                        {item.fiscalReceive > 0 ? `+${item.fiscalReceive.toLocaleString()}` : '0'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold">
                        {item.fiscalIssue > 0 ? `-${item.fiscalIssue.toLocaleString()}` : '0'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold">
                        {item.fiscalNet > 0 ? `+${item.fiscalNet.toLocaleString()}` : item.fiscalNet.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-black">{item.quantity}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{item.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold">
                  <td colSpan={6} className="border border-slate-300 p-1.5 text-center">รวมทั้งสิ้น</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">+{fiscalData.itemStatsReceiveSum.toLocaleString()}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">-{fiscalData.itemStatsIssueSum.toLocaleString()}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">
                    {fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum >= 0 ? '+' : ''}
                    {(fiscalData.itemStatsReceiveSum - fiscalData.itemStatsIssueSum).toLocaleString()}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">{fiscalData.itemStatsStockSum.toLocaleString()}</td>
                  <td className="border border-slate-300 p-1.5 text-center">ชิ้น</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Print Table Body for Inventory */}
        {activeTab === 'inventory' && (
          <table className="w-full border-collapse border border-slate-400 text-xs mt-4">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                <th className="border border-slate-300 p-2 text-center w-10">ลำดับ</th>
                <th className="border border-slate-300 p-2 text-left">รหัสสินค้า</th>
                <th className="border border-slate-300 p-2 text-left">ชื่อยา / เวชภัณฑ์</th>
                <th className="border border-slate-300 p-2 text-left">หมวดหมู่</th>
                <th className="border border-slate-300 p-2 text-center">Min-Max</th>
                <th className="border border-slate-300 p-2 text-center">วันหมดอายุ (FEFO)</th>
                <th className="border border-slate-300 p-2 text-right">คงเหลือ</th>
                <th className="border border-slate-300 p-2 text-center">หน่วย</th>
                <th className="border border-slate-300 p-2 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, idx) => {
                const cat = CATEGORIES.find(c => c.id === item.categoryId);
                const min = item.minStock ?? 10;
                const max = item.maxStock ?? 100;
                let status = 'ปกติ';
                if (item.quantity === 0) status = 'สินค้าหมด';
                else if (item.quantity <= min) status = 'สต็อกต่ำ';
                else if (item.quantity > max) status = 'สต็อกเกิน';

                return (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold">{item.id}</td>
                    <td className="border border-slate-300 p-2 font-bold">{item.name}</td>
                    <td className="border border-slate-300 p-2">{cat?.name || item.categoryId}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{min} - {max}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}</td>
                    <td className="border border-slate-300 p-2 text-right font-bold">{item.quantity}</td>
                    <td className="border border-slate-300 p-2 text-center">{item.unit}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Print Table Body for Transactions */}
        {activeTab === 'transactions' && (
          <table className="w-full border-collapse border border-slate-400 text-xs mt-4">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                <th className="border border-slate-300 p-2 text-center w-10">ลำดับ</th>
                <th className="border border-slate-300 p-2 text-left">วัน-เวลา</th>
                <th className="border border-slate-300 p-2 text-center">ประเภท</th>
                <th className="border border-slate-300 p-2 text-left">รหัส / ชื่อยา</th>
                <th className="border border-slate-300 p-2 text-center">Lot Number</th>
                <th className="border border-slate-300 p-2 text-right">จำนวน</th>
                <th className="border border-slate-300 p-2 text-center">ผู้ทำรายการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx, idx) => {
                const item = items.find(i => i.id === tx.itemId);
                const isReceive = tx.type === 'RECEIVE';
                return (
                  <tr key={tx.id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-mono">
                      {new Date(tx.timestamp).toLocaleString('th-TH')}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-bold">
                      {isReceive ? 'รับเข้า' : 'เบิกจ่าย'}
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-bold">{item?.name || tx.itemId}</div>
                      <div className="font-mono text-[10px] text-slate-500">{tx.itemId}</div>
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{tx.lotNumber || '-'}</td>
                    <td className="border border-slate-300 p-2 text-right font-bold">
                      {isReceive ? '+' : '-'}{tx.quantity} {item?.unit || 'ชิ้น'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">{tx.operator || 'เจ้าหน้าที่'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Print Table Body for Alerts */}
        {activeTab === 'alerts' && (
          <table className="w-full border-collapse border border-slate-400 text-xs mt-4">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                <th className="border border-slate-300 p-2 text-center w-10">ลำดับ</th>
                <th className="border border-slate-300 p-2 text-left">รหัสสินค้า</th>
                <th className="border border-slate-300 p-2 text-left">ชื่อยา / เวชภัณฑ์</th>
                <th className="border border-slate-300 p-2 text-center">คงเหลือ / Min</th>
                <th className="border border-slate-300 p-2 text-center">วันหมดอายุ</th>
                <th className="border border-slate-300 p-2 text-left">สาเหตุการแจ้งเตือน</th>
              </tr>
            </thead>
            <tbody>
              {criticalItems.map((item, idx) => {
                const min = item.minStock ?? 10;
                const reasons = [];
                if (item.quantity === 0) reasons.push('สินค้าหมดสต็อก');
                else if (item.quantity <= min) reasons.push(`ต่ำกว่าเกณฑ์ Min (${item.quantity} <= ${min})`);
                if (item.expiryDate) {
                  const days = getDaysUntilExpiry(item.expiryDate);
                  if (days <= 0) reasons.push('หมดอายุแล้ว');
                  else if (days <= 90) reason.push(`ใกล้หมดอายุ (อีก ${days} วัน)`);
                }

                return (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold">{item.id}</td>
                    <td className="border border-slate-300 p-2 font-bold">{item.name}</td>
                    <td className="border border-slate-300 p-2 text-center">{item.quantity} / {min} {item.unit}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}</td>
                    <td className="border border-slate-300 p-2 font-bold text-rose-900">{reasons.join(', ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Print Footer / Signature Section */}
        <div className="mt-12 pt-6 flex justify-between items-end text-xs text-slate-800">
          <div className="text-center w-60">
            <div className="border-b border-slate-400 pb-1 mb-2"></div>
            <p className="font-bold">ลงชื่อ ({reporterName})</p>
            <p className="text-slate-500">ผู้จัดทำรายงาน / เจ้าหน้าที่บันทึก</p>
          </div>

          <div className="text-center w-60">
            <div className="border-b border-slate-400 pb-1 mb-2"></div>
            <p className="font-bold">ลงชื่อ (....................................................)</p>
            <p className="text-slate-500">หัวหน้าหอผู้ป่วย / ผู้ตรวจสอบรายงาน</p>
          </div>
        </div>

      </div>

    </div>
  );
}
