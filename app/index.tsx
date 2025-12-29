import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSettingsStore } from '@/store';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user, initializing } = useAuthStore();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (initializing || hasNavigated.current) return;

    console.log('Index: Initial routing', {
      user: !!user,
      hasCompletedOnboarding: settings.hasCompletedOnboarding,
    });

    // Mark as navigated to prevent multiple navigations
    hasNavigated.current = true;

    // Initial routing - only runs once
    if (user) {
      // Authenticated user
      if (settings.hasCompletedOnboarding) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/(onboarding)' as any);
      }
    } else {
      // Guest user
      if (settings.hasCompletedOnboarding) {
        // Guest who completed onboarding, go to tabs
        router.replace('/(tabs)' as any);
      } else {
        // New user, go to welcome
        router.replace('/(auth)/welcome' as any);
      }
    }
  }, [initializing, user, settings.hasCompletedOnboarding, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#0d9488" />
    </View>
  );
}
