import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { MigrationService, type LocalDataSummary } from '@/services/migration/migrationService';
import { useAuthStore } from '@/store/authStore';
import { BRAND_COLORS } from '@/constants/colors';

interface DataMigrationModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function DataMigrationModal({
  visible,
  onClose,
  onComplete,
}: DataMigrationModalProps) {
  const { user } = useAuthStore();
  const [dataSummary, setDataSummary] = useState<LocalDataSummary | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadDataSummary();
    }
  }, [visible]);

  const loadDataSummary = async () => {
    try {
      const summary = await MigrationService.getLocalDataSummary();
      setDataSummary(summary);
    } catch (error) {
      console.error('Failed to load data summary:', error);
      setError('Failed to load local data');
    }
  };

  const handleMigrate = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to migrate data');
      return;
    }

    setIsMigrating(true);
    setError(null);
    setProgress(0);

    try {
      const result = await MigrationService.migrateToCloud(user.id, (progressValue) => {
        setProgress(progressValue);
      });

      if (result.success) {
        // Wait a bit for real-time subscriptions to process all changes
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify user is still authenticated before reloading data
        const { useAuthStore } = await import('@/store/authStore');
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) {
          console.error('User signed out during migration - skipping data reload');
          Alert.alert(
            'Migration Complete',
            'Your data was migrated successfully, but you were signed out. Please sign in again.',
            [{ text: 'OK', onPress: onComplete }]
          );
          return;
        }

        // Clear local stores and reload from Supabase to avoid duplicates
        console.log('Migration successful, reloading data from Supabase...');

        const { useTransactionsStore } = await import('@/store/transactionsStore');
        const { useBudgetStore } = await import('@/store/budgetStore');
        const { useGoalsStore } = await import('@/store/goalsStore');

        // Stop real-time sync temporarily
        useTransactionsStore.getState().stopRealtimeSync();
        useBudgetStore.getState().stopRealtimeSync();
        useGoalsStore.getState().stopRealtimeSync();

        // Reload all data from Supabase (this will replace local data with clean data from DB)
        await Promise.all([
          useTransactionsStore.getState().loadTransactions(),
          useBudgetStore.getState().loadBudget(),
          useGoalsStore.getState().loadGoals(),
        ]);

        // Restart real-time sync
        useTransactionsStore.getState().startRealtimeSync();
        useBudgetStore.getState().startRealtimeSync();
        useGoalsStore.getState().startRealtimeSync();

        console.log('Data reloaded from Supabase');

        // Calculate totals
        const totalMigrated =
          result.migratedCounts.transactions +
          result.migratedCounts.recurringTransactions +
          result.migratedCounts.budgets +
          result.migratedCounts.categoryBudgets +
          result.migratedCounts.goals;

        const totalSkipped =
          result.skippedCounts.transactions +
          result.skippedCounts.recurringTransactions +
          result.skippedCounts.budgets +
          result.skippedCounts.categoryBudgets +
          result.skippedCounts.goals;

        // Build message based on what was migrated/skipped
        let message = '';
        if (totalMigrated > 0 && totalSkipped > 0) {
          message =
            `Added ${totalMigrated} new items to cloud:\n\n` +
            `• ${result.migratedCounts.transactions} transactions\n` +
            `• ${result.migratedCounts.recurringTransactions} recurring transactions\n` +
            `• ${result.migratedCounts.budgets} budget${result.migratedCounts.budgets !== 1 ? 's' : ''}\n` +
            `• ${result.migratedCounts.categoryBudgets} category budgets\n` +
            `• ${result.migratedCounts.goals} goals\n\n` +
            `${totalSkipped} items already in cloud (skipped)\n\n` +
            `Your data is safe and up to date! 🎉`;
        } else if (totalMigrated > 0) {
          message =
            `Successfully migrated ${totalMigrated} items to cloud:\n\n` +
            `• ${result.migratedCounts.transactions} transactions\n` +
            `• ${result.migratedCounts.recurringTransactions} recurring transactions\n` +
            `• ${result.migratedCounts.budgets} budget${result.migratedCounts.budgets !== 1 ? 's' : ''}\n` +
            `• ${result.migratedCounts.categoryBudgets} category budgets\n` +
            `• ${result.migratedCounts.goals} goals`;
        } else if (totalSkipped > 0) {
          message =
            `All ${totalSkipped} items already exist in cloud!\n\n` +
            `Your data is already up to date. 🎉`;
        } else {
          message = 'Migration completed successfully!';
        }

        Alert.alert('Success! 🎉', message, [{ text: 'OK', onPress: onComplete }]);
      } else {
        setError(
          `Migration completed with ${result.errors.length} error(s). Some data may not have been migrated.`
        );
        Alert.alert(
          'Partial Success',
          `Some data was migrated, but ${result.errors.length} error(s) occurred. Check the console for details.`,
          [
            { text: 'Retry', onPress: handleMigrate },
            { text: 'Continue Anyway', onPress: onComplete },
          ]
        );
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setError(error instanceof Error ? error.message : 'Migration failed');
      Alert.alert('Migration Failed', 'An error occurred during migration. Please try again.', [
        { text: 'Retry', onPress: handleMigrate },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Migration?',
      'Your local data will remain on this device only. You can migrate later from Settings.',
      [
        { text: 'Go Back', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: onClose },
      ]
    );
  };

  const totalItems =
    (dataSummary?.transactions || 0) +
    (dataSummary?.recurringTransactions || 0) +
    (dataSummary?.budgets || 0) +
    (dataSummary?.goals || 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View className="max-h-[85%] rounded-t-3xl bg-white p-6">
          {/* Drag Handle */}
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-gray-300" />
          </View>

          {/* Title */}
          <View className="mb-6">
            <Text className="mb-2 text-center text-3xl">☁️</Text>
            <Text
              className="text-center text-2xl font-bold"
              style={{ color: BRAND_COLORS.primary }}>
              Migrate Your Data
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-600">
              We found local data on your device. Would you like to sync it to the cloud?
            </Text>
          </View>

          {/* Data Summary */}
          {dataSummary && totalItems > 0 && (
            <View
              className="mb-6 rounded-2xl p-4"
              style={{ backgroundColor: BRAND_COLORS.accent + '10' }}>
              <Text className="mb-3 text-center font-semibold text-gray-700">Data to Migrate:</Text>
              <View className="space-y-2">
                {dataSummary.transactions > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-700">💰 Transactions</Text>
                    <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                      {dataSummary.transactions}
                    </Text>
                  </View>
                )}
                {dataSummary.recurringTransactions > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-700">🔄 Recurring Transactions</Text>
                    <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                      {dataSummary.recurringTransactions}
                    </Text>
                  </View>
                )}
                {dataSummary.budgets > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-700">📊 Budgets</Text>
                    <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                      {dataSummary.budgets}
                    </Text>
                  </View>
                )}
                {dataSummary.goals > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-700">🎯 Goals</Text>
                    <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                      {dataSummary.goals}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Migration Progress */}
          {isMigrating && (
            <View className="mb-6">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm text-gray-600">Migrating data...</Text>
                <Text className="text-sm font-semibold" style={{ color: BRAND_COLORS.primary }}>
                  {progress}%
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-gray-200">
                <View
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: BRAND_COLORS.primary,
                    width: `${progress}%`,
                  }}
                />
              </View>
              <View className="mt-4 items-center">
                <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View className="mb-4 rounded-2xl bg-red-50 p-4">
              <Text className="text-center text-sm text-red-600">{error}</Text>
            </View>
          )}

          {/* Benefits */}
          {!isMigrating && (
            <View className="mb-6 rounded-2xl bg-gray-50 p-4">
              <Text className="mb-2 font-semibold text-gray-700">Benefits of Cloud Sync:</Text>
              <Text className="mb-1 text-sm text-gray-600">✓ Access from multiple devices</Text>
              <Text className="mb-1 text-sm text-gray-600">✓ Automatic backup</Text>
              <Text className="mb-1 text-sm text-gray-600">✓ Real-time synchronization</Text>
              <Text className="text-sm text-gray-600">✓ Never lose your data</Text>
            </View>
          )}

          {/* Action Buttons */}
          {!isMigrating && (
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-full border-2 py-4"
                style={{ borderColor: BRAND_COLORS.primary }}
                onPress={handleSkip}>
                <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                  Skip for Now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: BRAND_COLORS.primary }}
                onPress={handleMigrate}
                disabled={totalItems === 0}>
                <Text className="font-semibold text-white">Migrate to Cloud</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
