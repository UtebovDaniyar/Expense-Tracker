// Transactions store for managing expenses and income

import { create } from 'zustand';
import { Transaction, RecurringTransaction, Category } from '@/types/models';
import { StorageService } from '@/services/storage';
import { generateUUID } from '@/utils/uuid';
import { validateAmount } from '@/utils/currency';
import { SupabaseService } from '@/services/supabase/supabaseService';
import { SyncService } from '@/services/sync/syncService';
import { useAuthStore } from '@/store/authStore';

interface TransactionsState {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  syncing: boolean;
  syncError: string | null;
  unsubscribe: (() => void) | null;
  unsubscribeRecurring: (() => void) | null;

  // Transaction actions
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getTransactionsByCategory: (category: Category) => Transaction[];

  // Recurring transaction actions
  addRecurringTransaction: (
    recurring: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  processRecurringTransactions: () => Promise<void>;

  // Persistence
  loadTransactions: () => Promise<void>;
  saveTransactions: () => Promise<void>;

  // Sync
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;

  // Clear all data
  clearAllTransactions: () => Promise<void>;

  // Reset store to initial state
  reset: () => void;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  recurringTransactions: [],
  syncing: false,
  syncError: null,
  unsubscribe: null,
  unsubscribeRecurring: null,

  addTransaction: async (transaction) => {
    if (!validateAmount(transaction.amount)) {
      throw new Error('Invalid amount: must be a positive number with up to 2 decimal places');
    }

    const userId = useAuthStore.getState().user?.id;

    // If authenticated and online, create in Supabase first (server generates ID)
    if (userId && SyncService.isDeviceOnline()) {
      try {
        const newTransaction = await SupabaseService.addTransaction(userId, transaction);

        // Optimistic update: add to local state immediately for instant UI feedback
        // Real-time subscription will update with the same data, but that's okay
        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));

        // Save to local storage as cache
        await get().saveTransactions();

        return;
      } catch (error) {
        console.error('Failed to sync transaction to Supabase:', error);
        set({ syncError: 'Failed to sync transaction' });
        // Fall through to offline handling
      }
    }

    // Offline or sync failed: create locally with client-generated ID
    const newTransaction: Transaction = {
      ...transaction,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to local state immediately
    set((state) => ({
      transactions: [...state.transactions, newTransaction],
    }));

    // Save to local storage
    await get().saveTransactions();

    // Queue for sync when online
    if (userId) {
      await SyncService.queueOperation({
        type: 'create',
        collection: 'transactions',
        data: {
          userId,
          transaction,
        },
      });
    }
  },

