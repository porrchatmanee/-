import React from 'react';
import { 
  Stethoscope, Pill, Droplets, Sparkles, Laptop, 
  TestTubes, Heart, ShieldCheck, CheckCircle2, 
  AlertCircle, AlertTriangle, XCircle, Package, 
  Flame, Boxes, Sparkle, Tag, Star, Smile, Zap,
  TrendingDown, TrendingUp, Clock, HelpCircle,
  FileSpreadsheet, ArrowLeftRight, Eye, Lock
} from 'lucide-react';

export interface CategoryVisualMeta {
  emoji: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  bgGradient: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  cuteTag: string;
}

export const CATEGORY_VISUALS: Record<string, CategoryVisualMeta> = {
  medical: {
    emoji: '🩺',
    icon: Stethoscope,
    accentColor: 'text-rose-500',
    bgGradient: 'from-rose-500/10 via-pink-500/5 to-rose-500/10',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-600',
    borderColor: 'border-rose-200',
    cuteTag: 'เวชภัณฑ์พร้อมดูแล 🩺',
  },
  medicine: {
    emoji: '💊',
    icon: Pill,
    accentColor: 'text-sky-500',
    bgGradient: 'from-sky-500/10 via-blue-500/5 to-cyan-500/10',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-600',
    borderColor: 'border-sky-200',
    cuteTag: 'คลังยาปลอดภัย 💊',
  },
  iv: {
    emoji: '💧',
    icon: Droplets,
    accentColor: 'text-teal-600',
    bgGradient: 'from-teal-500/10 via-emerald-500/5 to-cyan-500/10',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-200',
    cuteTag: 'สารน้ำบริสุทธิ์ 💧',
  },
  housekeeping: {
    emoji: '🧼',
    icon: Sparkles,
    accentColor: 'text-amber-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-yellow-500/10',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    borderColor: 'border-amber-200',
    cuteTag: 'สะอาดสดชื่น 🧼',
  },
  computer: {
    emoji: '💻',
    icon: Laptop,
    accentColor: 'text-fuchsia-600',
    bgGradient: 'from-fuchsia-500/10 via-purple-500/5 to-pink-500/10',
    badgeBg: 'bg-fuchsia-50',
    badgeText: 'text-fuchsia-700',
    borderColor: 'border-fuchsia-200',
    cuteTag: 'ไอทีทันสมัย ⚡',
  },
  lab: {
    emoji: '🧪',
    icon: TestTubes,
    accentColor: 'text-emerald-600',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-green-500/10',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    cuteTag: 'ชันสูตรแม่นยำ 🧪',
  },
};

export function getCategoryVisual(categoryId: string): CategoryVisualMeta {
  return CATEGORY_VISUALS[categoryId] || {
    emoji: '📦',
    icon: Package,
    accentColor: 'text-indigo-500',
    bgGradient: 'from-indigo-500/10 to-violet-500/10',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    cuteTag: 'สินค้าทั่วไป 📦',
  };
}

/**
 * Cute Mascot Badge with Nurse Cartoon Mascot and sparkles
 */
export function MascotAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const [hasImgError, setHasImgError] = React.useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-16 h-16 rounded-3xl',
  };

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div className={`${sizeClasses[size]} overflow-hidden bg-gradient-to-tr from-pink-200 via-rose-100 to-indigo-100 flex items-center justify-center shadow-md shadow-pink-200/60 ring-2 ring-white/90 select-none group`}>
        {!hasImgError ? (
          <img 
            src="/src/assets/images/cute_nurse_avatar_1792051870546.jpg" 
            alt="การ์ตูนพยาบาลสุขใจ" 
            referrerPolicy="no-referrer"
            onError={() => setHasImgError(true)}
            className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <span className="transform group-hover:scale-110 transition-transform text-lg select-none">
            👩‍⚕️
          </span>
        )}
      </div>
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-2xs text-[9px] border border-pink-100">
        💖
      </span>
    </div>
  );
}

/**
 * Cute Category Squircle Badge with dual icon & emoji
 */
export function CuteCategoryBadge({
  categoryId,
  size = 'md',
  showText = true,
  categoryName,
}: {
  categoryId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  categoryName?: string;
}) {
  const visual = getCategoryVisual(categoryId);
  const IconComponent = visual.icon;

  const iconSizes = {
    sm: 12,
    md: 15,
    lg: 20,
  };

  const containerSizes = {
    sm: 'w-6 h-6 rounded-lg text-xs',
    md: 'w-8 h-8 rounded-xl text-sm',
    lg: 'w-11 h-11 rounded-2xl text-lg',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className={`relative ${containerSizes[size]} ${visual.badgeBg} ${visual.borderColor} border flex items-center justify-center shadow-2xs shrink-0 group`}>
        <IconComponent size={iconSizes[size]} className={visual.accentColor} />
        <span className="absolute -top-1.5 -right-1.5 text-[10px] select-none leading-none drop-shadow-xs">
          {visual.emoji}
        </span>
      </div>
      {showText && (
        <span className={`font-bold ${visual.badgeText} text-xs tracking-tight`}>
          {categoryName || visual.cuteTag}
        </span>
      )}
    </div>
  );
}

