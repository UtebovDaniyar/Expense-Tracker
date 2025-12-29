import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import {
  useAnalyticsStore,
  useSettingsStore,
  useTransactionsStore,
  useBudgetStore,
  useGoalsStore,
} from '@/store';
import { useInsightsStore } from '@/store/insightsStore';
import { formatCurrency } from '@/utils/currency';
import { getCategoryConfig } from '@/constants/categories';
import { getStartOfMonth, getEndOfMonth } from '@/utils/date';
import { ComparisonService, PeriodType } from '@/services/comparisonService';
import { PeriodComparisonCard } from '@/components/PeriodComparison';
import { InsightCard } from '@/components/InsightCard';
import { LineChart } from '@/components/LineChart';
import { StatCard } from '@/components/StatCard';

type Period = 'week' | 'month' | 'year' | 'all';
type Tab = 'overview' | 'trends' | 'categories' | 'insights';

export default function AnalyticsScreen() {
  const { settings } = useSettingsStore();
  const {
    getTotalIncome,
    getTotalExpenses,
    getNetSavings,
    getCategoryBreakdown,
    getTopCategories,
    getSpendingTrend,
    getAverageDailySpending,
    getHighestExpenseDay,
    getMostFrequentCategory,
  } = useAnalyticsStore();
  const { generateInsights, dismissInsight } = useInsightsStore();
  const { budget, categoryBudgets } = useBudgetStore();
  const { goals } = useGoalsStore();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showIncome, setShowIncome] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [sortBy, setSortBy] = useState<'amount' | 'frequency'>('amount');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = getStartOfMonth(now);
        endDate = getEndOfMonth(now);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1); // Arbitrary start date
        endDate = now;
        break;
    }

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }, [selectedPeriod]);

  // Calculate analytics data
  const totalIncome = useMemo(
    () => getTotalIncome(dateRange.start, dateRange.end),
    [dateRange, getTotalIncome]
  );

  const totalExpenses = useMemo(
    () => getTotalExpenses(dateRange.start, dateRange.end),
    [dateRange, getTotalExpenses]
  );

  const netSavings = useMemo(
    () => getNetSavings(dateRange.start, dateRange.end),
    [dateRange, getNetSavings]
  );

  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(dateRange.start, dateRange.end),
    [dateRange, getCategoryBreakdown]
  );

  const topCategories = useMemo(
    () => getTopCategories(dateRange.start, dateRange.end, 5),
    [dateRange, getTopCategories]
  );

  // Trends data
  const trendInterval =
    selectedPeriod === 'week' ? 'day' : selectedPeriod === 'month' ? 'day' : 'month';
  const spendingTrend = useMemo(
    () => getSpendingTrend(dateRange.start, dateRange.end, trendInterval),
    [dateRange, trendInterval, getSpendingTrend]
  );

  const averageDailySpending = useMemo(
    () => getAverageDailySpending(dateRange.start, dateRange.end),
    [dateRange, getAverageDailySpending]
  );

  const highestExpenseDay = useMemo(
    () => getHighestExpenseDay(dateRange.start, dateRange.end),
    [dateRange, getHighestExpenseDay]
  );

  const mostFrequentCategory = useMemo(
    () => getMostFrequentCategory(dateRange.start, dateRange.end),
    [dateRange, getMostFrequentCategory]
  );

  // Insights data using new InsightsService
  const insights = useMemo(() => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(dateRange.start, dateRange.end);

    return generateInsights({
      transactions,
      budget,
      categoryBudgets,
      goals,
      dateRange,
    });
  }, [dateRange, budget, categoryBudgets, goals, generateInsights]);

  // Period comparison data
  const { transactions } = useTransactionsStore();
  const periodComparison = useMemo(() => {
    if (selectedPeriod === 'all') return null;

    const periodType: PeriodType = selectedPeriod as PeriodType;
    return ComparisonService.comparePeriods(transactions, periodType);
  }, [transactions, selectedPeriod]);

  const periods: { value: Period; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All Time' },
  ];

  const tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'overview', label: 'Overview', icon: '📊' },
    { value: 'trends', label: 'Trends', icon: '📈' },
    { value: 'categories', label: 'Categories', icon: '🏷️' },
    { value: 'insights', label: 'Insights', icon: '💡' },
  ];

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pb-4 pt-12">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
            Analytics
          </Text>
          <TouchableOpacity>
            <Text className="text-xl">📤</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {periods.map((period) => (
            <TouchableOpacity
              key={period.value}
              className="mr-3 rounded-full px-6 py-2"
              style={{
                backgroundColor: selectedPeriod === period.value ? '#1a3d3d' : '#e8f5e9',
              }}
              onPress={() => setSelectedPeriod(period.value)}>
              <Text
                className="text-sm font-semibold"
                style={{
                  color: selectedPeriod === period.value ? 'white' : '#1a3d3d',
                }}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              className="mr-6 pb-2"
              style={{
                borderBottomWidth: activeTab === tab.value ? 2 : 0,
                borderBottomColor: '#1a3d3d',
              }}
              onPress={() => setActiveTab(tab.value)}>
              <View className="flex-row items-center">
                <Text className="mr-1 text-base">{tab.icon}</Text>
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: activeTab === tab.value ? '#1a3d3d' : '#9ca3af',
                  }}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1">
        {activeTab === 'overview' && (
          <View className="px-6">
            {/* Summary Cards */}
            <View className="mb-6 flex-row">
              <View className="mr-2 flex-1 rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="mb-1 text-xs text-gray-600">Total Income</Text>
                <Text className="text-xl font-bold" style={{ color: '#4caf50' }}>
                  {formatCurrency(totalIncome, settings.currencySymbol)}
                </Text>
              </View>
              <View className="mx-1 flex-1 rounded-2xl p-4" style={{ backgroundColor: '#ffebee' }}>
                <Text className="mb-1 text-xs text-gray-600">Total Expenses</Text>
                <Text className="text-xl font-bold" style={{ color: '#f44336' }}>
                  {formatCurrency(totalExpenses, settings.currencySymbol)}
                </Text>
              </View>
              <View
                className="ml-2 flex-1 rounded-2xl p-4"
                style={{ backgroundColor: '#f4d03f20' }}>
                <Text className="mb-1 text-xs text-gray-600">Net Savings</Text>
                <Text
                  className="text-xl font-bold"
                  style={{ color: netSavings >= 0 ? '#4caf50' : '#f44336' }}>
                  {formatCurrency(Math.abs(netSavings), settings.currencySymbol)}
                </Text>
              </View>
            </View>

            {/* Donut Chart Section */}
            <View className="mb-6">
              <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
                Expense Breakdown
              </Text>

              {categoryBreakdown.length === 0 ? (
                <View
                  className="items-center rounded-2xl p-8"
                  style={{ backgroundColor: '#e8f5e9' }}>
                  <Text className="mb-2 text-4xl">📊</Text>
                  <Text
                    className="mb-1 text-center text-base font-semibold"
                    style={{ color: '#1a3d3d' }}>
                    No expenses yet
                  </Text>
                  <Text className="text-center text-sm text-gray-600">
                    Start adding expenses to see your breakdown
                  </Text>
                </View>
              ) : (
                <>
                  {/* Simple Donut Chart Visualization */}
                  <View className="mb-6 items-center">
                    <View className="relative items-center justify-center">
                      <View
                        className="h-48 w-48 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: '#e8f5e9',
                          borderWidth: 20,
                          borderColor: topCategories[0]
                            ? getCategoryConfig(topCategories[0].category)?.color
                            : '#4caf50',
                        }}>
                        <View className="items-center">
                          <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
                            {formatCurrency(totalExpenses, settings.currencySymbol)}
                          </Text>
                          <Text className="text-sm text-gray-600">Total Spent</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Legend */}
                  <View>
                    {topCategories.map((item) => {
                      const category = getCategoryConfig(item.category);
                      if (!category) return null;

                      return (
                        <View
                          key={item.category}
                          className="mb-3 flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center">
                            <View
                              className="mr-3 h-4 w-4 rounded"
                              style={{ backgroundColor: category.color }}
                            />
                            <Text className="text-sm" style={{ color: '#1a3d3d' }}>
                              {category.name}
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Text
                              className="mr-2 text-sm font-semibold"
                              style={{ color: '#1a3d3d' }}>
                              {formatCurrency(item.total, settings.currencySymbol)}
                            </Text>
                            <View
                              className="rounded-full px-2 py-1"
                              style={{ backgroundColor: category.color + '20' }}>
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: category.color }}>
                                {item.percentage}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {activeTab === 'trends' && (
          <View className="px-6">
            {/* Toggle Buttons */}
            <View className="mb-6 flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 rounded-full py-3"
                style={{
                  backgroundColor: showIncome ? '#4caf50' : '#e8f5e9',
                }}
                onPress={() => setShowIncome(!showIncome)}>
                <Text
                  className="text-center text-sm font-semibold"
                  style={{ color: showIncome ? 'white' : '#1a3d3d' }}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-full py-3"
                style={{
                  backgroundColor: showExpenses ? '#f44336' : '#e8f5e9',
                }}
                onPress={() => setShowExpenses(!showExpenses)}>
                <Text
                  className="text-center text-sm font-semibold"
                  style={{ color: showExpenses ? 'white' : '#1a3d3d' }}>
                  Expenses
                </Text>
              </TouchableOpacity>
            </View>

            {/* Line Chart with Points */}
            <View className="mb-6">
              <LineChart
                data={spendingTrend}
                showIncome={showIncome}
                showExpenses={showExpenses}
                height={250}
              />
            </View>

            {/* Statistics Cards Grid */}
            <View className="mb-6">
              <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
                Key Metrics
              </Text>

              <View className="mb-3">
                <StatCard
                  title="Average Daily Spending"
                  value={formatCurrency(averageDailySpending, settings.currencySymbol)}
                  icon="💰"
                  backgroundColor="#e8f5e9"
                  valueColor="#1a3d3d"
                />
              </View>

              {highestExpenseDay && (
                <View className="mb-3">
                  <StatCard
                    title="Highest Expense Day"
                    value={formatCurrency(highestExpenseDay.amount, settings.currencySymbol)}
                    subtitle={new Date(highestExpenseDay.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    icon="📈"
                    backgroundColor="#ffebee"
                    valueColor="#f44336"
                  />
                </View>
              )}

              {mostFrequentCategory && (
                <View className="mb-3">
                  <StatCard
                    title="Most Frequent Category"
                    value={getCategoryConfig(mostFrequentCategory)?.name || ''}
                    icon={getCategoryConfig(mostFrequentCategory)?.icon}
                    backgroundColor="#f4d03f20"
                    valueColor="#1a3d3d"
                  />
                </View>
              )}

              <View className="flex-row">
                <View className="mr-2 flex-1">
                  <StatCard
                    title="Total Income"
                    value={formatCurrency(totalIncome, settings.currencySymbol)}
                    icon="💵"
                    backgroundColor="#e8f5e9"
                    valueColor="#4caf50"
                  />
                </View>
                <View className="ml-2 flex-1">
                  <StatCard
                    title="Total Expenses"
                    value={formatCurrency(totalExpenses, settings.currencySymbol)}
                    icon="💸"
                    backgroundColor="#ffebee"
                    valueColor="#f44336"
                  />
                </View>
              </View>
            </View>

            {/* Comparison Section */}
            <View className="mb-6">
              <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
                Period Comparison
              </Text>
              {periodComparison ? (
                <PeriodComparisonCard
                  comparison={periodComparison}
                  currencySymbol={settings.currencySymbol}
                />
              ) : (
                <View className="rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
                  <Text className="text-center text-sm text-gray-600">
                    Period comparison not available for &quot;All Time&quot; view
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'categories' && (
          <View className="px-6">
            {/* Sort Options */}
            <View className="mb-6 flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 rounded-full py-3"
                style={{
                  backgroundColor: sortBy === 'amount' ? '#1a3d3d' : '#e8f5e9',
                }}
                onPress={() => setSortBy('amount')}>
                <Text
                  className="text-center text-sm font-semibold"
                  style={{ color: sortBy === 'amount' ? 'white' : '#1a3d3d' }}>
                  By Amount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-full py-3"
                style={{
                  backgroundColor: sortBy === 'frequency' ? '#1a3d3d' : '#e8f5e9',
                }}
                onPress={() => setSortBy('frequency')}>
                <Text
                  className="text-center text-sm font-semibold"
                  style={{ color: sortBy === 'frequency' ? 'white' : '#1a3d3d' }}>
                  By Frequency
                </Text>
              </TouchableOpacity>
            </View>

            {categoryBreakdown.length === 0 ? (
              <View className="items-center rounded-2xl p-8" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="mb-2 text-4xl">🏷️</Text>
                <Text
                  className="mb-1 text-center text-base font-semibold"
                  style={{ color: '#1a3d3d' }}>
                  No categories yet
                </Text>
                <Text className="text-center text-sm text-gray-600">
                  Start adding expenses to see category breakdown
                </Text>
              </View>
            ) : (
              <>
                {/* Horizontal Bar Chart */}
                <View className="mb-6">
                  <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
                    Category Spending
                  </Text>
                  {(() => {
                    const sortedCategories = [...categoryBreakdown].sort((a, b) =>
                      sortBy === 'amount'
                        ? b.total - a.total
                        : b.transactionCount - a.transactionCount
                    );

                    const maxValue =
                      sortBy === 'amount'
                        ? Math.max(...sortedCategories.map((c) => c.total))
                        : Math.max(...sortedCategories.map((c) => c.transactionCount));

                    return sortedCategories.map((item) => {
                      const category = getCategoryConfig(item.category);
                      if (!category) return null;

                      const value = sortBy === 'amount' ? item.total : item.transactionCount;
                      const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;

                      return (
                        <View key={item.category} className="mb-4">
                          <View className="mb-2 flex-row items-center justify-between">
                            <View className="flex-1 flex-row items-center">
                              <View
                                className="mr-2 h-8 w-8 items-center justify-center rounded-full"
                                style={{ backgroundColor: category.color + '20' }}>
                                <Text className="text-base">{category.icon}</Text>
                              </View>
                              <Text className="text-sm font-semibold" style={{ color: '#1a3d3d' }}>
                                {category.name}
                              </Text>
                            </View>
                            <Text className="text-sm font-bold" style={{ color: '#1a3d3d' }}>
                              {sortBy === 'amount'
                                ? formatCurrency(item.total, settings.currencySymbol)
                                : `${item.transactionCount} txns`}
                            </Text>
                          </View>
                          <View className="h-3 overflow-hidden rounded-full bg-gray-200">
                            <View
                              className="h-3 rounded-full"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: category.color,
                              }}
                            />
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>

                {/* Expandable Category Details */}
                <View className="mb-6">
                  <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
                    Category Details
                  </Text>
                  {categoryBreakdown.map((item) => {
                    const category = getCategoryConfig(item.category);
                    if (!category) return null;

                    const isExpanded = expandedCategory === item.category;

                    return (
                      <TouchableOpacity
                        key={item.category}
                        className="mb-3 rounded-2xl p-4"
                        style={{ backgroundColor: category.color + '10' }}
                        onPress={() => setExpandedCategory(isExpanded ? null : item.category)}>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center">
                            <View
                              className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                              style={{ backgroundColor: category.color + '20' }}>
                              <Text className="text-2xl">{category.icon}</Text>
                            </View>
                            <View className="flex-1">
                              <Text
                                className="text-base font-semibold"
                                style={{ color: '#1a3d3d' }}>
                                {category.name}
                              </Text>
                              <Text className="text-xs text-gray-600">
                                {item.transactionCount} transactions
                              </Text>
                            </View>
                          </View>
                          <View className="items-end">
                            <Text className="text-lg font-bold" style={{ color: category.color }}>
                              {formatCurrency(item.total, settings.currencySymbol)}
                            </Text>
                            <Text className="text-xs text-gray-600">{item.percentage}%</Text>
                          </View>
                        </View>

                        {isExpanded && (
                          <View className="mt-4 border-t border-gray-300 pt-4">
                            <View className="mb-2 flex-row justify-between">
                              <Text className="text-sm text-gray-600">Average per transaction</Text>
                              <Text className="text-sm font-semibold" style={{ color: '#1a3d3d' }}>
                                {formatCurrency(
                                  item.averageTransactionSize,
                                  settings.currencySymbol
                                )}
                              </Text>
                            </View>
                            <View className="mb-2 flex-row justify-between">
                              <Text className="text-sm text-gray-600">Total transactions</Text>
                              <Text className="text-sm font-semibold" style={{ color: '#1a3d3d' }}>
                                {item.transactionCount}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-sm text-gray-600">Percentage of total</Text>
                              <Text className="text-sm font-semibold" style={{ color: '#1a3d3d' }}>
                                {item.percentage}%
                              </Text>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {activeTab === 'insights' && (
          <View className="px-6 pb-6">
            <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
              Financial Insights
            </Text>

            {insights.length === 0 ? (
              <View className="items-center rounded-2xl p-8" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="mb-2 text-4xl">💡</Text>
                <Text
                  className="mb-1 text-center text-base font-semibold"
                  style={{ color: '#1a3d3d' }}>
                  No insights yet
                </Text>
                <Text className="text-center text-sm text-gray-600">
                  Add more transactions to get personalized insights
                </Text>
              </View>
            ) : (
              <>
                {insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} />
                ))}

                {/* Additional Insights Section */}
                <View className="mt-6">
                  <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
                    Quick Stats
                  </Text>

                  <View className="mb-3 rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
                    <View className="mb-2 flex-row items-center">
                      <Text className="mr-2 text-2xl">📊</Text>
                      <Text className="text-base font-semibold" style={{ color: '#1a3d3d' }}>
                        Spending Pattern
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-700">
                      You have {categoryBreakdown.length} active spending categories this period
                    </Text>
                  </View>

                  {totalIncome > 0 && (
                    <View className="mb-3 rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
                      <View className="mb-2 flex-row items-center">
                        <Text className="mr-2 text-2xl">💰</Text>
                        <Text className="text-base font-semibold" style={{ color: '#1a3d3d' }}>
                          Savings Rate
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-700">
                        You saved {Math.round((netSavings / totalIncome) * 100)}% of your income
                        this period
                      </Text>
                    </View>
                  )}

                  <View className="rounded-2xl p-4" style={{ backgroundColor: '#f4d03f20' }}>
                    <View className="mb-2 flex-row items-center">
                      <Text className="mr-2 text-2xl">🎯</Text>
                      <Text className="text-base font-semibold" style={{ color: '#1a3d3d' }}>
                        Recommendation
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-700">
                      {netSavings >= 0
                        ? 'Great job! Keep maintaining your spending habits.'
                        : 'Consider reviewing your budget to reduce expenses.'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
