// Edit profile modal
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';

export default function EditProfileModal() {
  const router = useRouter();
  const { user, updateProfile, loading } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Name is required');
      return;
    }

    try {
      await updateProfile({ displayName: displayName.trim() });
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className="mb-8 mt-8">
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-base text-teal-600">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#0d9488" />
              ) : (
                <Text className="text-base font-semibold text-teal-600">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="gap-4">
          {/* Display Name */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Display Name</Text>
            <TextInput
              className={`border bg-gray-50 ${error ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-base`}
              placeholder="Your name"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (error) setError('');
              }}
              autoCapitalize="words"
            />
            {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
          </View>

          {/* Email (read-only) */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Email</Text>
            <View className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3">
              <Text className="text-base text-gray-500">{user?.email}</Text>
            </View>
            <Text className="mt-1 text-xs text-gray-500">Email cannot be changed from here</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
