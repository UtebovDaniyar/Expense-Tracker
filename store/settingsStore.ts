// Settings store for user preferences and app configuration

import { create } from 'zustand';
import { Settings } from '@/types/models';
import { StorageService } from '@/services/storage';
import { SupabaseService } from '@/services/supabase/supabaseService';
import { SyncService } from '@/services/sync/syncService';
import { useAuthStore } from '@/store/authStore';

interface SettingsState {
  settings: Settings;
  syncing: boolean;
  syncError: string | null;

  // Actions
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;

  // Reset store to initial state
  reset: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  currencySymbol: '$',
  hasCompletedOnboarding: false,
  preferredCategories: [],
  theme: 'auto',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  syncing: false,
  syncError: null,

  updateSettings: async (updates: Partial<Settings>) => {
    const userId = useAuthStore.getState().user?.id;

    // If authenticated and online, update in Supabase first
    if (userId && SyncService.isDeviceOnline()) {
      try {
        const updatedSettings = await SupabaseService.updateSettings(userId, updates);

        set({ settings: updatedSettings, syncError: null });
        await get().saveSettings();
        return;
      } catch (error) {
        console.error('Failed to sync settings to Supabase:', error);
        set({ syncError: 'Failed to sync settings' });
        // Fall through to offline handling
      }
    }

    // Offline or sync failed: update locally
    const currentSettings = get().settings;
    const updatedSettings: Settings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    set({ settings: updatedSettings });
    await get().saveSettings();

    // Queue for sync
    if (userId) {
      await SyncService.queueOperation({
        type: 'update',
        collection: 'settings',
        data: {
          userId,
          settings: updates,
        },
      });
    }
  },

  completeOnboarding: async () => {
    await get().updateSettings({ hasCompletedOnboarding: true });
  },

  loadSettings: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;

      if (userId && SyncService.isDeviceOnline()) {
        // Authenticated + Online: Load from Supabase ONLY
        set({ syncing: true, syncError: null });
        try {
          const cloudSettings = await SupabaseService.getSettings(userId);
          if (cloudSettings) {
            // Use cloud settings directly (cloud is source of truth)
            // Don't merge with local cache to avoid stale data
            const freshSettings: Settings = {
              ...DEFAULT_SETTINGS,
              ...cloudSettings,
            };

            set({ settings: freshSettings, syncing: false });
            
            // Save to AsyncStorage as cache (overwrite any guest data)
            await get().saveSettings();
            return;
          }
          
          // No settings in cloud yet (new user) - create default settings in Supabase
          console.log('New user - creating default settings in Supabase');
          const newSettings = {
            ...DEFAULT_SETTINGS,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await SupabaseService.updateSettings(userId, newSettings);
          set({ settings: newSettings, syncing: false });
          await get().saveSettings();
        } catch (error) {
          console.error('Failed to load from Supabase:', error);
          set({ syncing: false, syncError: 'Unable to load data. Please check your connection.' });
          
          // DON'T fall back to AsyncStorage for authenticated users
          // This prevents guest data from appearing in authenticated sessions
          set({ settings: DEFAULT_SETTINGS });
        }
      } else if (userId && !SyncService.isDeviceOnline()) {
        // Authenticated + Offline: Load from AsyncStorage cache
        // This cache was created from previous Supabase load, not guest data
        console.log('Offline mode - loading settings from AsyncStorage cache');
        const stored = await StorageService.get<Settings>(StorageService.KEYS.SETTINGS);
        if (stored) {
          set({ settings: stored });
        } else {
          set({ settings: DEFAULT_SETTINGS });
        }
      } else {
        // Guest mode: Load from AsyncStorage as primary storage
        console.log('Guest mode - loading settings from AsyncStorage');
        const stored = await StorageService.get<Settings>(StorageService.KEYS.SETTINGS);
        if (stored) {
          set({ settings: stored });
        } else {
          set({ settings: DEFAULT_SETTINGS });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ syncError: 'Failed to load settings' });
    }
  },

  saveSettings: async () => {
    try {
      const { settings } = get();
      await StorageService.set(StorageService.KEYS.SETTINGS, settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  reset: () => {
    console.log('Resetting settings store');
    
    // Reset settings to defaults (don't touch AsyncStorage)
    set({
      settings: {
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      syncing: false,
      syncError: null,
    });
  },
}));
