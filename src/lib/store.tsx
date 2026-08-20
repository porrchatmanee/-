import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, InventoryItem, Transaction } from '../types';
import { INITIAL_ITEMS } from './constants';
import { supabase, isSupabaseConfigured, getMaskedUrl, getMaskedKey } from './supabase';

interface InventoryContextType extends AppState {
  processTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'> & { operator?: string }) => Promise<void>;
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

const mapDbItemToLocal = (dbItem: any): InventoryItem => ({
  id: dbItem.id,
  name: dbItem.name,
  categoryId: dbItem.category_id,
  quantity: dbItem.quantity,
  unit: dbItem.unit,
  expiryDate: dbItem.expiry_date || undefined,
});

const mapDbTxToLocal = (dbTx: any): Transaction => ({
  id: dbTx.id,
  itemId: dbTx.item_id,
  type: dbTx.type,
  quantity: dbTx.quantity,
  expiryDate: dbTx.expiry_date || undefined,
  operator: dbTx.operator || 'พยาบาล',
  timestamp: dbTx.created_at || new Date().toISOString(),
});

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('sukjai_inventory_state_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to load state', err);
      }
    }
    return {
      items: INITIAL_ITEMS,
      transactions: [],
      lastUpdated: new Date().toISOString()
    };
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

      const mappedItems: InventoryItem[] = (dbItems || []).map(mapDbItemToLocal);
      const mappedTxs: Transaction[] = (dbTxs || []).map(mapDbTxToLocal);

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
    // FORCE FIX FOR CACHED "DISPENSE"
    if ((txArgs.type as any) === 'DISPENSE') {
      txArgs.type = 'ISSUE';
    }
    const now = new Date().toISOString();
    const newTxLocal: Transaction = {
      ...txArgs,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: now,
      operator: txArgs.operator || 'พยาบาล'
    };

    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      try {
        // Insert transaction record to Supabase.
        // The trigger "after_transaction_insert" automatically executes the quantity updates.
        const { error } = await supabase.from('transactions').insert({
          item_id: txArgs.itemId,
          type: txArgs.type,
          quantity: txArgs.quantity,
          expiry_date: txArgs.expiryDate || null,
          operator: txArgs.operator || 'พยาบาล',
        });
        
        if (error) throw error;
        
        // Fetch fresh state reflecting DB calculation
        await fetchData();
      } catch (err: any) {
        console.error('Supabase transaction failed', err);
        setDbError(`ไม่สามารถบันทึกและปรับปรุงยอดในฐานข้อมูลออนไลน์ได้: ${err.message || 'กรุณาตรวจสอบว่ายอดเบิกเกินยอดคงคลังหรือไม่'}`);
        // Fallback throw inside is handled gracefully by front UI
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local state fallback update
      setState(prev => {
        const items = [...prev.items];
        const itemIndex = items.findIndex(i => i.id === txArgs.itemId);
        
        if (itemIndex >= 0) {
          const currentItem = items[itemIndex];
          const newQuantity = txArgs.type === 'RECEIVE' 
            ? currentItem.quantity + txArgs.quantity
            : Math.max(0, currentItem.quantity - txArgs.quantity);
            
          items[itemIndex] = {
            ...currentItem,
            quantity: newQuantity,
            expiryDate: txArgs.type === 'RECEIVE' && txArgs.expiryDate ? txArgs.expiryDate : currentItem.expiryDate
          };
        } else if (txArgs.type === 'RECEIVE') {
          items.push({
            id: txArgs.itemId,
            name: `Unknown Item (${txArgs.itemId})`,
            categoryId: 'medical',
            quantity: txArgs.quantity,
            unit: 'ชิ้น',
            expiryDate: txArgs.expiryDate
          });
        }

        return {
          ...prev,
          items,
          transactions: [newTxLocal, ...prev.transactions],
          lastUpdated: now
        };
      });
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
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

        const { error } = await supabase
          .from('inventory_items')
          .update(dbUpdatesFields)
          .eq('id', id);

        if (error) throw error;
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
        items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item),
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
    if (isSupabaseConfigured && supabase) {
      setIsSyncing(true);
      setDbError(null);
      try {
        const { error } = await supabase.from('inventory_items').insert({
          id: item.id,
          name: item.name,
          category_id: item.categoryId,
          quantity: item.quantity,
          unit: item.unit,
          expiry_date: item.expiryDate || null,
        });

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
      setState(prev => ({
        ...prev,
        items: [...prev.items, item],
        lastUpdated: new Date().toISOString()
      }));
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
