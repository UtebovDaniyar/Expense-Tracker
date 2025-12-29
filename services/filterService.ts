/**
 * Filter Service
 * Handles transaction filtering logic with multiple criteria
 */

import { Transaction, Category } from '@/types/models';

export interface DateRangeFilter {
  start: string; // ISO date string
  end: string; // ISO date string
}

export interface AmountRangeFilter {
  min?: number;
  max?: number;
}

export interface FilterCriteria {
  dateRange?: DateRangeFilter;
  categories?: Category[];
  amountRange?: AmountRangeFilter;
  type?: 'income' | 'expense' | 'all';
}

export interface FilterState {
  activeFilters: FilterCriteria;
  isFiltering: boolean;
}

export interface FilterResult {
  transactions: Transaction[];
  summary: {
    income: number;
    expenses: number;
    net: number;
    count: number;
  };
}

class FilterServiceClass {
  /**
   * Apply all active filters to transaction list
   */
  applyFilters(transactions: Transaction[], filters: FilterCriteria): FilterResult {
    let filtered = [...transactions];

    // Apply date range filter
    if (filters.dateRange) {
      filtered = this.filterByDateRange(filtered, filters.dateRange);
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = this.filterByCategories(filtered, filters.categories);
    }

    // Apply amount range filter
    if (filters.amountRange) {
      filtered = this.filterByAmountRange(filtered, filters.amountRange);
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = this.filterByType(filtered, filters.type);
    }

    // Calculate summary
    const summary = this.calculateSummary(filtered);

    return {
      transactions: filtered,
      summary,
    };
  }

  /**
   * Filter transactions by date range
   */
  filterByDateRange(transactions: Transaction[], dateRange: DateRangeFilter): Transaction[] {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Set time to start/end of day for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  /**
   * Filter transactions by categories
   */
  filterByCategories(transactions: Transaction[], categories: Category[]): Transaction[] {
    return transactions.filter((t) => categories.includes(t.category));
  }

  /**
   * Filter transactions by amount range
   */
  filterByAmountRange(transactions: Transaction[], amountRange: AmountRangeFilter): Transaction[] {
    return transactions.filter((t) => {
      const amount = t.amount;

      // Check minimum
      if (amountRange.min !== undefined && amount < amountRange.min) {
        return false;
      }

      // Check maximum
      if (amountRange.max !== undefined && amount > amountRange.max) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter transactions by type (income/expense)
   */
  filterByType(transactions: Transaction[], type: 'income' | 'expense'): Transaction[] {
    return transactions.filter((t) => t.type === type);
  }

  /**
   * Calculate summary for filtered transactions
   */
  calculateSummary(transactions: Transaction[]): FilterResult['summary'] {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      net: income - expenses,
      count: transactions.length,
    };
  }

  /**
   * Validate filter criteria
   */
  validateFilters(filters: FilterCriteria): { valid: boolean; error?: string } {
    // Validate date range
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, error: 'Invalid date format' };
      }

      if (start > end) {
        return { valid: false, error: 'Start date must be before end date' };
      }
    }

    // Validate amount range
    if (filters.amountRange) {
      const { min, max } = filters.amountRange;

      if (min !== undefined && min < 0) {
        return { valid: false, error: 'Minimum amount cannot be negative' };
      }

      if (max !== undefined && max < 0) {
        return { valid: false, error: 'Maximum amount cannot be negative' };
      }

      if (min !== undefined && max !== undefined && min > max) {
        return { valid: false, error: 'Minimum amount must be less than maximum' };
      }
    }

    return { valid: true };
  }

  /**
   * Get count of active filters
   */
  getActiveFilterCount(filters: FilterCriteria): number {
    let count = 0;

    if (filters.dateRange) count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (
      filters.amountRange &&
      (filters.amountRange.min !== undefined || filters.amountRange.max !== undefined)
    )
      count++;
    if (filters.type && filters.type !== 'all') count++;

    return count;
  }

  /**
   * Get date range for predefined periods
   */
  getDateRangeForPeriod(period: 'week' | 'month' | 'year'): DateRangeFilter {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        // Start of current week (Sunday)
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'month':
        // Start of current month
        start.setDate(1);
        break;
      case 'year':
        // Start of current year
        start.setMonth(0, 1);
        break;
    }

    start.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  }

  /**
   * Clear all filters
   */
  clearFilters(): FilterCriteria {
    return {
      dateRange: undefined,
      categories: [],
      amountRange: undefined,
      type: 'all',
    };
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(filters: FilterCriteria): boolean {
    return this.getActiveFilterCount(filters) > 0;
  }
}

export const FilterService = new FilterServiceClass();
