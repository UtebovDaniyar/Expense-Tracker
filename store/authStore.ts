// Auth store for managing authentication state with Supabase
import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { AuthService } from '@/services/auth/authService';
import { OAuthService } from '@/services/auth/oauthService';

export interface UserProfile {
  id: string;
  email: string | undefined;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setInitializing: (initializing: boolean) => void;
}

// Convert Supabase user to our UserProfile type
const convertSupabaseUser = async (supabaseUser: User | null): Promise<UserProfile | null> => {
  if (!supabaseUser) return null;

  // Try to get displayName from profiles table first (source of truth)
  // Fall back to user_metadata if profiles not available
  let displayName = supabaseUser.user_metadata?.full_name || null;

  try {
    const { supabase } = await import('@/services/supabase/config');

    // For new users, the profile might not exist yet due to trigger delay
    // Retry a few times with exponential backoff
    let profile = null;
    let retries = 3;

    while (retries > 0 && !profile) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', supabaseUser.id)
        .single();

      if (data?.full_name) {
        profile = data;
        break;
      }

      // Wait before retry (100ms, 200ms, 400ms)
      if (retries > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * (4 - retries)));
      }
      retries--;
    }

    if (profile?.full_name) {
      displayName = profile.full_name;
    }
  } catch (error) {
    // If profiles query fails, use user_metadata as fallback
    console.log('Could not fetch profile, using user_metadata:', error);
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    displayName,
    photoURL: supabaseUser.user_metadata?.avatar_url || null,
    emailVerified: supabaseUser.email_confirmed_at !== undefined,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initializing: true,
  error: null,

  signInWithEmail: async (email, password) => {
    set({ loading: true, error: null });
    try {
      console.log('Signing in...');
      await AuthService.signInWithEmail(email, password);
      console.log('Sign in successful');
      // User will be set by onAuthStateChanged listener
    } catch (error: any) {
      console.error('Sign in error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUpWithEmail: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      console.log('Signing up with email:', email);
      const result = await AuthService.signUpWithEmail(email, password, displayName);
      console.log('Sign up successful, user:', result.user?.id, 'session:', !!result.session);

      // If no session, it means email confirmation is required
      if (!result.session) {
        console.log('Email confirmation required');
      }

      // User will be set by onAuthStateChanged listener
    } catch (error: any) {
      console.error('Sign up error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      await OAuthService.signInWithGoogle();
      // User will be set by onAuthStateChanged listener
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithApple: async () => {
    set({ loading: true, error: null });
    try {
      await OAuthService.signInWithApple();
      // User will be set by onAuthStateChanged listener
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      console.log('Signing out...');

      // Stop real-time sync before signing out
      const { useTransactionsStore } = await import('@/store/transactionsStore');
      const { useBudgetStore } = await import('@/store/budgetStore');
      const { useGoalsStore } = await import('@/store/goalsStore');

      useTransactionsStore.getState().stopRealtimeSync();
      useBudgetStore.getState().stopRealtimeSync();
      useGoalsStore.getState().stopRealtimeSync();

      await AuthService.signOut();

      // Note: We DON'T reset migration status or clear AsyncStorage
      // AsyncStorage contains cached data that will be used on next sign in
      // Migration check will verify if user has cloud data before showing migration prompt

      console.log('Sign out successful');
      set({ user: null, loading: false });
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      await AuthService.resetPassword(email);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  sendEmailVerification: async () => {
    set({ loading: true, error: null });
    try {
      await AuthService.sendEmailVerification();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (updates) => {
    set({ loading: true, error: null });
    try {
      await AuthService.updateProfile(updates);
      // Update local user state
      const currentUser = await AuthService.getCurrentUser();
      const userProfile = await convertSupabaseUser(currentUser);
      set({ user: userProfile });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateEmail: async (newEmail) => {
    set({ loading: true, error: null });
    try {
      await AuthService.updateEmail(newEmail);
      // Update local user state
      const currentUser = await AuthService.getCurrentUser();
      const userProfile = await convertSupabaseUser(currentUser);
      set({ user: userProfile });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updatePassword: async (newPassword) => {
    set({ loading: true, error: null });
    try {
      await AuthService.updatePassword(newPassword);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteAccount: async () => {
    set({ loading: true, error: null });
    try {
      await AuthService.deleteAccount();
      set({ user: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setUser: async (supabaseUser) => {
    const userProfile = await convertSupabaseUser(supabaseUser);
    set({ user: userProfile });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  setInitializing: (initializing) => {
    set({ initializing });
  },
}));
