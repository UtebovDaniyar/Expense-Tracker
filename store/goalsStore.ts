// Goals store for managing financial goals

import { create } from 'zustand';
import { Goal, GoalProgress } from '@/types/models';
import { StorageService } from '@/services/storage';
import { generateUUID } from '@/utils/uuid';
import { validateAmount } from '@/utils/currency';
import { SupabaseService } from '@/services/supabase/supabaseService';
import { SyncService } from '@/services/sync/syncService';
import { useAuthStore } from '@/store/authStore';

interface GoalsState {
  goals: Goal[];
  syncing: boolean;
  syncError: string | null;
  unsubscribe: (() => void) | null;

  // Actions
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addFundsToGoal: (id: string, amount: number) => Promise<void>;
  getGoalProgress: (id: string) => GoalProgress | null;

  // Persistence
  loadGoals: () => Promise<void>;
  saveGoals: () => Promise<void>;

  // Sync
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;

  // Clear all data
  clearAllGoals: () => Promise<void>;

  // Reset store to initial state
  reset: () => void;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  syncing: false,
  syncError: null,
  unsubscribe: null,

  addGoal: async (goal) => {
    console.log('addGoal called with:', goal);

    if (!validateAmount(goal.targetAmount)) {
      console.error('Target amount validation failed:', goal.targetAmount);
      throw new Error(
        'Invalid target amount: must be a positive number with up to 2 decimal places'
      );
    }

    // Current amount can be 0, so we check differently
    if (
      goal.currentAmount !== undefined &&
      (typeof goal.currentAmount !== 'number' || goal.currentAmount < 0)
    ) {
      console.error('Current amount validation failed:', goal.currentAmount);
      throw new Error('Invalid current amount: must be a non-negative number');
    }

    const userId = useAuthStore.getState().user?.id;

    // If authenticated and online, create in Supabase first
    if (userId && SyncService.isDeviceOnline()) {
      try {
        const newGoal = await SupabaseService.addGoal(userId, goal);
        console.log('Goal created in Supabase:', newGoal.id);

        // Optimistic update: add to local state immediately
        set((state) => ({
          goals: [...state.goals, newGoal],
          syncError: null,
        }));

        await get().saveGoals();

        return;
      } catch (error: any) {
        console.error('Failed to sync goal to Supabase:', error.message);
        set({ syncError: 'Failed to sync goal' });
        // Fall through to offline handling
      }
    }

    // Offline or sync failed: create locally
    const now = new Date().toISOString();
    const newGoal: Goal = {
      ...goal,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };

    console.log('New goal created locally:', newGoal);

    set((state) => ({
      goals: [...state.goals, newGoal],
    }));

    await get().saveGoals();

    // Queue for sync
    if (userId) {
      await SyncService.queueOperation({
        type: 'create',
        collection: 'goals',
        data: {
          userId,
          goal,
        },
      });
    }
  },

