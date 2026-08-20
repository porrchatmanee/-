const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

const target = `{dbError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 flex items-center justify-between text-rose-900 text-xs md:text-sm font-bold z-50 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 max-w-[85%]">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span className="leading-relaxed">⚠️ ขัดข้องเกี่ยวกับการบันทึกออนไลน์: {dbError}</span>
            </div>
            <button
              onClick={clearDbError}
              className="p-1 px-2.5 rounded-xl text-rose-500 font-extrabold text-xs bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
            >
              ปิดการแจ้งเตือน
            </button>
          </div>
        )}`;

const replacement = `{dbError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 flex flex-wrap items-center justify-between text-rose-900 text-xs md:text-sm font-bold z-50 shadow-sm animate-fade-in gap-3">
            <div className="flex items-center gap-2.5 max-w-[85%]">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span className="leading-relaxed">⚠️ ขัดข้องเกี่ยวกับการบันทึกออนไลน์: {dbError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xs bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCcw size={14} />
                อัปเดตระบบเพื่อแก้ไข
              </button>
              <button
                onClick={clearDbError}
                className="p-1 px-2.5 rounded-xl text-rose-500 font-extrabold text-xs bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Layout.tsx', code);
