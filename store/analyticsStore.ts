// Analytics store for computing financial insights and statistics

import { create } from 'zustand';
import { Category } from '@/types/models';
import { useTransactionsStore } from './transactionsStore';
import { groupTransactionsByCategory } from '@/utils/analytics';

interface CategoryBreakdown {
  category: Category;
  total: number;
  percentage: number;
  transactionCount: number;
  averageTransactionSize: number;
}

interface TrendData {
  date: string;
  income: number;
  expenses: number;
}

interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
}

interface AnalyticsState {
  getTotalIncome: (startDate: string, endDate: string) => number;
  getTotalExpenses: (startDate: string, endDate: string) => number;
  getNetSavings: (startDate: string, endDate: string) => number;
  getCategoryBreakdown: (startDate: string, endDate: string) => CategoryBreakdown[];
  getSpendingTrend: (
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month'
  ) => TrendData[];
  getInsights: (startDate: string, endDate: string) => Insight[];
  getTopCategories: (startDate: string, endDate: string, limit: number) => CategoryBreakdown[];
  getAverageDailySpending: (startDate: string, endDate: string) => number;
  getHighestExpenseDay: (
    startDate: string,
    endDate: string
  ) => { date: string; amount: number } | null;
  getMostFrequentCategory: (startDate: string, endDate: string) => Category | null;
}

export const useAnalyticsStore = create<AnalyticsState>(() => ({
  getTotalIncome: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    return transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  },

  getTotalExpenses: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    return transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  },

  getNetSavings: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return income - expenses;
  },

  getCategoryBreakdown: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    const grouped = groupTransactionsByCategory(expenses);

    const breakdown: CategoryBreakdown[] = Object.entries(grouped).map(([category, txns]) => {
      const total = txns.reduce((sum, t) => sum + t.amount, 0);
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
      const transactionCount = txns.length;
      const averageTransactionSize = transactionCount > 0 ? total / transactionCount : 0;

      return {
        category: category as Category,
        total,
        percentage: Math.round(percentage),
        transactionCount,
        averageTransactionSize,
      };
    });

    return breakdown.sort((a, b) => b.total - a.total);
  },

  getSpendingTrend: (startDate, endDate, interval) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const trendMap = new Map<string, { income: number; expenses: number }>();

    transactions.forEach((t) => {
      const date = new Date(t.date);
      let key: string;

      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!trendMap.has(key)) {
        trendMap.set(key, { income: 0, expenses: 0 });
      }

      const data = trendMap.get(key)!;
      if (t.type === 'income') {
        data.income += t.amount;
      } else {
        data.expenses += t.amount;
      }
    });

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getInsights: (startDate, endDate): Insight[] => {
    const insights: Insight[] = [];
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const expenses = transactions.filter((t) => t.type === 'expense');

    if (expenses.length === 0) {
      return [
        {
          id: 'no-data',
          type: 'info',
          title: 'Start tracking your expenses',
          description: 'Add your first expense to see personalized insights',
        },
      ];
    }

    // Calculate previous period for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start);

    const currentTotal = expenses.reduce((sum, t) => sum + t.amount, 0);
    const prevTransactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(prevStart.toISOString(), prevEnd.toISOString())
      .filter((t) => t.type === 'expense');
    const prevTotal = prevTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Spending comparison insight
    if (prevTotal > 0) {
      const change = ((currentTotal - prevTotal) / prevTotal) * 100;
      if (change < -10) {
        insights.push({
          id: 'spending-down',
          type: 'positive',
          title: `You spent ${Math.abs(Math.round(change))}% less this period`,
          description: 'Great job managing your expenses!',
        });
      } else if (change > 10) {
        insights.push({
          id: 'spending-up',
          type: 'warning',
          title: `Your spending increased by ${Math.round(change)}%`,
          description: 'Consider reviewing your budget to stay on track',
          actionLabel: 'View Budget',
          actionRoute: '/budget',
        });
      }
    }

    // Top category insight - calculate inline to avoid circular dependency
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const grouped = groupTransactionsByCategory(expenses);

    const breakdown: CategoryBreakdown[] = Object.entries(grouped).map(([category, txns]) => {
      const total = txns.reduce((sum, t) => sum + t.amount, 0);
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
      const transactionCount = txns.length;
      const averageTransactionSize = transactionCount > 0 ? total / transactionCount : 0;

      return {
        category: category as Category,
        total,
        percentage: Math.round(percentage),
        transactionCount,
        averageTransactionSize,
      };
    });

    const sortedBreakdown = breakdown.sort((a, b) => b.total - a.total);

    if (sortedBreakdown.length > 0) {
      const topCategory = sortedBreakdown[0];
      insights.push({
        id: 'top-category',
        type: 'info',
        title: `${topCategory.category} is your top expense`,
        description: `You spent ${topCategory.percentage}% of your budget on ${topCategory.category}`,
      });
    }

    return insights;
  },

  getTopCategories: (startDate, endDate, limit): CategoryBreakdown[] => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    const grouped = groupTransactionsByCategory(expenses);

    const breakdown: CategoryBreakdown[] = Object.entries(grouped).map(([category, txns]) => {
      const total = txns.reduce((sum, t) => sum + t.amount, 0);
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
      const transactionCount = txns.length;
      const averageTransactionSize = transactionCount > 0 ? total / transactionCount : 0;

      return {
        category: category as Category,
        total,
        percentage: Math.round(percentage),
        transactionCount,
        averageTransactionSize,
      };
    });

    return breakdown.sort((a, b) => b.total - a.total).slice(0, limit);
  },

  getAverageDailySpending: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return days > 0 ? totalExpenses / days : 0;
  },

  getHighestExpenseDay: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const expenses = transactions.filter((t) => t.type === 'expense');

    const dailyTotals = new Map<string, number>();
    expenses.forEach((t) => {
      const date = t.date.split('T')[0];
      dailyTotals.set(date, (dailyTotals.get(date) || 0) + t.amount);
    });

    if (dailyTotals.size === 0) return null;

    let maxDate = '';
    let maxAmount = 0;
    dailyTotals.forEach((amount, date) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxDate = date;
      }
    });

    return { date: maxDate, amount: maxAmount };
  },

  getMostFrequentCategory: (startDate, endDate) => {
    const transactions = useTransactionsStore
      .getState()
      .getTransactionsByDateRange(startDate, endDate);
    const expenses = transactions.filter((t) => t.type === 'expense');

    if (expenses.length === 0) return null;

    const categoryCounts = new Map<Category, number>();
    expenses.forEach((t) => {
      categoryCounts.set(t.category, (categoryCounts.get(t.category) || 0) + 1);
    });

    let maxCategory: Category | null = null;
    let maxCount = 0;
    categoryCounts.forEach((count, category) => {
      if (count > maxCount) {
        maxCount = count;
        maxCategory = category;
      }
    });

    return maxCategory;
  },
}));
