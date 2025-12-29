import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { MigrationService } from '@/services/migration/migrationService';

/**
 * Hook to check if user has local data that needs migration
 * Shows migration modal after sign-up if local data exists
 */
export function useMigrationCheck() {
  const { user } = useAuthStore();
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const checkedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only check once per user ID to avoid multiple checks on token refresh
    if (user && user.id !== checkedUserIdRef.current) {
      checkedUserIdRef.current = user.id;
      checkForMigration();
    } else if (!user) {
      // Reset when user signs out
      checkedUserIdRef.current = null;
    }
  }, [user?.id]); // Only depend on user.id, not the whole user object

  const checkForMigration = async () => {
    // Only check once per user ID to avoid multiple checks on token refresh
    if (!user || isChecking) {
      // Reset modal state if user signed out
      if (!user && showMigrationModal) {
        setShowMigrationModal(false);
      }
      return;
    }

    setIsChecking(true);

    try {
      console.log('Checking for local data to migrate for user:', user.id);

      // ✅ STEP 1: Check if migration was already completed for this user
      const isCompleted = await MigrationService.isMigrationCompleted(user.id);
      
      if (isCompleted) {
        // Migration was done before - check if there's NEW data created after migration
        console.log('Migration completed before - checking for NEW data');
        const hasNewData = await MigrationService.hasNewLocalData(user.id);
        
        if (hasNewData) {
          console.log('Found NEW local data created after migration - showing modal');
          setShowMigrationModal(true);
        } else {
          console.log('No new data - clearing old cache');
          await MigrationService.clearLocalDataCache();
          setShowMigrationModal(false);
        }
        return;
      }

      // ✅ STEP 2: First time migration - check if there's ANY local data
      const hasData = await MigrationService.hasLocalData();
      console.log('Has local data:', hasData);

      if (hasData) {
        console.log('Local data found - showing migration modal');
        setShowMigrationModal(true);
      } else {
        console.log('No local data to migrate, clearing cache');
        await MigrationService.clearLocalDataCache();
        setShowMigrationModal(false);
      }
    } catch (error) {
      console.error('Failed to check for migration:', error);
      // Don't show migration modal if there was an error
      setShowMigrationModal(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigrationComplete = async () => {
    setShowMigrationModal(false);

    try {
      // Verify user is still authenticated before proceeding
      if (!user) {
        console.error('User signed out during migration - aborting post-migration setup');
        return;
      }

      // Migration service already sets the flag in migrateToCloud
      console.log('Migration completed - now loading data from cloud');

      // After migration, load data from cloud and start sync
      const { useTransactionsStore } = await import('@/store/transactionsStore');
      const { useBudgetStore } = await import('@/store/budgetStore');
      const { useGoalsStore } = await import('@/store/goalsStore');
      const { useSettingsStore } = await import('@/store/settingsStore');

      const transactionsStore = useTransactionsStore.getState();
      const budgetStore = useBudgetStore.getState();
      const goalsStore = useGoalsStore.getState();
      const settingsStore = useSettingsStore.getState();

      // Load settings FIRST to ensure hasCompletedOnboarding is loaded from Supabase
      // This prevents guest settings from contaminating authenticated session
      await settingsStore.loadSettings();

      // Load fresh data from Supabase (which now includes migrated data)
      await Promise.all([
        transactionsStore.loadTransactions(),
        budgetStore.loadBudget(),
        goalsStore.loadGoals(),
      ]);

      // Sync displayName after migration (for new users)
      if (user && user.displayName) {
        const currentUserName = settingsStore.settings.userName;
        if (currentUserName !== user.displayName) {
          console.log(
            `Syncing displayName after migration: "${user.displayName}" (was: "${currentUserName}")`
          );
          await settingsStore.updateSettings({ userName: user.displayName });
        }
      }

      // Start real-time sync
      transactionsStore.startRealtimeSync();
      budgetStore.startRealtimeSync();
      goalsStore.startRealtimeSync();

      console.log('Post-migration data load and sync started successfully');
    } catch (error) {
      console.error('Error in post-migration setup:', error);
    }
  };

  const handleMigrationSkip = async () => {
    setShowMigrationModal(false);

    try {
      // ✅ STEP 1: Clear local data cache FIRST and wait for completion
      console.log('Migration skipped - clearing cache before loading data');
      if (user) {
        await MigrationService.clearLocalDataCache();
        console.log('Cache cleared successfully');
      }

      // ✅ STEP 2: Small delay to guarantee AsyncStorage operations completed
      await new Promise(resolve => setTimeout(resolve, 100));

      // ✅ STEP 3: Load data from cloud (after cache is cleared)
      console.log('Loading fresh data from Supabase');

      const { useTransactionsStore } = await import('@/store/transactionsStore');
      const { useBudgetStore } = await import('@/store/budgetStore');
      const { useGoalsStore } = await import('@/store/goalsStore');
      const { useSettingsStore } = await import('@/store/settingsStore');

      const transactionsStore = useTransactionsStore.getState();
      const budgetStore = useBudgetStore.getState();
      const goalsStore = useGoalsStore.getState();
      const settingsStore = useSettingsStore.getState();

      // Load settings FIRST to ensure hasCompletedOnboarding is loaded from Supabase
      // This prevents guest settings from contaminating authenticated session
      await settingsStore.loadSettings();

      // Load fresh data from Supabase (which now includes migrated data)
      await Promise.all([
        transactionsStore.loadTransactions(),
        budgetStore.loadBudget(),
        goalsStore.loadGoals(),
      ]);

      // Sync displayName after migration (for new users)
      if (user && user.displayName) {
        const currentUserName = settingsStore.settings.userName;
        if (currentUserName !== user.displayName) {
          console.log(
            `Syncing displayName after skip: "${user.displayName}" (was: "${currentUserName}")`
          );
          await settingsStore.updateSettings({ userName: user.displayName });
        }
      }

      // Start real-time sync
      transactionsStore.startRealtimeSync();
      budgetStore.startRealtimeSync();
      goalsStore.startRealtimeSync();

      console.log('Post-skip data load and sync started successfully');
    } catch (error) {
      console.error('Error in post-skip setup:', error);
    }
  };

  return {
    showMigrationModal,
    handleMigrationComplete,
    handleMigrationSkip,
  };
}
