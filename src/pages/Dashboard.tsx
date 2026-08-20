import React from 'react';
import { useInventory } from '../lib/store';
import { CATEGORIES } from '../lib/constants';
import { ArrowRight, PackageOpen, AlertCircle } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { items, transactions } = useInventory();

  // Summary per category
  const summary = CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.categoryId === cat.id);
    const totalQty = catItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const lowStockCount = catItems.filter(i => i.quantity < 10).length;
    return { ...cat, totalQty, lowStockCount, count: catItems.length };
  });

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pt-6 md:pt-10">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">ภาพรวมคลังสินค้า</h1>
        <p className="text-slate-500 mt-2 text-base md:text-lg">สรุปยอดสิ่งของ ยา และเวชภัณฑ์ทั้งหมดในแผนก</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {summary.map(cat => (
          <div 
            key={cat.id} 
            className={`rounded-3xl p-6 border transition-all hover:shadow-lg cursor-pointer ${cat.bgColor} ${cat.borderColor} group`}
            onClick={() => onNavigate(`category_${cat.id}`)}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className={`font-bold text-xl ${cat.color}`}>{cat.name}</h3>
                <p className="text-slate-600 text-sm mt-1">{cat.count} รายการ</p>
              </div>
              <div className={`p-3 rounded-2xl bg-white/60 shadow-sm ${cat.color}`}>
                <PackageOpen size={24} />
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-extrabold text-slate-800">{cat.totalQty.toLocaleString()}</div>
                <div className="text-sm font-medium text-slate-500 mt-1">ชิ้น/หน่วย</div>
              </div>
              <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                <span className={`text-sm font-bold ${cat.color}`}>ดูรายละเอียด</span>
                <ArrowRight size={16} className={cat.color} />
              </div>
            </div>

            {cat.lowStockCount > 0 && (
              <div className="mt-4 pt-4 border-t border-white/40 flex items-center gap-2 text-rose-500 text-sm font-bold">
                <AlertCircle size={16} />
                <span>มีรายการใกล้หมด ({cat.lowStockCount})</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">ความเคลื่อนไหวล่าสุด</h2>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {recentTransactions.map(tx => {
                const item = items.find(i => i.id === tx.itemId);
                return (
                  <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                        tx.type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {tx.type === 'RECEIVE' ? '+' : '-'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-lg truncate" title={item?.name || `Unknown (${tx.itemId})`}>
                          {item?.name || `Unknown (${tx.itemId})`}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{tx.type === 'RECEIVE' ? 'รับเข้าคลัง' : 'เบิกจ่ายออก'}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>{new Date(tx.timestamp).toLocaleString('th-TH', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className={`text-xl font-black ${tx.type === 'RECEIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'RECEIVE' ? '+' : '-'}{tx.quantity} {item?.unit || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p>ยังไม่มีความเคลื่อนไหวใดๆ</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
