// Recurring transaction processor

import { RecurringTransaction } from '@/types/models';

export function calculateNextDueDate(
  lastCreated: string,
  frequency: RecurringTransaction['frequency']
): Date {
  const date = new Date(lastCreated);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

export function isDueForCreation(
  lastCreated: string,
  frequency: RecurringTransaction['frequency'],
  now: Date = new Date()
): boolean {
  const nextDue = calculateNextDueDate(lastCreated, frequency);
  return nextDue <= now;
}

export function isRecurringActive(
  recurring: RecurringTransaction,
  now: Date = new Date()
): boolean {
  if (!recurring.isActive) return false;

  // Check if end date has passed
  if (recurring.endDate) {
    const endDate = new Date(recurring.endDate);
    if (endDate < now) return false;
  }

  return true;
}
