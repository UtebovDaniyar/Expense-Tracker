// Supabase configuration and initialization
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Supabase configuration from environment variables
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl || 'https://fxfnygzhzaztimdxvxex.supabase.co';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4Zm55Z3poemF6dGltZHh2eGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjE0OTksImV4cCI6MjA3NzM5NzQ5OX0.V13pEQL1WZ3VXpP6CmYcSjtV5f6Ns8sjI4xzIB_fjUc';

console.log('Supabase config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
});

// Create Supabase client with timeout settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'pennywise-app',
    },
  },
});

// Export types
export type User = {
  id: string;
  email: string | undefined;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  email_confirmed_at?: string;
};

// Helper to get current user
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

// Helper to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session !== null;
};

// Helper to get user ID
export const getUserId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
};

console.log('Supabase initialized successfully');
