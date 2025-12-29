// Sign in screen
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { AuthService } from '@/services/auth/authService';

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!AuthService.validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      await signInWithEmail(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="mb-8 mt-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Text className="text-base text-teal-600">← Back</Text>
          </TouchableOpacity>
          <Text className="mb-2 text-3xl font-bold text-gray-900">Welcome Back</Text>
          <Text className="text-base text-gray-600">Sign in to continue</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          {/* Email */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Email</Text>
            <TextInput
              className={`border bg-gray-50 ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-base`}
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text className="mt-1 text-sm text-red-500">{errors.email}</Text>}
          </View>

          {/* Password */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Password</Text>
            <TextInput
              className={`border bg-gray-50 ${errors.password ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-base`}
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            {errors.password && (
              <Text className="mt-1 text-sm text-red-500">{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text className="text-right text-sm text-teal-600">Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            className="mt-4 items-center rounded-2xl bg-teal-600 py-4 shadow-md"
            onPress={handleSignIn}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-semibold text-white">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="my-6 flex-row items-center">
            <View className="h-px flex-1 bg-gray-300" />
            <Text className="mx-4 text-gray-500">or</Text>
            <View className="h-px flex-1 bg-gray-300" />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-2xl border-2 border-gray-200 bg-white py-4"
            onPress={handleGoogleSignIn}
            disabled={loading}>
            <Text className="text-lg font-semibold text-gray-700">Continue with Google</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-600">Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up' as any)}>
              <Text className="font-semibold text-teal-600">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
