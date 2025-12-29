// Welcome screen
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        {/* Logo/Icon */}
        <View className="mb-12 items-center">
          <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-teal-600">
            <Text className="text-4xl font-bold text-white">₽</Text>
          </View>
          <Text className="mb-2 text-3xl font-bold text-gray-900">PennyWise</Text>
          <Text className="text-center text-base text-gray-600">Every Dollar Counts</Text>
        </View>

        {/* Description */}
        <View className="mb-8">
          <Text className="mb-4 text-center text-lg text-gray-700">
            Take control of your finances with smart expense tracking and budgeting
          </Text>
        </View>

        {/* Buttons */}
        <View className="gap-4">
          <TouchableOpacity
            className="items-center rounded-2xl bg-teal-600 py-4 shadow-md"
            onPress={() => {
              console.log('Get Started pressed');
              router.push('/(auth)/sign-up' as any);
            }}>
            <Text className="text-lg font-semibold text-white">Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center rounded-2xl border-2 border-teal-600 bg-white py-4"
            onPress={() => {
              console.log('Sign In pressed');
              router.push('/(auth)/sign-in' as any);
            }}>
            <Text className="text-lg font-semibold text-teal-600">Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-4"
            onPress={() => {
              console.log('Continue as Guest pressed');
              // Check if user has completed onboarding
              import('@/store').then(({ useSettingsStore }) => {
                const hasCompletedOnboarding =
                  useSettingsStore.getState().settings.hasCompletedOnboarding;
                if (hasCompletedOnboarding) {
                  // Already completed onboarding, go to tabs
                  router.replace('/(tabs)' as any);
                } else {
                  // First time, go to onboarding
                  router.push('/(onboarding)' as any);
                }
              });
            }}>
            <Text className="text-base text-gray-600">Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
