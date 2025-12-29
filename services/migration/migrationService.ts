// Migration Service - Migrate local data to Supabase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseService } from '../supabase/supabaseService';
import { StorageService } from '../storage';
import type {
  Transaction,
  RecurringTransaction,
  Budget,
  CategoryBudget,
  Goal,
} from '@/types/models';

export interface MigrationResult {
  success: boolean;
  migratedCounts: {
    transactions: number;
    recurringTransactions: number;
    budgets: number;
    categoryBudgets: number;
    goals: number;
  };
  skippedCounts: {
    transactions: number;
    recurringTransactions: number;
    budgets: number;
    categoryBudgets: number;
    goals: number;
  };
  errors: string[];
}

export interface LocalDataSummary {
  transactions: number;
  recurringTransactions: number;
  budgets: number;
  goals: number;
}

const BATCH_SIZE = 50;

// Helper function to get user-specific migration key
const getMigrationStatusKey = (userId: string) => `@migration_completed_${userId}`;

export class MigrationService {
  /**
   * Check if user has local data that needs migration
   */
  static async hasLocalData(): Promise<boolean> {
    try {
      const [transactions, recurringTransactions, budget, categoryBudgets, goals] =
        await Promise.all([
          StorageService.get<Transaction[]>(StorageService.KEYS.TRANSACTIONS),
          StorageService.get<RecurringTransaction[]>(StorageService.KEYS.RECURRING_TRANSACTIONS),
          StorageService.get<Budget>(StorageService.KEYS.BUDGET),
          StorageService.get<CategoryBudget[]>(StorageService.KEYS.CATEGORY_BUDGETS),
          StorageService.get<Goal[]>(StorageService.KEYS.GOALS),
        ]);

      // Check for actual data content, not just existence
      const hasTransactions = transactions && transactions.length > 0;
      const hasRecurring = recurringTransactions && recurringTransactions.length > 0;
      const hasBudget = budget && budget.amount > 0; // Check amount, not just null
      const hasCategoryBudgets = categoryBudgets && categoryBudgets.length > 0;
      const hasGoals = goals && goals.length > 0;

      const hasData =
        hasTransactions || hasRecurring || hasBudget || hasCategoryBudgets || hasGoals;

      // Detailed logging for debugging
      console.log('Local data check:', {
        transactions: transactions?.length || 0,
        recurringTransactions: recurringTransactions?.length || 0,
        budgetAmount: budget?.amount || 0,
        categoryBudgets: categoryBudgets?.length || 0,
        goals: goals?.length || 0,
        hasData,
      });

      return !!hasData;
    } catch (error) {
      console.error('Error checking local data:', error);
      return false;
    }
  }

  /**
   * Get summary of local data
   */
  static async getLocalDataSummary(): Promise<LocalDataSummary> {
    try {
      const [transactions, recurringTransactions, budgets, goals] = await Promise.all([
        StorageService.get<Transaction[]>(StorageService.KEYS.TRANSACTIONS),
        StorageService.get<RecurringTransaction[]>(StorageService.KEYS.RECURRING_TRANSACTIONS),
        StorageService.get<Budget>(StorageService.KEYS.BUDGET),
        StorageService.get<Goal[]>(StorageService.KEYS.GOALS),
      ]);

      return {
        transactions: transactions?.length || 0,
        recurringTransactions: recurringTransactions?.length || 0,
        budgets: budgets ? 1 : 0,
        goals: goals?.length || 0,
      };
    } catch (error) {
      console.error('Error getting local data summary:', error);
      return {
        transactions: 0,
        recurringTransactions: 0,
        budgets: 0,
        goals: 0,
      };
    }
  }

