import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SectionList,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { useTransactionsStore, useSettingsStore, useFilterStore } from '@/store';
import { formatCurrency } from '@/utils/currency';
import { isToday, isYesterday } from '@/utils/date';
import { getCategoryConfig } from '@/constants/categories';
import { Transaction } from '@/types/models';

type SectionData = {
  title: string;
  data: Transaction[];
  total: number;
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, deleteTransaction } = useTransactionsStore();
  const { settings } = useSettingsStore();
  const {
    activeFilters,
    getFilteredTransactions,
    hasActiveFilters,
    getActiveFilterCount,
    clearFilters,
  } = useFilterStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Apply filters to transactions
  const filteredResult = useMemo(() => {
    return getFilteredTransactions(transactions);
  }, [transactions, activeFilters]);

  const filteredTransactions = filteredResult.transactions;

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    // Apply search query on top of filtered transactions
    const filtered = searchQuery
      ? filteredTransactions.filter(
          (t) =>
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : filteredTransactions;

    // Sort by date (newest first)
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Group by date categories
    const groups: Record<string, Transaction[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    sorted.forEach((transaction) => {
      const transactionDate = new Date(transaction.date);

      if (isToday(transactionDate)) {
        groups.Today.push(transaction);
      } else if (isYesterday(transactionDate)) {
        groups.Yesterday.push(transaction);
      } else if (transactionDate >= weekAgo) {
        groups['This Week'].push(transaction);
      } else {
        groups.Older.push(transaction);
      }
    });

    // Convert to section list format
    const sections: SectionData[] = [];
    Object.entries(groups).forEach(([title, data]) => {
      if (data.length > 0) {
        const total = data.reduce((sum, t) => {
          return t.type === 'income' ? sum + t.amount : sum - t.amount;
        }, 0);
        sections.push({ title, data, total });
      }
    });

    return sections;
  }, [filteredTransactions, searchQuery]);

  // Use filtered summary
  const summary = filteredResult.summary;

  const handleDelete = (transaction: Transaction) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(transaction.id);
            Alert.alert('Success', 'Transaction deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete transaction');
          }
        },
      },
    ]);
  };

  const handleEdit = (transaction: Transaction) => {
    router.push(`/(modals)/add-transaction?id=${transaction.id}`);
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: Transaction
  ) => {
    const trans = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-20, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          transform: [{ translateX: trans }],
        }}
        className="justify-center">
        <TouchableOpacity
          className="h-full justify-center px-6"
          style={{ backgroundColor: '#4dd0e1' }}
          onPress={() => handleEdit(item)}>
          <Text className="font-semibold text-white">✏️ Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: Transaction
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 20],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          transform: [{ translateX: trans }],
        }}
        className="justify-center">
        <TouchableOpacity
          className="h-full justify-center px-6"
          style={{ backgroundColor: '#f44336' }}
          onPress={() => handleDelete(item)}>
          <Text className="font-semibold text-white">🗑️ Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const category = getCategoryConfig(item.category);
    const transactionDate = new Date(item.date);

    return (
      <Swipeable
        renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        overshootLeft={false}
        overshootRight={false}>
        <View className="border-b border-gray-100 bg-white px-6 py-4">
          <View className="flex-row items-center">
            {/* Category Icon */}
            <View
              className="mr-3 h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: category?.color + '20' || '#e8f5e9' }}>
              <Text className="text-2xl">{category?.icon || '💰'}</Text>
            </View>

            {/* Transaction Details */}
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800">
                {item.description || category?.name || item.category}
              </Text>
              <Text className="text-xs text-gray-500">
                {transactionDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Amount */}
            <Text
              className="text-lg font-bold"
              style={{ color: item.type === 'income' ? '#4caf50' : '#f44336' }}>
              {item.type === 'income' ? '+' : '-'}
              {formatCurrency(item.amount, settings.currencySymbol)}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View className="px-6 py-3" style={{ backgroundColor: '#f5f5f5' }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-gray-700">{section.title}</Text>
        <Text
          className="text-sm font-semibold"
          style={{ color: section.total >= 0 ? '#4caf50' : '#f44336' }}>
          {section.total >= 0 ? '+' : ''}
          {formatCurrency(Math.abs(section.total), settings.currencySymbol)}
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pb-4 pt-12">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
            Transactions
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              className="mr-2 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: showSearch ? '#4dd0e1' : '#e8f5e9' }}
              onPress={() => setShowSearch(!showSearch)}>
              <Text className="text-xl">🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: hasActiveFilters() ? '#4dd0e1' : '#e8f5e9' }}
              onPress={() => router.push('/(modals)/transaction-filters')}>
              <Text className="text-xl">⚙️</Text>
              {hasActiveFilters() && (
                <View
                  className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#f44336' }}>
                  <Text className="text-xs font-bold text-white">{getActiveFilterCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View className="mb-4">
            <View className="flex-row items-center rounded-2xl bg-gray-100 px-4 py-3">
              <Text className="mr-2 text-gray-400">🔍</Text>
              <TextInput
                className="flex-1 text-base"
                placeholder="Search transactions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text className="text-lg text-gray-400">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Active Filters Indicator */}
        {hasActiveFilters() && (
          <View className="mb-3 flex-row items-center justify-between rounded-xl bg-blue-50 p-3">
            <View className="flex-row items-center">
              <Text className="mr-2 text-2xl">🔍</Text>
              <Text className="text-sm font-semibold text-blue-900">
                {getActiveFilterCount()} {getActiveFilterCount() === 1 ? 'filter' : 'filters'}{' '}
                active
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                clearFilters();
                setSearchQuery('');
              }}
              className="rounded-full bg-blue-100 px-3 py-1">
              <Text className="text-xs font-semibold text-blue-900">Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Card */}
        <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
          {hasActiveFilters() && (
            <View className="mb-2 flex-row items-center">
              <Text className="text-xs text-gray-600">Filtered Results</Text>
              <View className="ml-2 rounded-full bg-gray-200 px-2 py-0.5">
                <Text className="text-xs font-semibold text-gray-700">
                  {summary.count} {summary.count === 1 ? 'transaction' : 'transactions'}
                </Text>
              </View>
            </View>
          )}
          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm text-gray-600">Total Income</Text>
            <Text className="text-sm font-bold" style={{ color: '#4caf50' }}>
              +{formatCurrency(summary.income, settings.currencySymbol)}
            </Text>
          </View>
          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm text-gray-600">Total Expenses</Text>
            <Text className="text-sm font-bold" style={{ color: '#f44336' }}>
              -{formatCurrency(summary.expenses, settings.currencySymbol)}
            </Text>
          </View>
          <View className="my-2 h-px bg-gray-300" />
          <View className="flex-row justify-between">
            <Text className="text-base font-bold" style={{ color: '#1a3d3d' }}>
              Net Amount
            </Text>
            <Text
              className="text-base font-bold"
              style={{ color: summary.net >= 0 ? '#4caf50' : '#f44336' }}>
              {summary.net >= 0 ? '+' : ''}
              {formatCurrency(Math.abs(summary.net), settings.currencySymbol)}
            </Text>
          </View>
        </View>
      </View>

      {/* Transactions List */}
      {groupedTransactions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-6xl">📝</Text>
          <Text className="mb-2 text-center text-xl font-bold" style={{ color: '#1a3d3d' }}>
            No transactions yet
          </Text>
          <Text className="mb-6 text-center text-base text-gray-600">
            {searchQuery
              ? 'No transactions match your search'
              : 'Start tracking your expenses by adding your first transaction'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              className="rounded-full px-8 py-4"
              style={{ backgroundColor: '#1a3d3d' }}
              onPress={() => router.push('/(modals)/add-transaction')}>
              <Text className="font-semibold text-white">Add Transaction</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <SectionList
          sections={groupedTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Floating Action Button */}
      {transactions.length > 0 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full"
          style={{
            backgroundColor: '#1a3d3d',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
          onPress={() => router.push('/(modals)/add-transaction')}>
          <Text className="text-3xl text-white">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
