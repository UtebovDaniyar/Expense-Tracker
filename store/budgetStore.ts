// Budget store for managing monthly and category budgets

import { create } from 'zustand';
import {
  Budget,
  CategoryBudget,
  BudgetStatus,
  CategoryBudgetStatus,
  BudgetAlerts,
  Category,
} from '@/types/models';
import { StorageService } from '@/services/storage';
import { generateUUID } from '@/utils/uuid';
import { validateAmount } from '@/utils/currency';
import { getDaysRemainingInMonth, getStartOfMonth, getEndOfMonth, isToday } from '@/utils/date';
import { useTransactionsStore } from './transactionsStore';
import { SupabaseService } from '@/services/supabase/supabaseService';
import { SyncService } from '@/services/sync/syncService';
import { useAuthStore } from '@/store/authStore';

interface BudgetState {
  budget: Budget | null;
  categoryBudgets: CategoryBudget[];
  budgetAlerts: BudgetAlerts;
  syncing: boolean;
  syncError: string | null;
  unsubscribe: (() => void) | null;

  // Actions
  setBudget: (amount: number) => Promise<void>;
  getBudgetStatus: () => BudgetStatus;

  // Category budgets
  addCategoryBudget: (category: Category, amount: number) => Promise<void>;
  updateCategoryBudget: (id: string, amount: number) => Promise<void>;
  deleteCategoryBudget: (id: string) => Promise<void>;
  getCategoryBudgetStatus: (category: Category) => CategoryBudgetStatus | null;

  // Budget alerts
  updateBudgetAlerts: (alerts: Partial<BudgetAlerts>) => Promise<void>;

  // Persistence
  loadBudget: () => Promise<void>;
  saveBudget: () => Promise<void>;

  // Sync
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;

  // Clear all data
  clearBudget: () => Promise<void>;

  // Reset store to initial state
  reset: () => void;
}

