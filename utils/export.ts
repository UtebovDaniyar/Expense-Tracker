// Data export utilities for CSV generation

import { Transaction } from '@/types/models';
import { formatDate } from './date';

export function generateCSV(transactions: Transaction[], currencySymbol: string): string {
  // CSV header
  const header = 'Date,Type,Category,Amount,Description\n';

  // CSV rows
  const rows = transactions
    .map((t) => {
      const date = formatDate(new Date(t.date), 'DD/MM/YYYY HH:mm');
      const type = t.type.charAt(0).toUpperCase() + t.type.slice(1);
      const category = t.category.charAt(0).toUpperCase() + t.category.slice(1);
      const amount = `${currencySymbol}${t.amount.toFixed(2)}`;
      const description = `"${t.description.replace(/"/g, '""')}"`;

      return `${date},${type},${category},${amount},${description}`;
    })
    .join('\n');

  return header + rows;
}

export function generateFileName(): string {
  const now = new Date();
  const dateStr = formatDate(now, 'YYYY-MM-DD');
  return `pennywise-export-${dateStr}.csv`;
}
