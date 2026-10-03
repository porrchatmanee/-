import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, InventoryItem, Transaction, ItemLot } from '../types';
import { INITIAL_ITEMS } from './constants';
import { supabase, isSupabaseConfigured, getMaskedUrl, getMaskedKey } from './supabase';
import { computeItemLots, getEarliestLotExpiry, formatOperatorWithLot, parseLotFromOperator, generateLotNumber } from './lots';

interface InventoryContextType extends AppState {
  processTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'> & { operator?: string; lotNumber?: string }) => Promise<void>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (item: InventoryItem) => Promise<void>;
  resetData: () => Promise<void>;
  dbError: string | null;
  clearDbError: () => void;
  isSyncing: boolean;
  isOnline: boolean;
  fetchData: () => Promise<void>;
  getMaskedUrl: () => string;
  getMaskedKey: () => string;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const normalizeItemName = (name: string): string => {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/no\./gi, 'no');
};

const getStoredLimits = (): Record<string, { minStock?: number; maxStock?: number }> => {
  try {
    const saved = localStorage.getItem('sukjai_item_stock_limits_v1');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveStoredLimit = (itemId: string, minStock?: number, maxStock?: number) => {
  try {
    const current = getStoredLimits();
    current[itemId] = {
      minStock: minStock !== undefined ? minStock : (current[itemId]?.minStock ?? 10),
      maxStock: maxStock !== undefined ? maxStock : (current[itemId]?.maxStock ?? 100),
    };
    localStorage.setItem('sukjai_item_stock_limits_v1', JSON.stringify(current));
  } catch {}
};

const mapDbItemToLocal = (dbItem: any): InventoryItem => {
  const limits = getStoredLimits();
  const itemLimit = limits[dbItem.id] || {};
  return {
    id: dbItem.id,
    name: dbItem.name,
    categoryId: dbItem.category_id,
    quantity: dbItem.quantity,
    unit: dbItem.unit,
    expiryDate: dbItem.expiry_date || undefined,
    minStock: dbItem.min_stock !== undefined && dbItem.min_stock !== null ? Number(dbItem.min_stock) : (itemLimit.minStock ?? 10),
    maxStock: dbItem.max_stock !== undefined && dbItem.max_stock !== null ? Number(dbItem.max_stock) : (itemLimit.maxStock ?? 100),
  };
};

const mapDbTxToLocal = (dbTx: any): Transaction => ({
  id: dbTx.id,
  itemId: dbTx.item_id,
  type: dbTx.type,
  quantity: dbTx.quantity,
  expiryDate: dbTx.expiry_date || undefined,
  lotNumber: parseLotFromOperator(dbTx.operator) || (dbTx.expiry_date ? generateLotNumber(dbTx.expiry_date, dbTx.created_at) : undefined),
  operator: dbTx.operator ? dbTx.operator.replace(/\s*\[Lot:[^\]]+\]/gi, '').trim() : 'พยาบาล',
  timestamp: dbTx.created_at || new Date().toISOString(),
});

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('sukjai_inventory_state_v2');
    let loadedState: AppState = {
      items: INITIAL_ITEMS,
      transactions: [],
      lastUpdated: new Date().toISOString()
    };
    if (saved) {
      try {
        loadedState = JSON.parse(saved);
      } catch (err) {
        console.error('Failed to load state', err);
      }
    }
    // Auto-enrich items on load to guarantee lots & FEFO expiry are correct in local fallback
    if (loadedState.items && loadedState.items.length > 0) {
      loadedState.items = loadedState.items.map(item => {
        const lots = computeItemLots(item, loadedState.transactions || []);
        const earliestExp = getEarliestLotExpiry(lots);
        return {
          ...item,
          lots,
          expiryDate: earliestExp || item.expiryDate
        };
      });
    }
    return loadedState;
  });

  // Local fallback storage sync
  useEffect(() => {
    localStorage.setItem('sukjai_inventory_state_v2', JSON.stringify(state));
  }, [state]);

  const clearDbError = () => setDbError(null);

  const fetchData = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncing(true);
    try {
      // 1. Fetch items
      const { data: dbItems, error: itemsErr } = await supabase
        .from('inventory_items')
        .select('*');

      if (itemsErr) throw itemsErr;

      // 2. Fetch transactions
      const { data: dbTxs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txsErr) throw txsErr;

      const rawItems: InventoryItem[] = (dbItems || []).map(mapDbItemToLocal);
      const mappedTxs: Transaction[] = (dbTxs || []).map(mapDbTxToLocal);

      // Enrich items with computed lots and earliest FEFO expiryDate
      const mappedItems: InventoryItem[] = rawItems.map(item => {
        const lots = computeItemLots(item, mappedTxs);
        const earliestExp = getEarliestLotExpiry(lots);
        return {
          ...item,
          lots,
          expiryDate: earliestExp || item.expiryDate
        };
      });

      setState({
        items: mappedItems,
        transactions: mappedTxs,
        lastUpdated: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Supabase fetch failed', err);
      setDbError(`ระบบคลังล้มเหลวในการดึงข้อมูลล่าสุดจาก Supabase: ${err.message || 'ตรวจพบปัญหาการเชื่อต่อเครือข่าย'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchData();
    }
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const itemsChannel = supabase
      .channel('public:inventory_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        fetchData();
      })
      .subscribe();

    const transactionsChannel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, []);

  const processTransaction = async (txArgs: Omit<Transaction, 'id' | 'timestamp'> & { operator?: string }) => {
    // ULTIMATE FORCE FIX FOR CACHED OR MISMATCHED "DISPENSE" / "ISSUE"
    let rawType = String(txArgs.type || '').trim().toUpperCase();
    let safeType: 'RECEIVE' | 'ISSUE' = (rawType === 'RECEIVE' || rawType === 'IN') ? 'RECEIVE' : 'ISSUE';

    const now = new Date().toISOString();
    const effectiveLot = txArgs.lotNumber || (txArgs.expiryDate ? generateLotNumber(txArgs.expiryDate, now) : undefined);
    const newTxLocal: Transaction = {
      ...txArgs,
      type: safeType,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: now,
      lotNumber: effectiveLot,
      operator: txArgs.operator || 'พยาบาล'
    };

    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      
      const insertData = {
        item_id: String(txArgs.itemId),
        type: safeType,
        quantity: Number(txArgs.quantity),
        expiry_date: txArgs.expiryDate || null,
        operator: formatOperatorWithLot(txArgs.operator || 'พยาบาล', effectiveLot),
      };

      try {
        const { error } = await supabase.from('transactions').insert(insertData);
        
        if (error) throw error;
        await fetchData();
      } catch (err: any) {
        console.error('Supabase transaction failed', err);
        const detail = `[v7] Data: ${JSON.stringify(insertData)}`;
        setDbError(`ไม่สามารถบันทึกได้ (${detail}): ${err.message || 'Error'}`);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local state fallback update
      setState(prev => {
        const items = [...prev.items];
        const itemIndex = items.findIndex(i => i.id === txArgs.itemId);
        const updatedTxs = [newTxLocal, ...prev.transactions];
        
        if (itemIndex >= 0) {
          const currentItem = items[itemIndex];
          const newQuantity = txArgs.type === 'RECEIVE' 
            ? currentItem.quantity + txArgs.quantity
            : Math.max(0, currentItem.quantity - txArgs.quantity);
            
          const tempItem: InventoryItem = {
            ...currentItem,
            quantity: newQuantity,
          };
          const lots = computeItemLots(tempItem, updatedTxs);
          const earliestExp = getEarliestLotExpiry(lots);

          items[itemIndex] = {
            ...tempItem,
            lots,
            expiryDate: earliestExp || currentItem.expiryDate
          };
        } else if (txArgs.type === 'RECEIVE') {
          const newItem: InventoryItem = {
            id: txArgs.itemId,
            name: `Unknown Item (${txArgs.itemId})`,
            categoryId: 'medical',
            quantity: txArgs.quantity,
            unit: 'ชิ้น',
            expiryDate: txArgs.expiryDate
          };
          const lots = computeItemLots(newItem, updatedTxs);
          newItem.lots = lots;
          newItem.expiryDate = getEarliestLotExpiry(lots) || txArgs.expiryDate;
          items.push(newItem);
        }

        return {
          ...prev,
          items,
          transactions: updatedTxs,
          lastUpdated: now
        };
      });
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    // Find matching items with the same name to sync Min-Max
    const currentItem = state.items.find(i => i.id === id);
    const targetNormName = currentItem ? normalizeItemName(updates.name || currentItem.name) : '';
    const sameNamedItemIds = state.items
      .filter(i => targetNormName && normalizeItemName(i.name) === targetNormName)
      .map(i => i.id);

    if (updates.minStock !== undefined || updates.maxStock !== undefined) {
      sameNamedItemIds.forEach(itemId => {
        saveStoredLimit(itemId, updates.minStock, updates.maxStock);
      });
    }

    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      try {
        const dbUpdatesFields: any = {};
        if (updates.name !== undefined) dbUpdatesFields.name = updates.name;
        if (updates.categoryId !== undefined) dbUpdatesFields.category_id = updates.categoryId;
        if (updates.quantity !== undefined) dbUpdatesFields.quantity = updates.quantity;
        if (updates.unit !== undefined) dbUpdatesFields.unit = updates.unit;
        if (updates.expiryDate !== undefined) dbUpdatesFields.expiry_date = updates.expiryDate || null;
        if (updates.minStock !== undefined) dbUpdatesFields.min_stock = updates.minStock;
        if (updates.maxStock !== undefined) dbUpdatesFields.max_stock = updates.maxStock;

        let { error } = await supabase
          .from('inventory_items')
          .update(dbUpdatesFields)
          .eq('id', id);

        if (error && (error.message.includes('min_stock') || error.message.includes('max_stock') || error.code === 'PGRST204')) {
          delete dbUpdatesFields.min_stock;
          delete dbUpdatesFields.max_stock;
          if (Object.keys(dbUpdatesFields).length > 0) {
            const retry = await supabase
              .from('inventory_items')
              .update(dbUpdatesFields)
              .eq('id', id);
            error = retry.error;
          } else {
            error = null;
          }
        }

        if (error) throw error;

        // Auto sync min_stock and max_stock to all other items with the same name
        if ((updates.minStock !== undefined || updates.maxStock !== undefined) && sameNamedItemIds.length > 1) {
          const limitUpdates: any = {};
          if (updates.minStock !== undefined) limitUpdates.min_stock = updates.minStock;
          if (updates.maxStock !== undefined) limitUpdates.max_stock = updates.maxStock;
          
          for (const otherId of sameNamedItemIds) {
            if (otherId !== id) {
              try {
                await supabase.from('inventory_items').update(limitUpdates).eq('id', otherId);
              } catch (e) {
                console.warn('Failed to sync other item stock limits', e);
              }
            }
          }
        }

        await fetchData();
      } catch (err: any) {
        console.error('Supabase updateItem failed', err);
        setDbError(`บันทึกการแก้ไขข้อมูลเวชภัณฑ์ลง Supabase ขัดข้อง: ${err.message || err}`);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === id) {
            const temp = { ...item, ...updates };
            const lots = computeItemLots(temp, prev.transactions);
            const earliestExp = getEarliestLotExpiry(lots);
            return {
              ...temp,
              lots,
              expiryDate: earliestExp || temp.expiryDate
            };
          }
          if (targetNormName && normalizeItemName(item.name) === targetNormName) {
            const limitUpdates: Partial<InventoryItem> = {};
            if (updates.minStock !== undefined) limitUpdates.minStock = updates.minStock;
            if (updates.maxStock !== undefined) limitUpdates.maxStock = updates.maxStock;
            const temp = { ...item, ...limitUpdates };
            const lots = computeItemLots(temp, prev.transactions);
            const earliestExp = getEarliestLotExpiry(lots);
            return {
              ...temp,
              lots,
              expiryDate: earliestExp || temp.expiryDate
            };
          }
          return item;
        }),
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  const deleteItem = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      try {
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await fetchData();
      } catch (err: any) {
        console.error('Supabase deleteItem failed', err);
        setDbError(`ลบรหัสสินค้าออกจาก Supabase ล้มเหลว (อาจมีประวัติใบเบิกติดอยู่): ${err.message || err}`);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id),
        lastUpdated: new Date().toISOString()
      }));
    }
  };
  
  const addItem = async (item: InventoryItem) => {
    // Inherit Min/Max from existing item if same name exists
    const existingSameName = state.items.find(i => normalizeItemName(i.name) === normalizeItemName(item.name));
    const effectiveMin = item.minStock !== undefined ? item.minStock : (existingSameName?.minStock ?? 10);
    const effectiveMax = item.maxStock !== undefined ? item.maxStock : (existingSameName?.maxStock ?? 100);

    const enrichedItem: InventoryItem = {
      ...item,
      minStock: effectiveMin,
      maxStock: effectiveMax,
    };

    saveStoredLimit(enrichedItem.id, enrichedItem.minStock, enrichedItem.maxStock);

    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      try {
        const payload: any = {
          id: enrichedItem.id,
          name: enrichedItem.name,
          category_id: enrichedItem.categoryId,
          quantity: enrichedItem.quantity,
          unit: enrichedItem.unit,
          expiry_date: enrichedItem.expiryDate || null,
          min_stock: enrichedItem.minStock,
          max_stock: enrichedItem.maxStock,
        };

        let { error } = await supabase.from('inventory_items').insert(payload);
        if (error && (error.message.includes('min_stock') || error.message.includes('max_stock') || error.code === 'PGRST204')) {
          delete payload.min_stock;
          delete payload.max_stock;
          const retry = await supabase.from('inventory_items').insert(payload);
          error = retry.error;
        }

        if (error) throw error;
        await fetchData();
      } catch (err: any) {
        console.error('Supabase addItem failed', err);
        setDbError(`ไม่สามารถบันทึกเพิ่มเวชภัณฑ์จัดเก็บลงคลังออนไลน์ได้: ${err.message || 'โปรดตรวจสอบรหัสสแกนซ้ำซ้อน'}`);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      setState(prev => {
        const enriched = { ...enrichedItem };
        const lots = computeItemLots(enriched, prev.transactions);
        enriched.lots = lots;
        enriched.expiryDate = getEarliestLotExpiry(lots) || enriched.expiryDate;
        return {
          ...prev,
          items: [...prev.items, enriched],
          lastUpdated: new Date().toISOString()
        };
      });
    }
  };
  
  const resetData = async () => {
    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      try {
        const { error: txErr } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (txErr) throw txErr;
        const { error: itemErr } = await supabase.from('inventory_items').delete().neq('id', 'placeholder-not-exist');
        if (itemErr) throw itemErr;
        await fetchData();
      } catch (err: any) {
        console.error('Supabase reset failed', err);
        setDbError(`การลบล้างรีเซ็ตข้อมูลคลังออนไลน์ใน Supabase ไม่สำเร็จ: ${err.message || err}`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setState({
        items: INITIAL_ITEMS,
        transactions: [],
        lastUpdated: new Date().toISOString()
      });
    }
  };

  return (
    <InventoryContext.Provider value={{
      ...state,
      processTransaction,
      updateItem,
      deleteItem,
      addItem,
      resetData,
      dbError,
      clearDbError,
      isSyncing,
      isOnline: isSupabaseConfigured,
      fetchData,
      getMaskedUrl,
      getMaskedKey
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