  updateTransaction: async (id, updates) => {
    if (updates.amount !== undefined && !validateAmount(updates.amount)) {
      throw new Error('Invalid amount: must be a positive number with up to 2 decimal places');
    }

    const userId = useAuthStore.getState().user?.id;

    // Update local state immediately
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));

    await get().saveTransactions();

    // Sync to Supabase if authenticated
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.updateTransaction(userId, id, updates);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync transaction update:', error);
          set({ syncError: 'Failed to sync update' });
          // Queue for retry
          await SyncService.queueOperation({
            type: 'update',
            collection: 'transactions',
            documentId: id,
            data: {
              userId,
              updates,
            },
          });
        }
      } else {
        // Offline: queue for sync
        await SyncService.queueOperation({
          type: 'update',
          collection: 'transactions',
          documentId: id,
          data: {
            userId,
            updates,
          },
        });
      }
    }
  },

  deleteTransaction: async (id) => {
    const userId = useAuthStore.getState().user?.id;

    // Delete from local state immediately
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));

    await get().saveTransactions();

    // Sync to Supabase if authenticated
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.deleteTransaction(userId, id);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync transaction deletion:', error);
          set({ syncError: 'Failed to sync deletion' });
          // Queue for retry
          await SyncService.queueOperation({
            type: 'delete',
            collection: 'transactions',
            documentId: id,
            data: {
              userId,
            },
          });
        }
      } else {
        // Offline: queue for sync
        await SyncService.queueOperation({
          type: 'delete',
          collection: 'transactions',
          documentId: id,
          data: {
            userId,
          },
        });
      }
    }
  },

  getTransactionsByDateRange: (startDate, endDate) => {
    const { transactions } = get();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return transactions.filter((t) => {
      const transactionDate = new Date(t.date).getTime();
      return transactionDate >= start && transactionDate <= end;
    });
  },

  getTransactionsByCategory: (category) => {
    const { transactions } = get();
    return transactions.filter((t) => t.category === category);
  },

  addRecurringTransaction: async (recurring) => {
    const userId = useAuthStore.getState().user?.id;

    // If authenticated and online, create in Supabase first
    if (userId && SyncService.isDeviceOnline()) {
      try {
        const newRecurring = await SupabaseService.addRecurringTransaction(userId, {
          ...recurring,
          lastCreated: recurring.startDate,
          isActive: true,
        });

        // Optimistic update: add to local state immediately
        set((state) => ({
          recurringTransactions: [...state.recurringTransactions, newRecurring],
        }));

        await get().saveTransactions();

        return;
      } catch (error) {
        console.error('Failed to sync recurring transaction:', error);
        set({ syncError: 'Failed to sync recurring transaction' });
      }
    }

    // Offline or sync failed: create locally
    const newRecurring: RecurringTransaction = {
      ...recurring,
      id: generateUUID(),
      lastCreated: recurring.startDate,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      recurringTransactions: [...state.recurringTransactions, newRecurring],
    }));

    await get().saveTransactions();

    // Queue for sync
    if (userId) {
      await SyncService.queueOperation({
        type: 'create',
        collection: 'recurring_transactions',
        data: {
          userId,
          recurring: {
            ...recurring,
            lastCreated: recurring.startDate,
            isActive: true,
          },
        },
      });
    }
  },

  updateRecurringTransaction: async (id, updates) => {
    const userId = useAuthStore.getState().user?.id;

    set((state) => ({
      recurringTransactions: state.recurringTransactions.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));

    await get().saveTransactions();

    // Sync to Supabase
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.updateRecurringTransaction(userId, id, updates);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync recurring transaction update:', error);
          set({ syncError: 'Failed to sync update' });
          await SyncService.queueOperation({
            type: 'update',
            collection: 'recurring_transactions',
            documentId: id,
            data: { userId, updates },
          });
        }
      } else {
        await SyncService.queueOperation({
          type: 'update',
          collection: 'recurring_transactions',
          documentId: id,
          data: { userId, updates },
        });
      }
    }
  },

  deleteRecurringTransaction: async (id) => {
    const userId = useAuthStore.getState().user?.id;

    set((state) => ({
      recurringTransactions: state.recurringTransactions.filter((r) => r.id !== id),
    }));

    await get().saveTransactions();

    // Sync to Supabase
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.deleteRecurringTransaction(userId, id);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync recurring transaction deletion:', error);
          set({ syncError: 'Failed to sync deletion' });
          await SyncService.queueOperation({
            type: 'delete',
            collection: 'recurring_transactions',
            documentId: id,
            data: { userId },
          });
        }
      } else {
        await SyncService.queueOperation({
          type: 'delete',
          collection: 'recurring_transactions',
          documentId: id,
          data: { userId },
        });
      }
    }
  },

  processRecurringTransactions: async () => {
    const { recurringTransactions, addTransaction } = get();
    const now = new Date();

    for (const recurring of recurringTransactions) {
      if (!recurring.isActive) continue;

      // Check if end date has passed
      if (recurring.endDate && new Date(recurring.endDate) < now) {
        await get().updateRecurringTransaction(recurring.id, { isActive: false });
        continue;
      }

      const lastCreated = new Date(recurring.lastCreated);
      let nextDue = new Date(lastCreated);

      // Calculate next due date based on frequency
      switch (recurring.frequency) {
        case 'daily':
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case 'weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'yearly':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }

      // If next due date is today or in the past, create transaction
      if (nextDue <= now) {
        await addTransaction({
          type: recurring.type,
          amount: recurring.amount,
          category: recurring.category,
          date: now.toISOString(),
          description: recurring.description,
          recurringId: recurring.id,
        });

        // Update last created date
        await get().updateRecurringTransaction(recurring.id, {
          lastCreated: now.toISOString(),
        });
      }
    }
  },

  loadTransactions: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;

      if (userId && SyncService.isDeviceOnline()) {
        // Authenticated + Online: Load from Supabase ONLY
        set({ syncing: true, syncError: null });
        try {
          const [transactions, recurringTransactions] = await Promise.all([
            SupabaseService.getTransactions(userId),
            SupabaseService.getRecurringTransactions(userId),
          ]);

          set({
            transactions: transactions || [],
            recurringTransactions: recurringTransactions || [],
            syncing: false,
          });

          // Save to AsyncStorage as cache (overwrite any guest data)
          await get().saveTransactions();
        } catch (error) {
          console.error('Failed to load from Supabase:', error);
          set({ syncing: false, syncError: 'Unable to load data. Please check your connection.' });

          // DON'T fall back to AsyncStorage for authenticated users
          // This prevents guest data from appearing in authenticated sessions
          set({
            transactions: [],
            recurringTransactions: [],
          });
        }
      } else if (userId && !SyncService.isDeviceOnline()) {
        // Authenticated + Offline: Load from AsyncStorage cache
        // This cache was created from previous Supabase load, not guest data
        console.log('Offline mode - loading from AsyncStorage cache');
        const [transactions, recurringTransactions] = await Promise.all([
          StorageService.get<Transaction[]>(StorageService.KEYS.TRANSACTIONS),
          StorageService.get<RecurringTransaction[]>(StorageService.KEYS.RECURRING_TRANSACTIONS),
        ]);

        set({
          transactions: transactions || [],
          recurringTransactions: recurringTransactions || [],
        });
      } else {
        // Guest mode: Load from AsyncStorage as primary storage
        console.log('Guest mode - loading from AsyncStorage');
        const [transactions, recurringTransactions] = await Promise.all([
          StorageService.get<Transaction[]>(StorageService.KEYS.TRANSACTIONS),
          StorageService.get<RecurringTransaction[]>(StorageService.KEYS.RECURRING_TRANSACTIONS),
        ]);

        set({
          transactions: transactions || [],
          recurringTransactions: recurringTransactions || [],
        });
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      set({ syncError: 'Failed to load transactions' });
    }
  },

  saveTransactions: async () => {
    try {
      const { transactions, recurringTransactions } = get();
      await Promise.all([
        StorageService.set(StorageService.KEYS.TRANSACTIONS, transactions),
        StorageService.set(StorageService.KEYS.RECURRING_TRANSACTIONS, recurringTransactions),
      ]);
    } catch (error) {
      console.error('Failed to save transactions:', error);
      throw error;
    }
  },

  startRealtimeSync: () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      console.log('Cannot start transactions sync: no user');
      return;
    }

    // Check if already subscribed
    const { unsubscribe, unsubscribeRecurring } = get();
    if (unsubscribe || unsubscribeRecurring) {
      console.log('Transactions real-time sync already active, skipping');
      return;
    }

    console.log('Starting transactions real-time sync for user:', userId);

    // Subscribe to transactions real-time updates
    const newUnsubscribe = SupabaseService.subscribeToTransactions(userId, (transactions) => {
      console.log('Transactions updated from real-time sync:', transactions.length);
      set({ transactions, syncError: null });
      // Update local cache
      get().saveTransactions();
    });

    // Subscribe to recurring transactions real-time updates
    const newUnsubscribeRecurring = SupabaseService.subscribeToRecurringTransactions(
      userId,
      (recurringTransactions) => {
        console.log(
          'Recurring transactions updated from real-time sync:',
          recurringTransactions.length
        );
        set({ recurringTransactions, syncError: null });
        // Update local cache
        get().saveTransactions();
      }
    );

    set({ unsubscribe: newUnsubscribe, unsubscribeRecurring: newUnsubscribeRecurring });
  },

  stopRealtimeSync: () => {
    const { unsubscribe, unsubscribeRecurring } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    if (unsubscribeRecurring) {
      unsubscribeRecurring();
    }
    set({ unsubscribe: null, unsubscribeRecurring: null });
  },

  clearAllTransactions: async () => {
    set({ transactions: [], recurringTransactions: [] });
    await StorageService.remove(StorageService.KEYS.TRANSACTIONS);
    await StorageService.remove(StorageService.KEYS.RECURRING_TRANSACTIONS);
  },

  reset: () => {
    console.log('Resetting transactions store');
    
    // Unsubscribe from real-time channels
    const { unsubscribe, unsubscribeRecurring } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    if (unsubscribeRecurring) {
      unsubscribeRecurring();
    }

    // Clear all state in memory (don't touch AsyncStorage)
    set({
      transactions: [],
      recurringTransactions: [],
      syncing: false,
      syncError: null,
      unsubscribe: null,
      unsubscribeRecurring: null,
    });
  },
}));