  /**
   * Check if there's NEW local data that doesn't exist in Supabase
   * Used to determine if migration modal should be shown for repeat logins
   * 
   * Checks: transactions, recurring transactions, goals, budget, and category budgets
   */
  static async hasNewLocalData(userId: string): Promise<boolean> {
    try {
      console.log('Checking for NEW local data not in Supabase...');

      // 1. Get local data from AsyncStorage (including budget and category budgets)
      const [localTransactions, localRecurring, localGoals, localBudget, localCategoryBudgets] = 
        await Promise.all([
          StorageService.get<Transaction[]>(StorageService.KEYS.TRANSACTIONS),
          StorageService.get<RecurringTransaction[]>(StorageService.KEYS.RECURRING_TRANSACTIONS),
          StorageService.get<Goal[]>(StorageService.KEYS.GOALS),
          StorageService.get<Budget>(StorageService.KEYS.BUDGET),
          StorageService.get<CategoryBudget[]>(StorageService.KEYS.CATEGORY_BUDGETS),
        ]);

      // 2. Get existing data from Supabase (parallel for performance)
      const [existingTransactionIds, existingRecurringIds, existingGoalIds, existingBudget, existingCategoryBudgets] = 
        await Promise.all([
          this.getExistingTransactionIds(userId),
          this.getExistingRecurringIds(userId),
          this.getExistingGoalIds(userId),
          SupabaseService.getBudget(userId),
          SupabaseService.getCategoryBudgets(userId),
        ]);

      // 3. Filter out duplicates by ID
      const newTransactions = this.filterDuplicateTransactions(
        localTransactions || [],
        existingTransactionIds
      );

      const newRecurring = this.filterDuplicateRecurring(
        localRecurring || [],
        existingRecurringIds
      );

      const newGoals = this.filterDuplicateGoals(
        localGoals || [],
        existingGoalIds
      );

      // 4. Check for new budget (local exists with amount > 0, but cloud doesn't exist)
      const hasNewBudget = !!(localBudget && localBudget.amount > 0 && !existingBudget);

      // 5. Check for new category budgets (local categories not in cloud)
      let hasNewCategoryBudgets = false;
      if (localCategoryBudgets && localCategoryBudgets.length > 0) {
        const existingCategories = new Set(
          (existingCategoryBudgets || []).map(cb => `${cb.category}_${cb.period}`)
        );
        hasNewCategoryBudgets = localCategoryBudgets.some(
          cb => !existingCategories.has(`${cb.category}_${cb.period}`)
        );
      }

      // 6. Check if any new data exists
      const hasNew = 
        newTransactions.length > 0 || 
        newRecurring.length > 0 || 
        newGoals.length > 0 ||
        hasNewBudget ||
        hasNewCategoryBudgets;

      console.log('New local data check:', {
        newTransactions: newTransactions.length,
        newRecurring: newRecurring.length,
        newGoals: newGoals.length,
        hasNewBudget,
        hasNewCategoryBudgets,
        hasNew,
      });

      return hasNew;
    } catch (error) {
      console.error('Error checking for new local data:', error);
      // Safe fallback: assume no new data on error
      return false;
    }
  }

  /**
   * Get list of existing transaction IDs from Supabase
   */
  static async getExistingTransactionIds(userId: string): Promise<Set<string>> {
    try {
      const transactions = await SupabaseService.getTransactions(userId);
      return new Set(transactions.map((t) => t.id));
    } catch (error) {
      console.warn('Failed to fetch existing transaction IDs:', error);
      return new Set();
    }
  }

  /**
   * Get list of existing recurring transaction IDs from Supabase
   */
  static async getExistingRecurringIds(userId: string): Promise<Set<string>> {
    try {
      const recurring = await SupabaseService.getRecurringTransactions(userId);
      return new Set(recurring.map((r) => r.id));
    } catch (error) {
      console.warn('Failed to fetch existing recurring transaction IDs:', error);
      return new Set();
    }
  }

  /**
   * Get list of existing goal IDs from Supabase
   */
  static async getExistingGoalIds(userId: string): Promise<Set<string>> {
    try {
      const goals = await SupabaseService.getGoals(userId);
      return new Set(goals.map((g) => g.id));
    } catch (error) {
      console.warn('Failed to fetch existing goal IDs:', error);
      return new Set();
    }
  }

  /**
   * Filter out transactions that already exist in Supabase
   */
  static filterDuplicateTransactions(
    localTransactions: Transaction[],
    existingIds: Set<string>
  ): Transaction[] {
    return localTransactions.filter((t) => !existingIds.has(t.id));
  }