  updateGoal: async (id, updates) => {
    if (updates.targetAmount !== undefined && !validateAmount(updates.targetAmount)) {
      throw new Error(
        'Invalid target amount: must be a positive number with up to 2 decimal places'
      );
    }

    // Current amount can be 0, so we check differently
    if (
      updates.currentAmount !== undefined &&
      (typeof updates.currentAmount !== 'number' || updates.currentAmount < 0)
    ) {
      throw new Error('Invalid current amount: must be a non-negative number');
    }

    const userId = useAuthStore.getState().user?.id;

    // Update local state immediately
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      ),
    }));

    await get().saveGoals();

    // Sync to Supabase
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.updateGoal(userId, id, updates);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync goal update:', error);
          set({ syncError: 'Failed to sync update' });
          await SyncService.queueOperation({
            type: 'update',
            collection: 'goals',
            documentId: id,
            data: { userId, updates },
          });
        }
      } else {
        await SyncService.queueOperation({
          type: 'update',
          collection: 'goals',
          documentId: id,
          data: { userId, updates },
        });
      }
    }
  },

  deleteGoal: async (id) => {
    const userId = useAuthStore.getState().user?.id;

    // Delete from local state immediately
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));

    await get().saveGoals();

    // Sync to Supabase
    if (userId) {
      if (SyncService.isDeviceOnline()) {
        try {
          await SupabaseService.deleteGoal(userId, id);
          set({ syncError: null });
        } catch (error) {
          console.error('Failed to sync goal deletion:', error);
          set({ syncError: 'Failed to sync deletion' });
          await SyncService.queueOperation({
            type: 'delete',
            collection: 'goals',
            documentId: id,
            data: { userId },
          });
        }
      } else {
        await SyncService.queueOperation({
          type: 'delete',
          collection: 'goals',
          documentId: id,
          data: { userId },
        });
      }
    }
  },

  addFundsToGoal: async (id, amount) => {
    if (!validateAmount(amount)) {
      throw new Error('Invalid amount: must be a positive number with up to 2 decimal places');
    }

    const goal = get().goals.find((g) => g.id === id);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const newCurrentAmount = goal.currentAmount + amount;
    const updates: Partial<Goal> = {
      currentAmount: newCurrentAmount,
    };

    // Auto-complete goal if target is reached
    if (newCurrentAmount >= goal.targetAmount) {
      updates.status = 'completed';
    }

    await get().updateGoal(id, updates);
  },

  getGoalProgress: (id): GoalProgress | null => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return null;

    const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const monthsRemaining = daysRemaining / 30;
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;

    return {
      percentage: Math.min(100, Math.round(percentage)),
      remaining,
      daysRemaining,
      requiredMonthly: Math.max(0, requiredMonthly),
    };
  },

  loadGoals: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;

      if (userId && SyncService.isDeviceOnline()) {
        // Authenticated + Online: Load from Supabase ONLY
        set({ syncing: true, syncError: null });
        try {
          const goals = await SupabaseService.getGoals(userId);
          set({ goals: goals || [], syncing: false });
          
          // Save to AsyncStorage as cache (overwrite any guest data)
          await get().saveGoals();
        } catch (error) {
          console.error('Failed to load from Supabase:', error);
          set({ syncing: false, syncError: 'Unable to load data. Please check your connection.' });
          
          // DON'T fall back to AsyncStorage for authenticated users
          // This prevents guest data from appearing in authenticated sessions
          set({ goals: [] });
        }
      } else if (userId && !SyncService.isDeviceOnline()) {
        // Authenticated + Offline: Load from AsyncStorage cache
        // This cache was created from previous Supabase load, not guest data
        console.log('Offline mode - loading goals from AsyncStorage cache');
        const goals = await StorageService.get<Goal[]>(StorageService.KEYS.GOALS);
        set({ goals: goals || [] });
      } else {
        // Guest mode: Load from AsyncStorage as primary storage
        console.log('Guest mode - loading goals from AsyncStorage');
        const goals = await StorageService.get<Goal[]>(StorageService.KEYS.GOALS);
        set({ goals: goals || [] });
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
      set({ syncError: 'Failed to load goals' });
    }
  },

  saveGoals: async () => {
    try {
      const { goals } = get();
      await StorageService.set(StorageService.KEYS.GOALS, goals);
    } catch (error) {
      console.error('Failed to save goals:', error);
      throw error;
    }
  },

  startRealtimeSync: () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      console.log('Cannot start goals sync: no user');
      return;
    }

    // Check if already subscribed
    const { unsubscribe } = get();
    if (unsubscribe) {
      console.log('Goals real-time sync already active, skipping');
      return;
    }

    console.log('Starting goals real-time sync for user:', userId);

    // Subscribe to real-time updates from Supabase
    const newUnsubscribe = SupabaseService.subscribeToGoals(userId, (goals) => {
      console.log('Goals updated from real-time sync:', goals.length);
      set({ goals: goals || [], syncError: null });
      // Update local cache
      get().saveGoals();
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

  clearAllGoals: async () => {
    set({ goals: [] });
    await StorageService.remove(StorageService.KEYS.GOALS);
  },

  reset: () => {
    console.log('Resetting goals store');
    
    // Unsubscribe from real-time channels
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }

    // Clear all state in memory (don't touch AsyncStorage)
    set({
      goals: [],
      syncing: false,
      syncError: null,
      unsubscribe: null,
    });
  },
}));
