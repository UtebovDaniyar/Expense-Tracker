// DEPRECATED: This file is kept for compatibility but not functional
// TODO: Migrate to Supabase

import { Transaction, RecurringTransaction, Category } from '@/types/models';

export interface Budget {
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
}

export interface CategoryBudget {
  category: Category;
  amount: number;
  spent: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  onboardingCompleted: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
}

// Stub implementation - does nothing
export class FirestoreService {
  static async addTransaction(userId: string, transaction: Transaction): Promise<string> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
    return transaction.id;
  }

  static async updateTransaction(
    userId: string,
    transactionId: string,
    updates: Partial<Transaction>
  ): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getTransactions(userId: string): Promise<Transaction[]> {
    console.warn('FirestoreService is deprecated. Returning empty array.');
    return [];
  }

  static subscribeToTransactions(
    userId: string,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    console.warn('FirestoreService is deprecated. No real-time sync.');
    return () => {};
  }

  static async addRecurringTransaction(
    userId: string,
    recurring: RecurringTransaction
  ): Promise<string> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
    return recurring.id;
  }

  static async updateRecurringTransaction(
    userId: string,
    recurringId: string,
    updates: Partial<RecurringTransaction>
  ): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async deleteRecurringTransaction(userId: string, recurringId: string): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
    console.warn('FirestoreService is deprecated. Returning empty array.');
    return [];
  }

  static async setBudget(userId: string, budget: Budget): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getBudget(userId: string): Promise<Budget | null> {
    console.warn('FirestoreService is deprecated. Returning null.');
    return null;
  }

  static async addCategoryBudget(userId: string, categoryBudget: CategoryBudget): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async updateCategoryBudget(
    userId: string,
    category: Category,
    updates: Partial<CategoryBudget>
  ): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async deleteCategoryBudget(userId: string, category: Category): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getCategoryBudgets(userId: string): Promise<CategoryBudget[]> {
    console.warn('FirestoreService is deprecated. Returning empty array.');
    return [];
  }

  static subscribeToBudget(
    userId: string,
    callback: (budget: Budget | null, categories: CategoryBudget[]) => void
  ): () => void {
    console.warn('FirestoreService is deprecated. No real-time sync.');
    return () => {};
  }

  static async addGoal(userId: string, goal: Goal): Promise<string> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
    return goal.id;
  }

  static async updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async deleteGoal(userId: string, goalId: string): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getGoals(userId: string): Promise<Goal[]> {
    console.warn('FirestoreService is deprecated. Returning empty array.');
    return [];
  }

  static subscribeToGoals(userId: string, callback: (goals: Goal[]) => void): () => void {
    console.warn('FirestoreService is deprecated. No real-time sync.');
    return () => {};
  }

  static async updateSettings(userId: string, settings: Partial<Settings>): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getSettings(userId: string): Promise<Settings | null> {
    console.warn('FirestoreService is deprecated. Returning null.');
    return null;
  }

  static async createUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.warn('FirestoreService is deprecated. Returning null.');
    return null;
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    console.warn('FirestoreService is deprecated. Data saved locally only.');
  }

  static async deleteAllUserData(userId: string): Promise<void> {
    console.warn('FirestoreService is deprecated. No cloud data to delete.');
  }
}
