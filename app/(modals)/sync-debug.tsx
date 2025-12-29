import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { SyncService } from '@/services/sync/syncService';
import { useAuthStore } from '@/store/authStore';
import { useGoalsStore } from '@/store/goalsStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { SupabaseService } from '@/services/supabase/supabaseService';

export default function SyncDebugScreen() {
  const [syncStatus, setSyncStatus] = useState(SyncService.getSyncStatus());
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [supabaseData, setSupabaseData] = useState<any>(null);
  const user = useAuthStore((state) => state.user);
  const localGoals = useGoalsStore((state) => state.goals);
  const localTransactions = useTransactionsStore((state) => state.transactions);

  useEffect(() => {
    const unsubscribe = SyncService.onSyncStatusChange(setSyncStatus);
    loadQueueStatus();
    loadSupabaseData();
    return unsubscribe;
  }, []);

  const loadQueueStatus = async () => {
    const status = await SyncService.getQueueStatus();
    setQueueStatus(status);
  };

  const loadSupabaseData = async () => {
    if (!user?.id) {
      setSupabaseData({ goals: [], transactions: [] });
      return;
    }

    try {
      const [goals, transactions] = await Promise.all([
        SupabaseService.getGoals(user.id),
        SupabaseService.getTransactions(user.id),
      ]);

      setSupabaseData({ goals, transactions });
    } catch (error: any) {
      console.error('Failed to load Supabase data:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleSyncNow = async () => {
    try {
      await SyncService.syncNow();
      await loadQueueStatus();
      await loadSupabaseData();
      Alert.alert('Success', 'Sync completed');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClearQueue = async () => {
    Alert.alert('Clear Queue', 'Are you sure? This will remove all pending sync operations.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await SyncService.clearQueue();
          await loadQueueStatus();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-base text-teal-600">Close</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Sync Debug</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* User Info */}
        <View className="mb-4 rounded-lg bg-white p-4">
          <Text className="mb-2 text-lg font-semibold">User Info</Text>
          <Text className="text-sm text-gray-600">ID: {user?.id || 'Not logged in'}</Text>
          <Text className="text-sm text-gray-600">Email: {user?.email || 'N/A'}</Text>
        </View>

        {/* Sync Status */}
        <View className="mb-4 rounded-lg bg-white p-4">
          <Text className="mb-2 text-lg font-semibold">Sync Status</Text>
          <Text className="text-sm text-gray-600">
            Online: {syncStatus.isOnline ? '✅ Yes' : '❌ No'}
          </Text>
          <Text className="text-sm text-gray-600">
            Syncing: {syncStatus.isSyncing ? '⏳ Yes' : '✅ No'}
          </Text>
          <Text className="text-sm text-gray-600">Pending: {syncStatus.pendingOperations}</Text>
          <Text className="text-sm text-gray-600">
            Last Sync: {syncStatus.lastSyncTime || 'Never'}
          </Text>
          {syncStatus.error && (
            <Text className="mt-1 text-sm text-red-600">Error: {syncStatus.error}</Text>
          )}
        </View>

        {/* Queue Status */}
        {queueStatus && (
          <View className="mb-4 rounded-lg bg-white p-4">
            <Text className="mb-2 text-lg font-semibold">
              Queue ({queueStatus.pending} operations)
            </Text>
            {queueStatus.operations.map((op: any, index: number) => (
              <View key={op.id} className="mt-2 border-t border-gray-200 pt-2">
                <Text className="text-sm font-medium">
                  {index + 1}. {op.type} {op.collection}
                </Text>
                <Text className="text-xs text-gray-500">
                  Retries: {op.retryCount} | {new Date(op.timestamp).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Local Data */}
        <View className="mb-4 rounded-lg bg-white p-4">
          <Text className="mb-2 text-lg font-semibold">Local Data</Text>
          <Text className="text-sm text-gray-600">Goals: {localGoals.length}</Text>
          <Text className="text-sm text-gray-600">Transactions: {localTransactions.length}</Text>
        </View>

        {/* Supabase Data */}
        <View className="mb-4 rounded-lg bg-white p-4">
          <Text className="mb-2 text-lg font-semibold">Supabase Data</Text>
          {supabaseData ? (
            <>
              <Text className="text-sm text-gray-600">
                Goals: {supabaseData.goals?.length || 0}
              </Text>
              <Text className="text-sm text-gray-600">
                Transactions: {supabaseData.transactions?.length || 0}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-gray-500">Loading...</Text>
          )}
        </View>

        {/* Actions */}
        <View className="space-y-2">
          <TouchableOpacity
            onPress={handleSyncNow}
            className="items-center rounded-lg bg-teal-600 p-4">
            <Text className="font-semibold text-white">Sync Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={loadQueueStatus}
            className="items-center rounded-lg bg-blue-600 p-4">
            <Text className="font-semibold text-white">Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={loadSupabaseData}
            className="items-center rounded-lg bg-purple-600 p-4">
            <Text className="font-semibold text-white">Reload Supabase Data</Text>
          </TouchableOpacity>

          {queueStatus && queueStatus.pending > 0 && (
            <TouchableOpacity
              onPress={handleClearQueue}
              className="items-center rounded-lg bg-red-600 p-4">
              <Text className="font-semibold text-white">Clear Queue</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              const authState = useAuthStore.getState();
              console.log('=== AUTH STATE DEBUG ===');
              console.log('User:', authState.user);
              console.log('Loading:', authState.loading);
              console.log('Initializing:', authState.initializing);
              console.log('Error:', authState.error);
              Alert.alert(
                'Auth State',
                `User: ${authState.user?.email || 'None'}\nID: ${authState.user?.id || 'None'}\nLoading: ${authState.loading}\nInitializing: ${authState.initializing}`
              );
            }}
            className="items-center rounded-lg bg-gray-600 p-4">
            <Text className="font-semibold text-white">Check Auth State</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
