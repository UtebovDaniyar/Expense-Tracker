// Sync status component
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SyncService, SyncStatus as SyncStatusType } from '@/services/sync/syncService';
import { BRAND_COLORS } from '@/constants/colors';

type SyncStatusProps = {
  showSyncButton?: boolean;
  compact?: boolean;
};

export function SyncStatus({ showSyncButton = false, compact = false }: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatusType>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    error: null,
  });

  useEffect(() => {
    // Initialize sync service
    SyncService.initialize();

    // Subscribe to status changes
    const unsubscribe = SyncService.onSyncStatusChange(setStatus);

    // Get initial status
    setStatus(SyncService.getSyncStatus());

    return () => {
      unsubscribe();
    };
  }, []);

  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleSyncNow = async () => {
    if (!status.isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }

    if (status.isSyncing) {
      return;
    }

    try {
      await SyncService.processQueue();
      Alert.alert('Success', 'Data synced successfully!');
    } catch (error) {
      console.error('Manual sync failed:', error);
      Alert.alert('Sync Failed', 'Failed to sync data. Please try again.');
    }
  };

  if (compact) {
    // Compact version for header
    if (!status.isOnline) {
      return (
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-red-500" />
          <Text className="text-xs text-gray-600">Offline</Text>
        </View>
      );
    }

    if (status.isSyncing) {
      return (
        <View className="flex-row items-center gap-1.5">
          <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
          <Text className="text-xs text-gray-600">Syncing</Text>
        </View>
      );
    }

    return (
      <View className="flex-row items-center gap-1.5">
        <View className="h-2 w-2 rounded-full bg-green-500" />
        <Text className="text-xs text-gray-600">Synced</Text>
      </View>
    );
  }

  // Full version with details
  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-800">Sync Status</Text>
        {showSyncButton && (
          <TouchableOpacity
            onPress={handleSyncNow}
            disabled={!status.isOnline || status.isSyncing}
            className={`rounded-full px-4 py-2 ${
              !status.isOnline || status.isSyncing ? 'bg-gray-300' : 'bg-[#1a3d3d]'
            }`}>
            <Text
              className={`text-sm font-medium ${
                !status.isOnline || status.isSyncing ? 'text-gray-500' : 'text-white'
              }`}>
              Sync Now
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Connection Status */}
      <View className="mb-2 flex-row items-center gap-2">
        {status.isOnline ? (
          <>
            <View className="h-3 w-3 rounded-full bg-green-500" />
            <Text className="text-sm text-gray-700">Online</Text>
          </>
        ) : (
          <>
            <View className="h-3 w-3 rounded-full bg-red-500" />
            <Text className="text-sm text-gray-700">Offline</Text>
          </>
        )}
      </View>

      {/* Sync Status */}
      {status.isSyncing ? (
        <View className="mb-2 flex-row items-center gap-2">
          <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
          <Text className="text-sm text-gray-700">Syncing data...</Text>
        </View>
      ) : (
        <View className="mb-2">
          <Text className="text-sm text-gray-600">
            Last synced: {formatLastSync(status.lastSyncTime)}
          </Text>
        </View>
      )}

      {/* Pending Operations */}
      {status.pendingOperations > 0 && (
        <View className="mt-2 rounded-lg bg-yellow-50 p-2">
          <Text className="text-sm text-yellow-800">
            {status.pendingOperations} operation{status.pendingOperations > 1 ? 's' : ''} pending
            sync
          </Text>
        </View>
      )}

      {/* Error Message */}
      {status.error && (
        <View className="mt-2 rounded-lg bg-red-50 p-2">
          <Text className="text-sm text-red-800">{status.error}</Text>
        </View>
      )}
    </View>
  );
}
