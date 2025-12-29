import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useSettingsStore, useBudgetStore, useGoalsStore, useTransactionsStore } from '@/store';
import { getGreeting, getStartOfMonth, getEndOfMonth } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { getBudgetStatus } = useBudgetStore();
  const { goals } = useGoalsStore();
  const { transactions } = useTransactionsStore();

  useEffect(() => {
    // Redirect to onboarding if not completed
    if (!settings.hasCompletedOnboarding) {
      router.replace('/(onboarding)');
    }
  }, [settings.hasCompletedOnboarding, router]);

  const budgetStatus = getBudgetStatus();
  const greeting = getGreeting();

  // Calculate current month income and expenses
  const now = new Date();
  const startOfMonth = getStartOfMonth(now);
  const endOfMonth = getEndOfMonth(now);

  const monthTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= startOfMonth && tDate <= endOfMonth;
  });

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

  // Get active goals (max 3)
  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3);

  // Get recent transactions (max 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Offline Mode Banner */}
      <OfflineBanner />

      {/* Header */}
      <View className="px-6 pb-4 pt-12">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-base text-gray-600">{greeting}</Text>
            <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
              {settings.userName || 'Welcome'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: '#e8f5e9' }}>
              <Text className="text-xl">🔔</Text>
            </View>
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: '#e8f5e9' }}>
              <Text className="text-xl">👤</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Wallet Card */}
      <View className="mx-6 mb-6 rounded-3xl p-6" style={{ backgroundColor: '#1a3d3d' }}>
        <Text className="mb-1 text-sm text-white">My Wallet</Text>
        <Text className="mb-4 text-xs text-white opacity-70">
          {startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Text className="mb-2 text-4xl font-bold text-white">
          {formatCurrency(balance, settings.currencySymbol)}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-sm text-white opacity-70">
            {balance >= 0 ? '↑' : '↓'} {Math.abs(balance).toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View className="mb-6 flex-row px-6">
        <View className="mr-3 flex-1 rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
          <Text className="mb-1 text-sm text-gray-600">Income</Text>
          <Text className="text-2xl font-bold" style={{ color: '#4caf50' }}>
            {formatCurrency(income, settings.currencySymbol)}
          </Text>
          <Text className="mt-1 text-xs text-gray-500">This month</Text>
        </View>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: '#fff3e0' }}>
          <Text className="mb-1 text-sm text-gray-600">Spending</Text>
          <Text className="text-2xl font-bold" style={{ color: '#f44336' }}>
            {formatCurrency(expenses, settings.currencySymbol)}
          </Text>
          <Text className="mt-1 text-xs text-gray-500">This month</Text>
        </View>
      </View>

      {/* Budget Card */}
      {budgetStatus.totalBudget > 0 && (
        <TouchableOpacity
          className="mx-6 mb-6 rounded-2xl p-4"
          style={{ backgroundColor: '#f4d03f20' }}
          onPress={() => router.push('/budget')}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold" style={{ color: '#1a3d3d' }}>
              Monthly Budget
            </Text>
            <Text className="text-sm" style={{ color: '#4dd0e1' }}>
              View details →
            </Text>
          </View>
          <View className="mb-2 flex-row items-center">
            <View className="flex-1">
              <View className="h-3 rounded-full bg-gray-200">
                <View
                  className="h-3 rounded-full"
                  style={{
                    width: `${Math.min(budgetStatus.percentageUsed, 100)}%`,
                    backgroundColor:
                      budgetStatus.percentageUsed >= 100
                        ? '#f44336'
                        : budgetStatus.percentageUsed >= 75
                          ? '#ff9800'
                          : '#4caf50',
                  }}
                />
              </View>
            </View>
            <Text className="ml-3 text-sm font-semibold" style={{ color: '#1a3d3d' }}>
              {budgetStatus.percentageUsed}%
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-600">
              Spent: {formatCurrency(budgetStatus.spent, settings.currencySymbol)}
            </Text>
            <Text className="text-xs text-gray-600">
              Remaining: {formatCurrency(budgetStatus.remaining, settings.currencySymbol)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Goals Section */}
      {activeGoals.length > 0 && (
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between px-6">
            <Text className="text-lg font-bold" style={{ color: '#1a3d3d' }}>
              Goals
            </Text>
            <TouchableOpacity onPress={() => router.push('/goals')}>
              <Text className="text-sm" style={{ color: '#4dd0e1' }}>
                View all
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6">
            {activeGoals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <View
                  key={goal.id}
                  className="mr-3 rounded-2xl p-4"
                  style={{ width: 200, backgroundColor: '#e8f5e9' }}>
                  <View className="mb-2 flex-row items-center">
                    <Text className="mr-2 text-2xl">{goal.icon || '🎯'}</Text>
                    <Text className="flex-1 text-base font-semibold" style={{ color: '#1a3d3d' }}>
                      {goal.name}
                    </Text>
                  </View>
                  <View className="mb-2 h-2 rounded-full bg-gray-200">
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: '#4caf50' }}
                    />
                  </View>
                  <Text className="text-xs text-gray-600">
                    {formatCurrency(goal.currentAmount, settings.currencySymbol)} /{' '}
                    {formatCurrency(goal.targetAmount, settings.currencySymbol)}
                  </Text>
                  <View
                    className="mt-2 self-start rounded-full px-2 py-1"
                    style={{ backgroundColor: '#4caf50' }}>
                    <Text className="text-xs text-white">Ongoing</Text>
                  </View>
                </View>
              );
            })}
            <TouchableOpacity
              className="items-center justify-center rounded-2xl bg-gray-100 p-4"
              style={{ width: 200 }}
              onPress={() => router.push('/(modals)/add-goal')}>
              <Text className="mb-2 text-3xl">➕</Text>
              <Text className="text-sm text-gray-600">Create new goal</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Recent Transactions */}
      <View className="mb-6 px-6">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold" style={{ color: '#1a3d3d' }}>
            Transactions
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
            <Text className="text-sm" style={{ color: '#4dd0e1' }}>
              View all
            </Text>
          </TouchableOpacity>
        </View>
        {recentTransactions.length === 0 ? (
          <View className="items-center py-8">
            <Text className="mb-2 text-4xl">📝</Text>
            <Text className="text-base text-gray-600">No transactions yet</Text>
            <Text className="text-sm text-gray-500">Tap + to add your first expense</Text>
          </View>
        ) : (
          recentTransactions.map((transaction) => (
            <View
              key={transaction.id}
              className="flex-row items-center border-b border-gray-100 py-3">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="text-xl">{transaction.type === 'income' ? '💰' : '💸'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-800">
                  {transaction.description || transaction.category}
                </Text>
                <Text className="text-xs text-gray-500">
                  {new Date(transaction.date).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text
                className="text-base font-bold"
                style={{ color: transaction.type === 'income' ? '#4caf50' : '#f44336' }}>
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount, settings.currencySymbol)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Floating Action Button */}
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
    </ScrollView>
  );
}
