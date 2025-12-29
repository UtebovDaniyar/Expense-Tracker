// Analytics calculation utilities

import { Transaction, Category } from '@/types/models';

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function calculateTrend(
  current: number,
  previous: number
): { percentage: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) {
    return { percentage: 0, direction: 'neutral' };
  }

  const change = ((current - previous) / previous) * 100;
  const percentage = Math.abs(Math.round(change));

  if (change > 0) return { percentage, direction: 'up' };
  if (change < 0) return { percentage, direction: 'down' };
  return { percentage: 0, direction: 'neutral' };
}

export function groupTransactionsByDate(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  return transactions.reduce(
    (groups, transaction) => {
      const date = transaction.date.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );
}

export function groupTransactionsByCategory(
  transactions: Transaction[]
): Record<Category, Transaction[]> {
  return transactions.reduce(
    (groups, transaction) => {
      if (!groups[transaction.category]) {
        groups[transaction.category] = [];
      }
      groups[transaction.category].push(transaction);
      return groups;
    },
    {} as Record<Category, Transaction[]>
  );
}
