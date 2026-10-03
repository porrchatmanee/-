import { InventoryItem, ItemLot, Transaction } from '../types';

/**
 * Extracts or generates a standard lot number from transaction or dates
 */
export function generateLotNumber(expiryDate?: string, dateStr?: string): string {
  if (expiryDate) {
    const clean = expiryDate.replace(/[^0-9]/g, '');
    return `LOT-E${clean.slice(2, 8) || clean}`;
  }
  const now = dateStr ? new Date(dateStr) : new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `LOT-${y}${m}${d}`;
}

/**
 * Parses lot number from operator text if stored as "พยาบาล [Lot: B2401]"
 */
export function parseLotFromOperator(operator?: string): string | undefined {
  if (!operator) return undefined;
  const match = operator.match(/\[Lot:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Attaches lot number to operator string for Supabase storage without schema breaking
 */
export function formatOperatorWithLot(operator: string = 'พยาบาล', lotNumber?: string): string {
  const baseOp = operator.replace(/\s*\[Lot:[^\]]+\]/gi, '').trim() || 'พยาบาล';
  if (!lotNumber || !lotNumber.trim()) return baseOp;
  return `${baseOp} [Lot: ${lotNumber.trim()}]`;
}

/**
 * Computes the active remaining lots for an item by replaying its transactions in chronological order (FEFO)
 */
export function computeItemLots(item: InventoryItem, allTransactions: Transaction[]): ItemLot[] {
  // If item already has explicit non-empty lots with remaining stock that match current quantity, use them
  if (item.lots && item.lots.length > 0) {
    const validLots = item.lots.filter(l => l.quantity > 0);
    if (validLots.length > 0) {
      return sortLotsFEFO(validLots);
    }
  }

  // Filter transactions for this item
  const itemTxs = allTransactions
    .filter(t => t.itemId === item.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // If no transactions, synthesize a single lot from item's current quantity and expiryDate
  if (itemTxs.length === 0) {
    if (item.quantity > 0) {
      return [{
        lotNumber: generateLotNumber(item.expiryDate),
        expiryDate: item.expiryDate || '',
        quantity: item.quantity,
      }];
    }
    return [];
  }

  // Active lots pool
  const lotsPool: ItemLot[] = [];

  for (const tx of itemTxs) {
    if (tx.type === 'RECEIVE') {
      const lotNum = tx.lotNumber || parseLotFromOperator(tx.operator) || generateLotNumber(tx.expiryDate, tx.timestamp);
      const expDate = tx.expiryDate || item.expiryDate || '';

      // Check if this lot already exists
      const existingLot = lotsPool.find(l => l.lotNumber === lotNum && l.expiryDate === expDate);
      if (existingLot) {
        existingLot.quantity += tx.quantity;
      } else {
        lotsPool.push({
          lotNumber: lotNum,
          expiryDate: expDate,
          quantity: tx.quantity,
          receivedDate: tx.timestamp
        });
      }
    } else if (tx.type === 'ISSUE' || tx.type === 'DISPENSE') {
      let qtyToDeduct = tx.quantity;
      const targetLotNum = tx.lotNumber || parseLotFromOperator(tx.operator);

      // If specific lot targeted, deduct from it first
      if (targetLotNum) {
        const target = lotsPool.find(l => l.lotNumber === targetLotNum && l.quantity > 0);
        if (target) {
          const deducted = Math.min(target.quantity, qtyToDeduct);
          target.quantity -= deducted;
          qtyToDeduct -= deducted;
        }
      }

      // If still quantity left to deduct, use FEFO (Earliest Expiring First)
      if (qtyToDeduct > 0) {
        const sortedLots = sortLotsFEFO(lotsPool.filter(l => l.quantity > 0));
        for (const lot of sortedLots) {
          if (qtyToDeduct <= 0) break;
          const deducted = Math.min(lot.quantity, qtyToDeduct);
          lot.quantity -= deducted;
          qtyToDeduct -= deducted;
        }
      }
    }
  }

  // Filter out exhausted lots (quantity <= 0)
  const remainingLots = lotsPool.filter(l => l.quantity > 0);

  // Fallback: If remaining lots sum does not match item quantity (due to external edits)
  const lotsTotal = remainingLots.reduce((acc, curr) => acc + curr.quantity, 0);
  if (remainingLots.length === 0 && item.quantity > 0) {
    remainingLots.push({
      lotNumber: generateLotNumber(item.expiryDate),
      expiryDate: item.expiryDate || '',
      quantity: item.quantity
    });
  } else if (lotsTotal !== item.quantity && remainingLots.length > 0) {
    // Proportional or tail adjustment to ensure integrity with item.quantity
    const diff = item.quantity - lotsTotal;
    if (diff > 0) {
      remainingLots[remainingLots.length - 1].quantity += diff;
    } else {
      // Deduct diff from newest lots
      let toRemove = Math.abs(diff);
      for (let i = remainingLots.length - 1; i >= 0 && toRemove > 0; i--) {
        const rem = Math.min(remainingLots[i].quantity, toRemove);
        remainingLots[i].quantity -= rem;
        toRemove -= rem;
      }
    }
  }

  return sortLotsFEFO(remainingLots.filter(l => l.quantity > 0));
}

/**
 * Sorts lots by FEFO (First Expired, First Out)
 * Lots with earliest expiry come first. Lots with no expiry come last.
 */
export function sortLotsFEFO(lots: ItemLot[]): ItemLot[] {
  return [...lots].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
}

/**
 * Returns the nearest active expiration date from lots
 */
export function getEarliestLotExpiry(lots: ItemLot[]): string | undefined {
  const sorted = sortLotsFEFO(lots.filter(l => l.quantity > 0 && l.expiryDate));
  return sorted.length > 0 ? sorted[0].expiryDate : undefined;
}

/**
 * Returns the number of days until a given expiration date
 */
export function getDaysUntilExpiry(dateStr?: string): number {
  if (!dateStr) return 9999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 9999;
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Groups inventory items by Name (aggressively normalized) to collapse duplicates.
 * Also handles merging of lots and FEFO logic for the grouped entry.
 */
export function groupInventoryItems(items: InventoryItem[]): (InventoryItem & { groupBarcodes: string[] })[] {
  const map = new Map<string, InventoryItem & { groupBarcodes: string[] }>();
  
  items.forEach(item => {
    // Aggressive normalization: Remove all spaces and non-alphanumeric Thai/English characters for the key
    // This handles "เข็ม เบอร์ 18" vs "เข็มเบอร์18" vs "เข็มเบอร์ 18 "
    const normalizedName = item.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/no\./gi, 'no')
      .replace(/[()\-./]/g, ''); // Remove common separators that might be inconsistent
    
    const key = normalizedName; 
    
    if (map.has(key)) {
      const existing = map.get(key)!;
      // Sum quantities
      existing.quantity += item.quantity;
      // Keep track of all barcodes in this group
      if (!existing.groupBarcodes.includes(item.id)) {
        existing.groupBarcodes.push(item.id);
      }
      // FEFO logic: Keep the earliest expiry date
      if (item.expiryDate) {
        if (!existing.expiryDate || new Date(item.expiryDate) < new Date(existing.expiryDate)) {
          existing.expiryDate = item.expiryDate;
        }
      }
      // Merge lots if present
      if (item.lots && item.lots.length > 0) {
        existing.lots = sortLotsFEFO([...(existing.lots || []), ...item.lots]);
      }
      
      // Keep the "best" metadata (e.g. non-empty unit)
      if (!existing.unit && item.unit) existing.unit = item.unit;
      
      // Inherit min/max thresholds - use the ones from the item that has them set (non-default)
      if (item.minStock !== undefined && item.minStock !== 10) existing.minStock = item.minStock;
      if (item.maxStock !== undefined && item.maxStock !== 100) existing.maxStock = item.maxStock;
    } else {
      map.set(key, { ...item, groupBarcodes: [item.id] });
    }
  });
  
  return Array.from(map.values());
}

/**
 * Formats date into Thai locale standard (e.g. "12 ต.ค. 69")
 */
export function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', { 
      year: '2-digit', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}
