// Email verification banner component
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export function EmailVerificationBanner() {
  const { user, sendEmailVerification } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified || dismissed) {
    return null;
  }

  const handleResendEmail = async () => {
    setSending(true);
    try {
      await sendEmailVerification();
      Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="mx-4 my-2 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="mb-1 text-sm font-semibold text-yellow-800">Verify Your Email</Text>
          <Text className="mb-2 text-xs text-yellow-700">
            Please verify your email address to access all features
          </Text>
          <TouchableOpacity onPress={handleResendEmail} disabled={sending} className="self-start">
            <Text className="text-xs font-semibold text-yellow-800 underline">
              {sending ? 'Sending...' : 'Resend Email'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} className="ml-2">
          <Text className="text-lg text-yellow-800">×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
