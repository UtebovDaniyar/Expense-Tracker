import '../global.css';

import { Stack } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeStores } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useGoalsStore } from '@/store/goalsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { AuthService } from '@/services/auth/authService';
import { NetworkService } from '@/services/network/networkService';
import { SyncService } from '@/services/sync/syncService';
import { MigrationService } from '@/services/migration/migrationService';
import { useMigrationCheck } from '@/hooks/useMigrationCheck';
import DataMigrationModal from '@/app/(modals)/data-migration';
import { supabase } from '@/services/supabase/config';

export default function Layout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const { setUser, setInitializing } = useAuthStore();
  const { showMigrationModal, handleMigrationComplete, handleMigrationSkip } = useMigrationCheck();

  useEffect(() => {
    async function initialize() {
      try {
        // Test Supabase connection first
        const { testSupabaseConnection } = await import('@/services/supabase/testConnection');
        const connectionTest = await testSupabaseConnection();
        console.log('Supabase connection test:', connectionTest);

        if (!connectionTest.success) {
          console.error('Supabase connection failed:', connectionTest.message);
        }

        // Check for existing session FIRST (before loading any data)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log('Initial session check:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          email: session?.user?.email,
        });

        // If we have a session, set the user immediately
        if (session?.user) {
          setUser(session.user);
          
          // ✅ Load settings BEFORE allowing navigation to prevent onboarding flicker
          console.log('Authenticated user - loading settings before navigation');
          const { useSettingsStore } = await import('@/store/settingsStore');
          await useSettingsStore.getState().loadSettings();
          console.log('Settings loaded successfully');
          
          setIsLoadingSettings(false);
          
          // For authenticated users: Skip initializeStores()
          // Data will be loaded from Supabase after migration check
          console.log('Authenticated user detected - skipping initializeStores()');
        } else {
          // Guest mode: Initialize stores from AsyncStorage
          console.log('Guest mode - initializing stores from AsyncStorage');
          await initializeStores();
          setIsLoadingSettings(false);
        }

        // Initialize NetworkService for connectivity monitoring
        NetworkService.initialize();
        console.log('NetworkService initialized');

        // Initialize SyncService
        await SyncService.initialize();
        console.log('SyncService initialized');

        // Listen to auth state changes
        const unsubscribe = AuthService.onAuthStateChanged((supabaseUser) => {
          console.log('Auth state changed:', {
            hasUser: !!supabaseUser,
            userId: supabaseUser?.id,
            email: supabaseUser?.email,
            emailVerified: !!supabaseUser?.email_confirmed_at,
          });
          setUser(supabaseUser);
          setInitializing(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitializing(false);
        setIsLoadingSettings(false);
      } finally {
        setIsLoading(false);
      }
    }

    const unsubscribe = initialize();

    return () => {
      unsubscribe?.then((unsub) => unsub?.());
    };
  }, []);

  // Handle real-time sync based on auth state
  const user = useAuthStore((state) => state.user);
  const syncStartedRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run when user ID changes, not on every token refresh
    const userId = user?.id || null;
    const userChanged = userId !== currentUserIdRef.current;
    currentUserIdRef.current = userId;

    if (user && !syncStartedRef.current && userChanged) {
      // User signed in - but DON'T load data yet if migration modal will be shown
      // Migration will happen first, then data will be loaded
      console.log('User signed in, checking if migration is needed before loading data');

      const transactionsStore = useTransactionsStore.getState();
      const budgetStore = useBudgetStore.getState();
      const goalsStore = useGoalsStore.getState();
      const settingsStore = useSettingsStore.getState();

      // Load data sequentially to avoid race conditions
      const loadDataSequentially = async () => {
        try {
          // 1. ALWAYS clear cache before loading cloud data (UNCONDITIONAL)
          // This prevents stale guest data from blocking authenticated user data
          console.log('Clearing AsyncStorage cache before loading cloud data');
          try {
            await MigrationService.clearLocalDataCache();
          } catch (error) {
            console.error('Failed to clear cache, continuing with data load:', error);
            // Non-critical error - continue with data loading
          }

          // 2. Load settings first (lightweight)
          await settingsStore.loadSettings();

          // 3. Sync displayName AFTER migration check (for existing users)
          if (user.displayName) {
            const currentUserName = settingsStore.settings.userName;
            if (currentUserName !== user.displayName) {
              console.log(
                `Syncing displayName from profiles to settings: "${user.displayName}" (was: "${currentUserName}")`
              );
              await settingsStore.updateSettings({ userName: user.displayName });
            }
          }

          // 4. Load data from cloud (only if not already loaded)
          if (!dataLoadedRef.current) {
            dataLoadedRef.current = true;

            console.log('Loading data from Supabase cloud...');
            await Promise.all([
              transactionsStore.loadTransactions(),
              budgetStore.loadBudget(),
              goalsStore.loadGoals(),
            ]);

            console.log('Data loaded from cloud, starting real-time sync');
          }

          // 5. Start real-time sync
          if (!syncStartedRef.current) {
            transactionsStore.startRealtimeSync();
            budgetStore.startRealtimeSync();
            goalsStore.startRealtimeSync();
            syncStartedRef.current = true;
          }
        } catch (error) {
          console.error('Failed to load data:', error);
          // Still start real-time sync even if initial load fails
          if (!syncStartedRef.current) {
            transactionsStore.startRealtimeSync();
            budgetStore.startRealtimeSync();
            goalsStore.startRealtimeSync();
            syncStartedRef.current = true;
          }
        }
      };

      loadDataSequentially();
    } else if (!user && currentUserIdRef.current !== null) {
      // ✅ User signed out - ALWAYS clean up (unconditional)
      console.log('User signed out, cleaning up all stores and cache');

      const transactionsStore = useTransactionsStore.getState();
      const budgetStore = useBudgetStore.getState();
      const goalsStore = useGoalsStore.getState();
      const settingsStore = useSettingsStore.getState();

      // 1. Reset all Zustand stores (clear memory) - MOST CRITICAL
      // Wrap each reset in try-catch to ensure all stores get reset even if one fails
      try {
        transactionsStore.reset();
      } catch (error) {
        console.error('Failed to reset transactions store:', error);
      }

      try {
        budgetStore.reset();
      } catch (error) {
        console.error('Failed to reset budget store:', error);
      }

      try {
        goalsStore.reset();
      } catch (error) {
        console.error('Failed to reset goals store:', error);
      }

      try {
        settingsStore.reset();
      } catch (error) {
        console.error('Failed to reset settings store:', error);
      }

      // 2. Stop real-time sync (if it was started)
      if (syncStartedRef.current) {
        transactionsStore.stopRealtimeSync();
        budgetStore.stopRealtimeSync();
        goalsStore.stopRealtimeSync();
      }

      // 3. Clear AsyncStorage cache to prevent data contamination between users
      MigrationService.clearLocalDataCache().catch((error) => {
        console.error('Failed to clear cache on sign out:', error);
        // Non-critical error - stores are already clean in memory
      });

      // 4. Reset flags
      syncStartedRef.current = false;
      dataLoadedRef.current = false;
      currentUserIdRef.current = null;

      console.log('Sign out cleanup completed');
    }
  }, [user?.id]); // Only depend on user.id, not the whole user object

  // ✅ Show loading until settings are ready to prevent onboarding flicker
  if (isLoading || isLoadingSettings) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Data Migration Modal */}
      <DataMigrationModal
        visible={showMigrationModal}
        onClose={handleMigrationSkip}
        onComplete={handleMigrationComplete}
      />
    </GestureHandlerRootView>
  );
}