const DEFAULT_BUDGET_ALERTS: BudgetAlerts = {
  enabled50Percent: true,
  enabled75Percent: true,
  enabled90Percent: true,
  enabledDailyLimit: true,
};

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  categoryBudgets: [],
  budgetAlerts: DEFAULT_BUDGET_ALERTS,
  syncing: false,
  syncError: null,
  unsubscribe: null,

  setBudget: async (amount: number) => {
    if (!validateAmount(amount)) {
      throw new Error(
        'Invalid budget amount: must be a positive number with up to 2 decimal places'
      );
    }

    const userId = useAuthStore.getState().user?.id;

    // If authenticated and online, create in Supabase first
    if (userId && SyncService.isDeviceOnline()) {
      try {
        const budgetData = {
          amount,
          period: 'monthly' as const,
          startDate: getStartOfMonth(new Date()).toISOString(),
        };

        const newBudget = await SupabaseService.setBudget(userId, budgetData);

        // Optimistic update: set local state immediately
        set({ budget: newBudget, syncError: null });
        await get().saveBudget();

        return;
      } catch (error) {
        console.error('Failed to sync budget to Supabase:', error);
        set({ syncError: 'Failed to sync budget' });
        // Fall through to offline handling
      }
    }

    // Offline or sync failed: create locally
    const now = new Date().toISOString();
    const newBudget: Budget = {
      id: generateUUID(),
      amount,
      period: 'monthly',
      startDate: getStartOfMonth(new Date()).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    set({ budget: newBudget });
    await get().saveBudget();

    // Queue for sync
    if (userId) {
      await SyncService.queueOperation({
        type: 'create',
        collection: 'budgets',
        data: {
          userId,
          budget: {
            amount,
            period: 'monthly' as const,
            startDate: getStartOfMonth(new Date()).toISOString(),
          },
        },
      });
    }
  },

  getBudgetStatus: (): BudgetStatus => {
    const { budget } = get();

    if (!budget) {
      return {
        totalBudget: 0,
        spent: 0,
        remaining: 0,
        percentageUsed: 0,
        dailyAllowance: 0,
        daysRemaining: 0,
        spentToday: 0,
      };
    }

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);
    const endOfMonth = getEndOfMonth(now);

    // Get all expense transactions for current month
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startOfMonth.toISOString(), endOfMonth.toISOString());

    const spent = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const spentToday = transactions
      .filter((t) => t.type === 'expense' && isToday(new Date(t.date)))
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = budget.amount - spent;
    const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const daysRemaining = getDaysRemainingInMonth(now);
    const dailyAllowance = daysRemaining > 0 ? remaining / daysRemaining : 0;

    return {
      totalBudget: budget.amount,
      spent,
      remaining,
      percentageUsed: Math.round(percentageUsed),
      dailyAllowance: Math.max(0, dailyAllowance),
      daysRemaining,
      spentToday,
    };
  },

  addCategoryBudget: async (category: Category, amount: number) => {
    if (!validateAmount(amount)) {
      throw new Error(
        'Invalid budget amount: must be a positive number with up to 2 decimal places'
      );
    }

    const userId = useAuthStore.getState().user?.id;

    // If authenticated and online, create in Supabase first
    if (userId && SyncService.isDeviceOnline()) {
      try {
        const categoryBudgetData = {
          category,
          amount,
          period: 'monthly' as const,
        };

        const newCategoryBudget = await SupabaseService.addCategoryBudget(
          userId,
          categoryBudgetData
        );

        // Optimistic update: add to local state immediately
        set((state) => ({
          categoryBudgets: [...state.categoryBudgets, newCategoryBudget],
          syncError: null,
        }));

        await get().saveBudget();

        return;
      } catch (error) {
        console.error('Failed to sync category budget:', error);
        set({ syncError: 'Failed to sync category budget' });
        // Fall through to offline handling
      }
    }

    // Offline or sync failed: create locally
    const now = new Date().toISOString();
    const newCategoryBudget: CategoryBudget = {
      id: generateUUID(),
      category,
      amount,
      period: 'monthly',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      categoryBudgets: [...state.categoryBudgets, newCategoryBudget],
    }));

    await get().saveBudget();

    // Queue for sync
    if (userId) {
      await SyncService.queueOperation({
        type: 'create',
        collection: 'category_budgets',
        data: {
          userId,
          categoryBudget: {
            category,
            amount,
            period: 'monthly' as const,
          },
        },
      });
    }
  },

  updateCategoryBudget: async (id: string, amount: number) => {
    if (!validateAmount(amount)) {
      throw new Error(
        'Invalid budget amount: must be a positive number with up to 2 decimal places'
      );
    }

    const userId = useAuthStore.getState().user?.id;

    // Update local state immediately
    set((state) => ({
      categoryBudgets: state.categoryBudgets.map((cb) =>
        cb.id === id ? { ...cb, amount, updatedAt: new Date().toISOString() } : cb
      ),
    }));

    await get().saveBudget();

    // Sync to Supabase
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.updateCategoryBudget(userId, id, { amount });
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync category budget update:', error);
          set({ syncError: 'Failed to sync update' });
          await SyncService.queueOperation({
            type: 'update',
            collection: 'category_budgets',
            documentId: id,
            data: { userId, updates: { amount } },
          });
        }
      } else {
        await SyncService.queueOperation({
          type: 'update',
          collection: 'category_budgets',
          documentId: id,
          data: { userId, updates: { amount } },
        });
      }
    }
  },

  deleteCategoryBudget: async (id: string) => {
    const userId = useAuthStore.getState().user?.id;

    // Delete from local state immediately
    set((state) => ({
      categoryBudgets: state.categoryBudgets.filter((cb) => cb.id !== id),
    }));

    await get().saveBudget();

    // Sync to Supabase
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.deleteCategoryBudget(userId, id);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync category budget deletion:', error);
          set({ syncError: 'Failed to sync deletion' });
          await SyncService.queueOperation({
            type: 'delete',
            collection: 'category_budgets',
            documentId: id,
            data: { userId },
          });
        }
      } else {
        await SyncService.queueOperation({
          type: 'delete',
          collection: 'category_budgets',
          documentId: id,
          data: { userId },
        });
      }
    }
  },

  getCategoryBudgetStatus: (category: Category): CategoryBudgetStatus | null => {
    const { categoryBudgets } = get();
    const categoryBudget = categoryBudgets.find((cb) => cb.category === category);

    if (!categoryBudget) return null;

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);
    const endOfMonth = getEndOfMonth(now);

    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startOfMonth.toISOString(), endOfMonth.toISOString());

    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = categoryBudget.amount - spent;
    const percentageUsed = categoryBudget.amount > 0 ? (spent / categoryBudget.amount) * 100 : 0;

    let status: 'on-track' | 'warning' | 'exceeded';
    if (percentageUsed >= 100) {
      status = 'exceeded';
    } else if (percentageUsed >= 75) {
      status = 'warning';
    } else {
      status = 'on-track';
    }

    return {
      category,
      budget: categoryBudget.amount,
      spent,
      remaining,
      percentageUsed: Math.round(percentageUsed),
      status,
    };
  },

  updateBudgetAlerts: async (alerts: Partial<BudgetAlerts>) => {
    set((state) => ({
      budgetAlerts: { ...state.budgetAlerts, ...alerts },
    }));

    await get().saveBudget();
  },

  loadBudget: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;

      if (userId && SyncService.isDeviceOnline()) {
        // Authenticated + Online: Load from Supabase ONLY
        set({ syncing: true, syncError: null });
        try {
          const [budget, categoryBudgets] = await Promise.all([
            SupabaseService.getBudget(userId),
            SupabaseService.getCategoryBudgets(userId),
          ]);

          set({
            budget: budget || null,
            categoryBudgets: categoryBudgets || [],
            syncing: false,
          });

          // Save to AsyncStorage as cache (overwrite any guest data)
          await get().saveBudget();
        } catch (error) {
          console.error('Failed to load from Supabase:', error);
          set({ syncing: false, syncError: 'Unable to load data. Please check your connection.' });

          // DON'T fall back to AsyncStorage for authenticated users
          // This prevents guest data from appearing in authenticated sessions
          set({
            budget: null,
            categoryBudgets: [],
            budgetAlerts: DEFAULT_BUDGET_ALERTS,
          });
        }
      } else if (userId && !SyncService.isDeviceOnline()) {
        // Authenticated + Offline: Load from AsyncStorage cache
        // This cache was created from previous Supabase load, not guest data
        console.log('Offline mode - loading budget from AsyncStorage cache');
        const [budget, categoryBudgets, budgetAlerts] = await Promise.all([
          StorageService.get<Budget>(StorageService.KEYS.BUDGET),
          StorageService.get<CategoryBudget[]>(StorageService.KEYS.CATEGORY_BUDGETS),
          StorageService.get<BudgetAlerts>(StorageService.KEYS.BUDGET_ALERTS),
        ]);

        set({
          budget: budget || null,
          categoryBudgets: categoryBudgets || [],
          budgetAlerts: budgetAlerts || DEFAULT_BUDGET_ALERTS,
        });
      } else {
        // Guest mode: Load from AsyncStorage as primary storage
        console.log('Guest mode - loading budget from AsyncStorage');
        const [budget, categoryBudgets, budgetAlerts] = await Promise.all([
          StorageService.get<Budget>(StorageService.KEYS.BUDGET),
          StorageService.get<CategoryBudget[]>(StorageService.KEYS.CATEGORY_BUDGETS),
          StorageService.get<BudgetAlerts>(StorageService.KEYS.BUDGET_ALERTS),
        ]);

        set({
          budget: budget || null,
          categoryBudgets: categoryBudgets || [],
          budgetAlerts: budgetAlerts || DEFAULT_BUDGET_ALERTS,
        });
      }
    } catch (error) {
      console.error('Failed to load budget:', error);
      set({ syncError: 'Failed to load budget' });
    }
  },

  saveBudget: async () => {
    try {
      const { budget, categoryBudgets, budgetAlerts } = get();
      await Promise.all([
        budget ? StorageService.set(StorageService.KEYS.BUDGET, budget) : Promise.resolve(),
        StorageService.set(StorageService.KEYS.CATEGORY_BUDGETS, categoryBudgets),
        StorageService.set(StorageService.KEYS.BUDGET_ALERTS, budgetAlerts),
      ]);
    } catch (error) {
      console.error('Failed to save budget:', error);
      throw error;
    }
  },

  startRealtimeSync: () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      console.log('Cannot start budget sync: no user');
      return;
    }

    // Check if already subscribed
    const { unsubscribe } = get();
    if (unsubscribe) {
      console.log('Budget real-time sync already active, skipping');
      return;
    }

    console.log('Starting budget real-time sync for user:', userId);

    // Subscribe to real-time updates from Supabase
    const newUnsubscribe = SupabaseService.subscribeToBudgets(userId, (budget, categoryBudgets) => {
      console.log('Budget updated from real-time sync');
      set({
        budget: budget || null,
        categoryBudgets: categoryBudgets || [],
        syncError: null,
      });
      // Update local cache
      get().saveBudget();
    });

    set({ unsubscribe: newUnsubscribe });
  },

  stopRealtimeSync: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  clearBudget: async () => {
    set({
      budget: null,
      categoryBudgets: [],
      budgetAlerts: DEFAULT_BUDGET_ALERTS,
    });
    await StorageService.remove(StorageService.KEYS.BUDGET);
    await StorageService.remove(StorageService.KEYS.CATEGORY_BUDGETS);
    await StorageService.remove(StorageService.KEYS.BUDGET_ALERTS);
  },

  reset: () => {
    console.log('Resetting budget store');
    
    // Unsubscribe from real-time channels
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }

    // Clear all state in memory (don't touch AsyncStorage)
    set({
      budget: null,
      categoryBudgets: [],
      budgetAlerts: DEFAULT_BUDGET_ALERTS,
      syncing: false,
      syncError: null,
      unsubscribe: null,
    });
  },
}));
