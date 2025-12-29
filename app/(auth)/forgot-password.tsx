// Forgot password screen
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { AuthService } from '@/services/auth/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!AuthService.validateEmail(email)) {
      setError('Invalid email format');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center px-6">
          {/* Success Icon */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Text className="text-4xl">✓</Text>
            </View>
            <Text className="mb-2 text-2xl font-bold text-gray-900">Check Your Email</Text>
            <Text className="text-center text-base text-gray-600">
              We&apos;ve sent password reset instructions to
            </Text>
            <Text className="mt-1 text-base font-medium text-gray-900">{email}</Text>
          </View>

          {/* Instructions */}
          <View className="mb-8 rounded-xl bg-gray-50 p-4">
            <Text className="mb-2 text-sm text-gray-700">• Check your inbox and spam folder</Text>
            <Text className="mb-2 text-sm text-gray-700">• Click the reset link in the email</Text>
            <Text className="text-sm text-gray-700">• Create a new password</Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            className="mb-4 items-center rounded-2xl bg-teal-600 py-4 shadow-md"
            onPress={() => router.push('/(auth)/sign-in' as any)}>
            <Text className="text-lg font-semibold text-white">Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-4"
            onPress={() => {
              setEmailSent(false);
              setEmail('');
            }}>
            <Text className="text-base text-teal-600">Resend Email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="mb-8 mt-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Text className="text-base text-teal-600">← Back</Text>
          </TouchableOpacity>
          <Text className="mb-2 text-3xl font-bold text-gray-900">Forgot Password?</Text>
          <Text className="text-base text-gray-600">
            Enter your email and we&apos;ll send you instructions to reset your password
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          {/* Email */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Email</Text>
            <TextInput
              className={`border bg-gray-50 ${error ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-base`}
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            className="mt-4 items-center rounded-2xl bg-teal-600 py-4 shadow-md"
            onPress={handleResetPassword}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-semibold text-white">Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {/* Back to Sign In */}
          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-600">Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in' as any)}>
              <Text className="font-semibold text-teal-600">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
