// Local storage service using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  // Storage keys
  static readonly KEYS = {
    TRANSACTIONS: '@pennywise/transactions',
    RECURRING_TRANSACTIONS: '@pennywise/recurring_transactions',
    BUDGET: '@pennywise/budget',
    CATEGORY_BUDGETS: '@pennywise/category_budgets',
    BUDGET_ALERTS: '@pennywise/budget_alerts',
    GOALS: '@pennywise/goals',
    SETTINGS: '@pennywise/settings',
  };

  // Generic get method
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  // Generic set method
  static async set<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      throw error;
    }
  }

  // Remove specific key
  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      throw error;
    }
  }

  // Clear all storage
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
