// Offline mode banner component
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SyncService, SyncStatus } from '@/services/sync/syncService';
import { BRAND_COLORS } from '@/constants/colors';

export function OfflineBanner() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    error: null,
  });

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = SyncService.onSyncStatusChange(setStatus);

    // Get initial status
    setStatus(SyncService.getSyncStatus());

    return () => {
      unsubscribe();
    };
  }, []);

  // Don't show banner if online
  if (status.isOnline) {
    return null;
  }

  return (
    <View className="mx-6 mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <View className="flex-row items-center">
        <Text className="mr-2 text-lg">📡</Text>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-yellow-900">You&apos;re offline</Text>
          <Text className="mt-1 text-xs text-yellow-800">
            Changes will sync when you&apos;re back online.
          </Text>
          {status.pendingOperations > 0 && (
            <Text className="mt-1 text-xs text-yellow-700">
              {status.pendingOperations} operation{status.pendingOperations > 1 ? 's' : ''} pending
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