  /**
   * Filter out recurring transactions that already exist in Supabase
   */
  static filterDuplicateRecurring(
    localRecurring: RecurringTransaction[],
    existingIds: Set<string>
  ): RecurringTransaction[] {
    return localRecurring.filter((r) => !existingIds.has(r.id));
  }

  /**
   * Filter out goals that already exist in Supabase
   */
  static filterDuplicateGoals(localGoals: Goal[], existingIds: Set<string>): Goal[] {
    return localGoals.filter((g) => !existingIds.has(g.id));
  }

  /**
   * Migrate local data to cloud
   */
  static async migrateToCloud(
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCounts: {
        transactions: 0,
        recurringTransactions: 0,
        budgets: 0,
        categoryBudgets: 0,
        goals: 0,
      },
      skippedCounts: {
        transactions: 0,
        recurringTransactions: 0,
        budgets: 0,
        categoryBudgets: 0,
        goals: 0,
      },
      errors: [],
    };

    try {
      console.log('Starting data migration for user:', userId);

      // Load all local data
      const [transactions, recurringTransactions, budget, categoryBudgets, goals] =
        await Promise.all([
          StorageService.get<Transaction[]>(StorageService.KEYS.TRANSACTIONS),
          StorageService.get<RecurringTransaction[]>(StorageService.KEYS.RECURRING_TRANSACTIONS),
          StorageService.get<Budget>(StorageService.KEYS.BUDGET),
          StorageService.get<CategoryBudget[]>(StorageService.KEYS.CATEGORY_BUDGETS),
          StorageService.get<Goal[]>(StorageService.KEYS.GOALS),
        ]);

      const totalItems =
        (transactions?.length || 0) +
        (recurringTransactions?.length || 0) +
        (budget ? 1 : 0) +
        (categoryBudgets?.length || 0) +
        (goals?.length || 0);

      let migratedItems = 0;

      // Helper to update progress
      const updateProgress = () => {
        if (onProgress) {
          const progress = totalItems > 0 ? (migratedItems / totalItems) * 100 : 100;
          onProgress(Math.round(progress));
        }
      };

      // Fetch existing IDs from Supabase for duplicate detection
      console.log('Fetching existing data IDs from Supabase for duplicate detection...');
      let existingTransactionIds: Set<string>;
      let existingRecurringIds: Set<string>;
      let existingGoalIds: Set<string>;

      try {
        [existingTransactionIds, existingRecurringIds, existingGoalIds] = await Promise.all([
          this.getExistingTransactionIds(userId),
          this.getExistingRecurringIds(userId),
          this.getExistingGoalIds(userId),
        ]);
        console.log('Existing data IDs in Supabase:', {
          transactions: existingTransactionIds.size,
          recurring: existingRecurringIds.size,
          goals: existingGoalIds.size,
        });
      } catch (error) {
        console.warn('Error fetching existing IDs, proceeding without duplicate check:', error);
        existingTransactionIds = new Set();
        existingRecurringIds = new Set();
        existingGoalIds = new Set();
      }

      // Migrate transactions in batches (skip duplicates by ID)
      if (transactions && transactions.length > 0) {
        console.log(`Processing ${transactions.length} transactions...`);

        // Filter out transactions that already exist by ID
        const transactionsToMigrate = this.filterDuplicateTransactions(
          transactions,
          existingTransactionIds
        );
        const skippedCount = transactions.length - transactionsToMigrate.length;

        console.log(
          `${transactionsToMigrate.length} new transactions to migrate, ${skippedCount} already exist (skipped)`
        );

        result.skippedCounts.transactions = skippedCount;

        for (let i = 0; i < transactionsToMigrate.length; i += BATCH_SIZE) {
          const batch = transactionsToMigrate.slice(i, i + BATCH_SIZE);
          for (const transaction of batch) {
            try {
              await SupabaseService.addTransaction(userId, {
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                recurringId: transaction.recurringId,
              });
              result.migratedCounts.transactions++;
              migratedItems++;
              updateProgress();
            } catch (error: any) {
              console.error('Failed to migrate transaction:', error);
              // Check if it's a duplicate key error (backup server-side check)
              if (error.message?.includes('duplicate key')) {
                console.log('Transaction duplicate detected by server, skipping');
                result.skippedCounts.transactions++;
              } else {
                result.errors.push(`Transaction: ${error.message}`);
              }
              migratedItems++;
              updateProgress();
            }
          }
        }

        // Count skipped transactions in progress
        migratedItems += skippedCount;
        updateProgress();
      }

      // Migrate recurring transactions (skip duplicates by ID)
      if (recurringTransactions && recurringTransactions.length > 0) {
        console.log(`Processing ${recurringTransactions.length} recurring transactions...`);

        // Filter out recurring transactions that already exist by ID
        const recurringToMigrate = this.filterDuplicateRecurring(
          recurringTransactions,
          existingRecurringIds
        );
        const skippedCount = recurringTransactions.length - recurringToMigrate.length;

        console.log(
          `${recurringToMigrate.length} new recurring transactions to migrate, ${skippedCount} already exist (skipped)`
        );

        result.skippedCounts.recurringTransactions = skippedCount;

        for (const recurring of recurringToMigrate) {
          try {
            await SupabaseService.addRecurringTransaction(userId, {
              type: recurring.type,
              amount: recurring.amount,
              category: recurring.category,
              description: recurring.description,
              frequency: recurring.frequency,
              startDate: recurring.startDate,
              endDate: recurring.endDate,
              lastCreated: recurring.lastCreated,
              isActive: recurring.isActive,
            });
            result.migratedCounts.recurringTransactions++;
            migratedItems++;
            updateProgress();
          } catch (error: any) {
            console.error('Failed to migrate recurring transaction:', error);
            if (error.message?.includes('duplicate key')) {
              console.log('Recurring transaction duplicate detected by server, skipping');
              result.skippedCounts.recurringTransactions++;
            } else {
              result.errors.push(`Recurring: ${error.message}`);
            }
            migratedItems++;
            updateProgress();
          }
        }

        // Count skipped recurring transactions in progress
        migratedItems += skippedCount;
        updateProgress();
      }

      // Migrate budget
      if (budget) {
        console.log('Migrating budget...');
        try {
          // setBudget handles both create and update (upsert)
          await SupabaseService.setBudget(userId, {
            amount: budget.amount,
            period: budget.period,
            startDate: budget.startDate,
          });
          result.migratedCounts.budgets++;
          migratedItems++;
          updateProgress();
        } catch (error: any) {
          console.error('Failed to migrate budget:', error);
          result.errors.push(`Budget: ${error.message}`);
        }
      }

      // Migrate category budgets
      if (categoryBudgets && categoryBudgets.length > 0) {
        console.log(`Migrating ${categoryBudgets.length} category budgets...`);

        // First, get existing category budgets from Supabase
        let existingCategoryBudgets: CategoryBudget[] = [];
        try {
          existingCategoryBudgets = await SupabaseService.getCategoryBudgets(userId);
        } catch {
          console.log('No existing category budgets found');
        }

        for (const categoryBudget of categoryBudgets) {
          try {
            // Check if this category budget already exists
            const existing = existingCategoryBudgets.find(
              (cb) => cb.category === categoryBudget.category && cb.period === categoryBudget.period
            );

            if (existing) {
              // Update existing category budget
              console.log(`Updating existing category budget for ${categoryBudget.category}`);
              await SupabaseService.updateCategoryBudget(userId, existing.id, {
                amount: categoryBudget.amount,
              });
            } else {
              // Create new category budget
              await SupabaseService.addCategoryBudget(userId, {
                category: categoryBudget.category,
                amount: categoryBudget.amount,
                period: categoryBudget.period,
              });
            }

            result.migratedCounts.categoryBudgets++;
            migratedItems++;
            updateProgress();
          } catch (error: any) {
            console.error('Failed to migrate category budget:', error);
            // Don't add to errors if it's just a duplicate - it's already there
            if (!error.message?.includes('duplicate key')) {
              result.errors.push(`Category Budget: ${error.message}`);
            } else {
              console.log(
                `Category budget for ${categoryBudget.category} already exists, skipping`
              );
              result.migratedCounts.categoryBudgets++;
              migratedItems++;
              updateProgress();
            }
          }
        }
      }

      // Migrate goals (skip duplicates by ID)
      if (goals && goals.length > 0) {
        console.log(`Processing ${goals.length} goals...`);

        // Filter out goals that already exist by ID
        const goalsToMigrate = this.filterDuplicateGoals(goals, existingGoalIds);
        const skippedCount = goals.length - goalsToMigrate.length;

        console.log(
          `${goalsToMigrate.length} new goals to migrate, ${skippedCount} already exist (skipped)`
        );

        result.skippedCounts.goals = skippedCount;

        for (const goal of goalsToMigrate) {
          try {
            await SupabaseService.addGoal(userId, {
              name: goal.name,
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount,
              targetDate: goal.targetDate,
              status: goal.status,
              icon: goal.icon,
            });
            result.migratedCounts.goals++;
            migratedItems++;
            updateProgress();
          } catch (error: any) {
            console.error('Failed to migrate goal:', error);
            if (error.message?.includes('duplicate key')) {
              console.log('Goal duplicate detected by server, skipping');
              result.skippedCounts.goals++;
            } else {
              result.errors.push(`Goal: ${error.message}`);
            }
            migratedItems++;
            updateProgress();
          }
        }

        // Count skipped goals in progress
        migratedItems += skippedCount;
        updateProgress();
      }

      // Mark migration as completed for this user FIRST
      await AsyncStorage.setItem(getMigrationStatusKey(userId), 'completed');

      // Clear local data after successful migration to prevent re-migration
      if (result.errors.length === 0) {
        console.log('Migration successful - clearing local data cache to prevent duplicates');
        await this.clearLocalDataCache();
      } else {
        console.log(
          `Migration had ${result.errors.length} errors - keeping local data for potential retry`
        );
      }

      result.success = result.errors.length === 0;

      console.log('Migration completed:', result);
      return result;
    } catch (error: any) {
      console.error('Migration failed:', error);
      result.errors.push(`Fatal error: ${error.message}`);
      return result;
    }
  }

  /**
   * Check if migration has been completed for a specific user
   */
  static async isMigrationCompleted(userId: string): Promise<boolean> {
    try {
      const status = await AsyncStorage.getItem(getMigrationStatusKey(userId));
      return status === 'completed';
    } catch {
      return false;
    }
  }

  /**
   * Mark migration as completed for a specific user (even if skipped)
   */
  static async markMigrationCompleted(userId: string): Promise<void> {
    await AsyncStorage.setItem(getMigrationStatusKey(userId), 'completed');
  }

  /**
   * Reset migration status for a specific user (for testing)
   */
  static async resetMigrationStatus(userId: string): Promise<void> {
    await AsyncStorage.removeItem(getMigrationStatusKey(userId));
  }

  /**
   * Clear local data cache from AsyncStorage
   * Used when authenticated user signs in to prevent guest data contamination
   * Preserves migration completion flags
   */
  static async clearLocalDataCache(): Promise<void> {
    try {
      console.log('Clearing local data cache from AsyncStorage...');
      await Promise.all([
        StorageService.remove(StorageService.KEYS.TRANSACTIONS),
        StorageService.remove(StorageService.KEYS.RECURRING_TRANSACTIONS),
        StorageService.remove(StorageService.KEYS.BUDGET),
        StorageService.remove(StorageService.KEYS.CATEGORY_BUDGETS),
        StorageService.remove(StorageService.KEYS.GOALS),
        StorageService.remove(StorageService.KEYS.BUDGET_ALERTS),
        StorageService.remove(StorageService.KEYS.SETTINGS), // Clear guest settings
      ]);
      console.log('Local data cache cleared successfully (including settings)');
    } catch (error) {
      console.error('Error clearing local data cache:', error);
      throw error;
    }
  }
}
