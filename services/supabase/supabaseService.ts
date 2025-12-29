// Supabase Service - CRUD operations for cloud data
import { supabase } from './config';
import type {
  Transaction,
  RecurringTransaction,
  Budget,
  CategoryBudget,
  Goal,
  Settings,
} from '@/types/models';

export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

function handleError(error: any): never {
  console.error('Supabase error:', error);
  const message = error.code === 'PGRST116' ? 'No data found' : error.message || 'Sync error';
  throw new SupabaseError(message, error.code, error.details);
}

// Counter for unique channel names
let channelCounter = 0;

export class SupabaseService {
  // TRANSACTIONS
  static async addTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
          recurring_id: transaction.recurringId || null,
        })
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        date: data.date,
        recurringId: data.recurring_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async updateTransaction(
    userId: string,
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Transaction> {
    try {
      const updateData: any = {};
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.recurringId !== undefined) updateData.recurring_id = updates.recurringId;
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        date: data.date,
        recurringId: data.recurring_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async deleteTransaction(userId: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) handleError(error);
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) handleError(error);
      return (data || []).map((item) => ({
        id: item.id,
        type: item.type,
        amount: parseFloat(item.amount),
        category: item.category,
        description: item.description,
        date: item.date,
        recurringId: item.recurring_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static subscribeToTransactions(
    userId: string,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    // Use unique channel name to avoid conflicts
    const channelName = `transactions_${userId}_${++channelCounter}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        async () => {
          const transactions = await this.getTransactions(userId);
          callback(transactions);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // RECURRING TRANSACTIONS
  static async addRecurringTransaction(
    userId: string,
    recurring: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringTransaction> {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: userId,
          type: recurring.type,
          amount: recurring.amount,
          category: recurring.category,
          description: recurring.description,
          frequency: recurring.frequency,
          start_date: recurring.startDate,
          end_date: recurring.endDate || null,
          last_created: recurring.lastCreated,
          is_active: recurring.isActive,
        })
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        frequency: data.frequency,
        startDate: data.start_date,
        endDate: data.end_date,
        lastCreated: data.last_created,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async updateRecurringTransaction(
    userId: string,
    id: string,
    updates: Partial<Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<RecurringTransaction> {
    try {
      const updateData: any = {};
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.lastCreated !== undefined) updateData.last_created = updates.lastCreated;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        frequency: data.frequency,
        startDate: data.start_date,
        endDate: data.end_date,
        lastCreated: data.last_created,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async deleteRecurringTransaction(userId: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) handleError(error);
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async getRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) handleError(error);
      return (data || []).map((item) => ({
        id: item.id,
        type: item.type,
        amount: parseFloat(item.amount),
        category: item.category,
        description: item.description,
        frequency: item.frequency,
        startDate: item.start_date,
        endDate: item.end_date,
        lastCreated: item.last_created,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static subscribeToRecurringTransactions(
    userId: string,
    callback: (recurringTransactions: RecurringTransaction[]) => void
  ): () => void {
    // Use unique channel name to avoid conflicts
    const channelName = `recurring_${userId}_${++channelCounter}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_transactions',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const recurringTransactions = await this.getRecurringTransactions(userId);
          callback(recurringTransactions);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // BUDGETS
  static async setBudget(
    userId: string,
    budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Budget> {
    try {
      const { data: existing } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('period', budget.period)
        .single();
      let data, error;
      if (existing) {
        const result = await supabase
          .from('budgets')
          .update({ amount: budget.amount, start_date: budget.startDate })
          .eq('id', existing.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('budgets')
          .insert({
            user_id: userId,
            amount: budget.amount,
            period: budget.period,
            start_date: budget.startDate,
          })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }
      if (error) handleError(error);
      return {
        id: data.id,
        amount: parseFloat(data.amount),
        period: data.period,
        startDate: data.start_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async getBudget(userId: string): Promise<Budget | null> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('period', 'monthly')
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        handleError(error);
      }
      if (!data) return null;
      return {
        id: data.id,
        amount: parseFloat(data.amount),
        period: data.period,
        startDate: data.start_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async addCategoryBudget(
    userId: string,
    categoryBudget: Omit<CategoryBudget, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CategoryBudget> {
    try {
      // Use upsert to handle duplicates - if category budget exists, update it
      const { data, error } = await supabase
        .from('category_budgets')
        .upsert(
          {
            user_id: userId,
            category: categoryBudget.category,
            amount: categoryBudget.amount,
            period: categoryBudget.period,
            spent: 0,
          },
          {
            onConflict: 'user_id,category,period',
            ignoreDuplicates: false, // Update if exists
          }
        )
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        category: data.category,
        amount: parseFloat(data.amount),
        period: data.period,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async updateCategoryBudget(
    userId: string,
    id: string,
    updates: Partial<Omit<CategoryBudget, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<CategoryBudget> {
    try {
      const updateData: any = {};
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.period !== undefined) updateData.period = updates.period;
      const { data, error } = await supabase
        .from('category_budgets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        category: data.category,
        amount: parseFloat(data.amount),
        period: data.period,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async deleteCategoryBudget(userId: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) handleError(error);
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async getCategoryBudgets(userId: string): Promise<CategoryBudget[]> {
    try {
      const { data, error } = await supabase
        .from('category_budgets')
        .select('*')
        .eq('user_id', userId);
      if (error) handleError(error);
      return (data || []).map((item) => ({
        id: item.id,
        category: item.category,
        amount: parseFloat(item.amount),
        period: item.period,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static subscribeToBudgets(
    userId: string,
    callback: (budget: Budget | null, categoryBudgets: CategoryBudget[]) => void
  ): () => void {
    // Use unique channel name to avoid conflicts
    const channelName = `budgets_${userId}_${++channelCounter}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
        async () => {
          const budget = await this.getBudget(userId);
          const categoryBudgets = await this.getCategoryBudgets(userId);
          callback(budget, categoryBudgets);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'category_budgets', filter: `user_id=eq.${userId}` },
        async () => {
          const budget = await this.getBudget(userId);
          const categoryBudgets = await this.getCategoryBudgets(userId);
          callback(budget, categoryBudgets);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // GOALS
  static async addGoal(
    userId: string,
    goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Goal> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          name: goal.name,
          target_amount: goal.targetAmount,
          current_amount: goal.currentAmount,
          target_date: goal.targetDate,
          status: goal.status,
          icon: goal.icon,
        })
        .select()
        .single();

      if (error) handleError(error);

      return {
        id: data.id,
        name: data.name,
        targetAmount: parseFloat(data.target_amount),
        currentAmount: parseFloat(data.current_amount),
        targetDate: data.target_date,
        status: data.status,
        icon: data.icon,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async updateGoal(
    userId: string,
    id: string,
    updates: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Goal> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.targetAmount !== undefined) updateData.target_amount = updates.targetAmount;
      if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount;
      if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      const { data, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) handleError(error);
      return {
        id: data.id,
        name: data.name,
        targetAmount: parseFloat(data.target_amount),
        currentAmount: parseFloat(data.current_amount),
        targetDate: data.target_date,
        status: data.status,
        icon: data.icon,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async deleteGoal(userId: string, id: string): Promise<void> {
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
      if (error) handleError(error);
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async getGoals(userId: string): Promise<Goal[]> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) handleError(error);
      return (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        targetAmount: parseFloat(item.target_amount),
        currentAmount: parseFloat(item.current_amount),
        targetDate: item.target_date,
        status: item.status,
        icon: item.icon,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static subscribeToGoals(userId: string, callback: (goals: Goal[]) => void): () => void {
    console.log('Setting up goals real-time subscription for user:', userId);

    // Use unique channel name to avoid conflicts
    const channelName = `goals_${userId}_${++channelCounter}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        async (payload) => {
          console.log('Goals real-time update received:', payload.eventType);
          try {
            const goals = await this.getGoals(userId);
            callback(goals);
          } catch (error) {
            console.error('Error fetching goals after real-time update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Goals subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from goals real-time updates');
      supabase.removeChannel(channel);
    };
  }

  // SETTINGS
  static async updateSettings(
    userId: string,
    settings: Partial<Omit<Settings, 'createdAt' | 'updatedAt'>>
  ): Promise<Settings> {
    try {
      // Use RPC function that handles upsert with auth.uid() automatically
      // This avoids RLS issues by using SECURITY DEFINER
      const { data, error } = await supabase.rpc('upsert_user_settings', {
        p_currency: settings.currency ?? null,
        p_currency_symbol: settings.currencySymbol ?? null,
        p_theme: settings.theme ?? null,
        p_preferred_categories: settings.preferredCategories ?? null,
        p_has_completed_onboarding: settings.hasCompletedOnboarding ?? null,
        p_user_name: settings.userName ?? null,
      });

      if (error) handleError(error);

      return {
        currency: data.currency,
        currencySymbol: data.currency_symbol,
        theme: data.theme,
        preferredCategories: data.preferred_categories || [],
        hasCompletedOnboarding: data.has_completed_onboarding,
        userName: data.user_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }

  static async getSettings(userId: string): Promise<Settings | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        handleError(error);
      }
      if (!data) return null;
      return {
        currency: data.currency,
        currencySymbol: data.currency_symbol,
        theme: data.theme,
        preferredCategories: data.preferred_categories || [],
        hasCompletedOnboarding: data.has_completed_onboarding,
        userName: data.user_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      handleError(error);
    }
  }
}
