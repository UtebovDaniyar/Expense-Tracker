// Sync Service - Manages synchronization between local and cloud
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkService } from '../network/networkService';
import { SupabaseService } from '../supabase/supabaseService';

// Sync operation types
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection:
    | 'transactions'
    | 'budgets'
    | 'goals'
    | 'settings'
    | 'recurring_transactions'
    | 'category_budgets';
  documentId?: string;
  data?: any;
  timestamp: string;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingOperations: number;
  error: string | null;
}

type SyncStatusCallback = (status: SyncStatus) => void;

const SYNC_QUEUE_KEY = '@sync_queue';
const LAST_SYNC_KEY = '@last_sync_time';
const MAX_RETRIES = 3;

export class SyncService {
  private static syncStatus: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    error: null,
  };

  private static listeners: Set<SyncStatusCallback> = new Set();
  private static isProcessing: boolean = false;

  /**
   * Initialize sync service
   */
  static async initialize(): Promise<void> {
    // Load last sync time
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (lastSync) {
      this.syncStatus.lastSyncTime = lastSync;
    }

    // Update pending operations count
    const queue = await this.getQueue();
    this.syncStatus.pendingOperations = queue.length;

    // Listen to network changes
    NetworkService.onNetworkChange((isOnline) => {
      this.syncStatus.isOnline = isOnline;
      this.notifyListeners();

      // Auto-process queue when coming online
      if (isOnline && queue.length > 0) {
        console.log('Network restored, processing sync queue...');
        this.processQueue();
      }
    });

    // Set initial online state
    this.syncStatus.isOnline = NetworkService.isOnline();
  }

  /**
   * Queue an operation for sync
   */
  static async queueOperation(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> {
    const queue = await this.getQueue();

    const newOperation: SyncOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(newOperation);
    await this.saveQueue(queue);

    this.syncStatus.pendingOperations = queue.length;
    this.notifyListeners();

    console.log('Operation queued:', newOperation.type, newOperation.collection);

    // Try to process immediately if online
    if (this.syncStatus.isOnline && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('Queue processing already in progress');
      return;
    }

    if (!this.syncStatus.isOnline) {
      console.log('Device offline, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    this.syncStatus.isSyncing = true;
    this.syncStatus.error = null;
    this.notifyListeners();

    try {
      const queue = await this.getQueue();
      console.log(`Processing ${queue.length} queued operations...`);

      const failedOperations: SyncOperation[] = [];

      for (const operation of queue) {
        try {
          await this.executeOperation(operation);
          console.log('Operation synced:', operation.type, operation.collection);
        } catch (error: any) {
          console.error('Operation failed:', operation.type, operation.collection, error);

          // Increment retry count
          operation.retryCount++;

          // Keep in queue if under max retries
          if (operation.retryCount < MAX_RETRIES) {
            failedOperations.push(operation);
          } else {
            console.error('Operation exceeded max retries, dropping:', operation);
          }
        }
      }

      // Save failed operations back to queue
      await this.saveQueue(failedOperations);

      // Update sync status
      this.syncStatus.pendingOperations = failedOperations.length;
      this.syncStatus.lastSyncTime = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, this.syncStatus.lastSyncTime);

      if (failedOperations.length > 0) {
        this.syncStatus.error = `${failedOperations.length} operations failed`;
      }

      console.log(`Queue processing complete. ${failedOperations.length} operations remaining.`);
    } catch (error: any) {
      console.error('Queue processing error:', error);
      this.syncStatus.error = error.message || 'Sync failed';
    } finally {
      this.isProcessing = false;
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Execute a single sync operation
   */
  private static async executeOperation(operation: SyncOperation): Promise<void> {
    // Get userId from operation data (should be passed when queuing)
    const userId = operation.data?.userId;

    if (!userId) {
      throw new Error('userId is required for sync operations');
    }

    try {
      switch (operation.collection) {
        case 'transactions':
          await this.executeTransactionOperation(userId, operation);
          break;

        case 'recurring_transactions':
          await this.executeRecurringTransactionOperation(userId, operation);
          break;

        case 'budgets':
          await this.executeBudgetOperation(userId, operation);
          break;

        case 'category_budgets':
          await this.executeCategoryBudgetOperation(userId, operation);
          break;

        case 'goals':
          await this.executeGoalOperation(userId, operation);
          break;

        case 'settings':
          await this.executeSettingsOperation(userId, operation);
          break;

        default:
          throw new Error(`Unknown collection: ${operation.collection}`);
      }
    } catch (error: any) {
      console.error(`Failed to execute ${operation.type} on ${operation.collection}:`, error);
      throw error;
    }
  }

  /**
   * Execute transaction operations
   */
  private static async executeTransactionOperation(
    userId: string,
    operation: SyncOperation
  ): Promise<void> {
    switch (operation.type) {
      case 'create':
        await SupabaseService.addTransaction(userId, operation.data.transaction);
        break;

      case 'update':
        if (!operation.documentId) throw new Error('documentId required for update');
        await SupabaseService.updateTransaction(
          userId,
          operation.documentId,
          operation.data.updates
        );
        break;

      case 'delete':
        if (!operation.documentId) throw new Error('documentId required for delete');
        await SupabaseService.deleteTransaction(userId, operation.documentId);
        break;
    }
  }

  /**
   * Execute recurring transaction operations
   */
  private static async executeRecurringTransactionOperation(
    userId: string,
    operation: SyncOperation
  ): Promise<void> {
    switch (operation.type) {
      case 'create':
        await SupabaseService.addRecurringTransaction(userId, operation.data.recurring);
        break;

      case 'update':
        if (!operation.documentId) throw new Error('documentId required for update');
        await SupabaseService.updateRecurringTransaction(
          userId,
          operation.documentId,
          operation.data.updates
        );
        break;

      case 'delete':
        if (!operation.documentId) throw new Error('documentId required for delete');
        await SupabaseService.deleteRecurringTransaction(userId, operation.documentId);
        break;
    }
  }

  /**
   * Execute budget operations
   */
  private static async executeBudgetOperation(
    userId: string,
    operation: SyncOperation
  ): Promise<void> {
    switch (operation.type) {
      case 'create':
      case 'update':
        // setBudget handles both create and update
        await SupabaseService.setBudget(userId, operation.data.budget);
        break;

      case 'delete':
        // Budgets are typically not deleted, but updated to 0
        // If needed, this can be implemented
        throw new Error('Budget deletion not supported');
    }
  }

  /**
   * Execute category budget operations
   */
  private static async executeCategoryBudgetOperation(
    userId: string,
    operation: SyncOperation
  ): Promise<void> {
    switch (operation.type) {
      case 'create':
        await SupabaseService.addCategoryBudget(userId, operation.data.categoryBudget);
        break;

      case 'update':
        if (!operation.documentId) throw new Error('documentId required for update');
        await SupabaseService.updateCategoryBudget(
          userId,
          operation.documentId,
          operation.data.updates
        );
        break;

      case 'delete':
        if (!operation.documentId) throw new Error('documentId required for delete');
        await SupabaseService.deleteCategoryBudget(userId, operation.documentId);
        break;
    }
  }

  /**
   * Execute goal operations
   */
  private static async executeGoalOperation(
    userId: string,
    operation: SyncOperation
  ): Promise<void> {
    switch (operation.type) {
      case 'create':
        await SupabaseService.addGoal(userId, operation.data.goal);
        break;

      case 'update':
        if (!operation.documentId) throw new Error('documentId required for update');
        await SupabaseService.updateGoal(userId, operation.documentId, operation.data.updates);
        break;

      case 'delete':
        if (!operation.documentId) throw new Error('documentId required for delete');
        await SupabaseService.deleteGoal(userId, operation.documentId);
        break;
    }
  }

  /**
   * Execute settings operations
   */
  private static async executeSettingsOperation(
    userId: string,
    operation: SyncOperation
  ): Promise<void> {
    switch (operation.type) {
      case 'create':
      case 'update':
        // updateSettings handles both create and update
        await SupabaseService.updateSettings(userId, operation.data.settings);
        break;

      case 'delete':
        // Settings are typically not deleted
        throw new Error('Settings deletion not supported');
    }
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status changes
   */
  static onSyncStatusChange(callback: SyncStatusCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if device is online
   */
  static isDeviceOnline(): boolean {
    return NetworkService.isOnline();
  }

  /**
   * Get queue status
   */
  static async getQueueStatus(): Promise<{ pending: number; operations: SyncOperation[] }> {
    const queue = await this.getQueue();
    return {
      pending: queue.length,
      operations: queue,
    };
  }

  /**
   * Clear the sync queue (use with caution)
   */
  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    this.syncStatus.pendingOperations = 0;
    this.notifyListeners();
    console.log('Sync queue cleared');
  }

  /**
   * Manual sync trigger
   */
  static async syncNow(): Promise<void> {
    if (!this.syncStatus.isOnline) {
      throw new Error('Device is offline');
    }
    await this.processQueue();
  }

  // Private helper methods

  private static async getQueue(): Promise<SyncOperation[]> {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error reading sync queue:', error);
      return [];
    }
  }

  private static async saveQueue(queue: SyncOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
      throw error;
    }
  }

  private static notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.getSyncStatus());
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }
}
