import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store';
import { useEffect, useRef } from 'react';

export default function WelcomeScreen() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Redirect to main app if onboarding is complete (only check once)
    if (!hasChecked.current && settings.hasCompletedOnboarding) {
      hasChecked.current = true;
      router.replace('/(tabs)');
    }
  }, [settings.hasCompletedOnboarding, router]);

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <View className="mb-12 items-center">
        <Text className="mb-4 text-6xl">💰</Text>
        <Text className="mb-2 text-center text-3xl font-bold" style={{ color: '#1a3d3d' }}>
          PennyWise
        </Text>
        <Text className="mb-2 text-center text-xl font-semibold" style={{ color: '#f4d03f' }}>
          Every Dollar Counts
        </Text>
        <Text className="text-center text-base text-gray-600">Take Control of Your Budget</Text>
      </View>

      <View className="mb-12">
        <View className="mb-4 flex-row items-center">
          <Text className="mr-3 text-2xl">📊</Text>
          <Text className="text-base text-gray-700">Track expenses effortlessly</Text>
        </View>
        <View className="mb-4 flex-row items-center">
          <Text className="mr-3 text-2xl">💡</Text>
          <Text className="text-base text-gray-700">Get smart insights</Text>
        </View>
        <View className="mb-4 flex-row items-center">
          <Text className="mr-3 text-2xl">🎯</Text>
          <Text className="text-base text-gray-700">Achieve your financial goals</Text>
        </View>
        <View className="mb-4 flex-row items-center">
          <Text className="mr-3 text-2xl">🔒</Text>
          <Text className="text-base text-gray-700">Your data stays private</Text>
        </View>
      </View>

      <TouchableOpacity
        className="items-center rounded-full px-8 py-4"
        style={{ backgroundColor: '#1a3d3d' }}
        onPress={() => router.push('/(onboarding)/currency')}>
        <Text className="text-lg font-semibold text-white">Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center py-2"
        onPress={() => {
          // Future: Navigate to sign in
        }}>
        <Text className="text-base text-gray-500">Sign In</Text>
      </TouchableOpacity>

      <View className="mt-8 flex-row justify-center">
        <View className="mx-1 h-2 w-2 rounded-full" style={{ backgroundColor: '#1a3d3d' }} />
        <View className="mx-1 h-2 w-2 rounded-full bg-gray-300" />
        <View className="mx-1 h-2 w-2 rounded-full bg-gray-300" />
        <View className="mx-1 h-2 w-2 rounded-full bg-gray-300" />
      </View>
    </View>
  );
}
