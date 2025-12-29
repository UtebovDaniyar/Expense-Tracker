import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTransactionsStore, useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils/currency';
import { getCategoryConfig } from '@/constants/categories';
import { BRAND_COLORS } from '@/constants/colors';

export default function RecurringTransactionsScreen() {
  const router = useRouter();
  const { recurringTransactions, updateRecurringTransaction, deleteRecurringTransaction } =
    useTransactionsStore();
  const { settings } = useSettingsStore();

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateRecurringTransaction(id, { isActive: !currentStatus });
      Alert.alert('Success', `Recurring transaction ${!currentStatus ? 'resumed' : 'paused'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update recurring transaction');
    }
  };

  const handleDelete = (id: string, description: string) => {
    Alert.alert(
      'Delete Recurring Transaction',
      `Are you sure you want to delete "${description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringTransaction(id);
              Alert.alert('Success', 'Recurring transaction deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete recurring transaction');
            }
          },
        },
      ]
    );
  };

  const getNextDueDate = (lastCreated: string, frequency: string): string => {
    const last = new Date(lastCreated);
    const next = new Date(last);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFrequencyLabel = (frequency: string): string => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pb-4 pt-12" style={{ backgroundColor: BRAND_COLORS.primary }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-2xl text-white">←</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Recurring Transactions</Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView className="flex-1">
        {recurringTransactions.length === 0 ? (
          <View
            className="mx-6 mt-12 items-center rounded-2xl p-8"
            style={{ backgroundColor: '#e8f5e9' }}>
            <Text className="mb-2 text-4xl">🔄</Text>
            <Text
              className="mb-1 text-center text-base font-semibold"
              style={{ color: BRAND_COLORS.primary }}>
              No Recurring Transactions
            </Text>
            <Text className="text-center text-sm text-gray-600">
              Set up recurring transactions when adding expenses or income
            </Text>
          </View>
        ) : (
          <View className="px-6 py-6">
            {recurringTransactions.map((recurring) => {
              const category = getCategoryConfig(recurring.category);
              if (!category) return null;

              const nextDue = getNextDueDate(recurring.lastCreated, recurring.frequency);
              const isPaused = !recurring.isActive;

              return (
                <View
                  key={recurring.id}
                  className="mb-4 rounded-2xl p-4"
                  style={{
                    backgroundColor: isPaused ? '#f5f5f5' : '#e8f5e9',
                    opacity: isPaused ? 0.7 : 1,
                  }}>
                  <View className="mb-3 flex-row items-start">
                    <View
                      className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color + '20' }}>
                      <Text className="text-2xl">{category.icon}</Text>
                    </View>

                    <View className="flex-1">
                      <Text
                        className="mb-1 text-base font-bold"
                        style={{ color: BRAND_COLORS.primary }}>
                        {recurring.description}
                      </Text>
                      <Text className="mb-1 text-sm text-gray-600">{category.name}</Text>
                      <View className="flex-row items-center">
                        <View
                          className="mr-2 rounded-full px-2 py-1"
                          style={{
                            backgroundColor: isPaused ? '#ff9800' : BRAND_COLORS.accent + '40',
                          }}>
                          <Text className="text-xs font-semibold text-gray-700">
                            {isPaused ? 'Paused' : getFrequencyLabel(recurring.frequency)}
                          </Text>
                        </View>
                        {recurring.type === 'income' && (
                          <View
                            className="rounded-full px-2 py-1"
                            style={{ backgroundColor: BRAND_COLORS.success + '40' }}>
                            <Text className="text-xs font-semibold text-gray-700">Income</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="items-end">
                      <Text
                        className="mb-1 text-lg font-bold"
                        style={{
                          color: recurring.type === 'income' ? BRAND_COLORS.success : '#f44336',
                        }}>
                        {recurring.type === 'income' ? '+' : '-'}
                        {formatCurrency(recurring.amount, settings.currencySymbol)}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert('Options', 'Choose an action', [
                            {
                              text: isPaused ? 'Resume' : 'Pause',
                              onPress: () => handleToggleActive(recurring.id, recurring.isActive),
                            },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => handleDelete(recurring.id, recurring.description),
                            },
                            { text: 'Cancel', style: 'cancel' },
                          ])
                        }>
                        <Text className="text-xl">⋮</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-gray-200 pt-3">
                    <Text className="text-xs text-gray-600">Next Due:</Text>
                    <Text className="text-xs font-semibold text-gray-700">
                      {isPaused ? 'Paused' : nextDue}
                    </Text>
                  </View>

                  {recurring.endDate && (
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs text-gray-600">Ends:</Text>
                      <Text className="text-xs text-gray-700">
                        {new Date(recurring.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