/**
 * Guess cute item emoji & icon from name
 */
export function getItemCuteIcon(name: string, categoryId: string) {
  const lower = name.toLowerCase();
  
  if (lower.includes('para') || lower.includes('ยา') || lower.includes('tablets') || lower.includes('capsule') || lower.includes('syrup')) {
    return { emoji: '💊', icon: Pill, bg: 'bg-sky-100/80 text-sky-600 border-sky-200' };
  }
  if (lower.includes('infusion') || lower.includes('pump') || lower.includes('เครื่อง') || lower.includes('omron') || lower.includes('digital') || lower.includes('ecg')) {
    return { emoji: '🩺', icon: Stethoscope, bg: 'bg-indigo-100/80 text-indigo-600 border-indigo-200' };
  }
  if (lower.includes('nss') || lower.includes('saline') || lower.includes('น้ำเกลือ') || lower.includes('iv') || lower.includes('dextrose')) {
    return { emoji: '🩸', icon: Droplets, bg: 'bg-teal-100/80 text-teal-700 border-teal-200' };
  }
  if (lower.includes('เข็ม') || lower.includes('syringe') || lower.includes('needle') || lower.includes('ฉีด')) {
    return { emoji: '💉', icon: Zap, bg: 'bg-rose-100/80 text-rose-600 border-rose-200' };
  }
  if (lower.includes('ถุงมือ') || lower.includes('glove') || lower.includes('mask') || lower.includes('หน้ากาก') || lower.includes('สำลี') || lower.includes('gauze') || lower.includes('ผ้าก๊อซ')) {
    return { emoji: '🩹', icon: ShieldCheck, bg: 'bg-pink-100/80 text-pink-600 border-pink-200' };
  }
  if (lower.includes('clean') || lower.includes('น้ำยา') || lower.includes('สบู่') || lower.includes('แอลกอฮอล์') || lower.includes('alcohol')) {
    return { emoji: '🧼', icon: Sparkles, bg: 'bg-amber-100/80 text-amber-700 border-amber-200' };
  }
  if (lower.includes('computer') || lower.includes('จอ') || lower.includes('เมาส์') || lower.includes('หมึก') || lower.includes('printer') || lower.includes('สาย')) {
    return { emoji: '💻', icon: Laptop, bg: 'bg-fuchsia-100/80 text-fuchsia-600 border-fuchsia-200' };
  }
  if (lower.includes('tube') || lower.includes('หลอด') || lower.includes('strip') || lower.includes('ตรวจ') || lower.includes('เลือด')) {
    return { emoji: '🧪', icon: TestTubes, bg: 'bg-emerald-100/80 text-emerald-700 border-emerald-200' };
  }

  // Fallback to category visual
  const cat = getCategoryVisual(categoryId);
  return {
    emoji: cat.emoji,
    icon: cat.icon,
    bg: `${cat.badgeBg} ${cat.accentColor} ${cat.borderColor}`,
  };
}

/**
 * Cute item avatar badge in table rows
 */
export function ItemCuteAvatar({ name, categoryId }: { name: string; categoryId: string }) {
  const itemInfo = getItemCuteIcon(name, categoryId);
  const IconComp = itemInfo.icon;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div className={`w-9 h-9 rounded-2xl ${itemInfo.bg} border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}>
        <IconComp size={16} />
      </div>
      <span className="absolute -bottom-1 -right-1 text-xs select-none leading-none drop-shadow-2xs">
        {itemInfo.emoji}
      </span>
    </div>
  );
}

/**
 * Cute status badge with icons
 */
export function CuteStatusBadge({
  quantity,
  minStock = 10,
  maxStock = 100,
}: {
  quantity: number;
  minStock?: number;
  maxStock?: number;
}) {
  if (quantity === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
        <XCircle size={13} className="text-rose-500 animate-pulse" />
        <span>หมดสต็อก (0) 🚨</span>
      </span>
    );
  }
  if (quantity <= minStock) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
        <AlertTriangle size={13} className="text-amber-500" />
        <span>สต็อกต่ำ (≤{minStock}) ⚠️</span>
      </span>
    );
  }
  if (quantity > maxStock) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-black bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
        <TrendingUp size={13} className="text-sky-500" />
        <span>สต็อกเกิน (&gt;{maxStock}) 📦</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
      <CheckCircle2 size={13} className="text-emerald-500" />
      <span>พร้อมใช้ (ปกติ) ✨</span>
    </span>
  );
}
