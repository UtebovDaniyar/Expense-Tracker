/**
 * Comparison Service
 * Handles period-to-period spending comparison and trend analysis
 */

import { Transaction, Category } from '@/types/models';

export interface PeriodRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

export interface CategoryComparison {
  category: Category;
  currentAmount: number;
  previousAmount: number;
  change: number;
  percentageChange: number;
  significant: boolean; // true if change > 20%
}

export interface PeriodComparison {
  currentPeriod: PeriodRange;
  previousPeriod: PeriodRange;
  currentTotal: number;
  previousTotal: number;
  change: number;
  percentageChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  categoryComparisons: CategoryComparison[];
}

export type PeriodType = 'week' | 'month' | 'year' | 'custom';

class ComparisonServiceClass {
  /**
   * Calculate period ranges for comparison
   * Returns current and previous equivalent periods
   */
  calculatePeriodRanges(
    periodType: PeriodType,
    customRange?: PeriodRange
  ): {
    current: PeriodRange;
    previous: PeriodRange;
  } {
    const now = new Date();

    switch (periodType) {
      case 'week':
        return this.getWeekRanges(now);
      case 'month':
        return this.getMonthRanges(now);
      case 'year':
        return this.getYearRanges(now);
      case 'custom':
        if (!customRange) {
          throw new Error('Custom range required for custom period type');
        }
        return this.getCustomRanges(customRange);
      default:
        throw new Error(`Unknown period type: ${periodType}`);
    }
  }

  /**
   * Get current and previous week ranges
   */
  private getWeekRanges(now: Date): { current: PeriodRange; previous: PeriodRange } {
    // Current week (Sunday to today)
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - now.getDay());
    currentStart.setHours(0, 0, 0, 0);

    const currentEnd = new Date(now);
    currentEnd.setHours(23, 59, 59, 999);

    // Previous week (7 days before current week start)
    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - 7);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);

    return {
      current: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
      },
      previous: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
    };
  }

  /**
   * Get current and previous month ranges
   */
  private getMonthRanges(now: Date): { current: PeriodRange; previous: PeriodRange } {
    // Current month (1st to today)
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentStart.setHours(0, 0, 0, 0);

    const currentEnd = new Date(now);
    currentEnd.setHours(23, 59, 59, 999);

    // Previous month (same day range)
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    previousEnd.setHours(23, 59, 59, 999);

    return {
      current: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
      },
      previous: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
    };
  }

  /**
   * Get current and previous year ranges
   */
  private getYearRanges(now: Date): { current: PeriodRange; previous: PeriodRange } {
    // Current year (Jan 1 to today)
    const currentStart = new Date(now.getFullYear(), 0, 1);
    currentStart.setHours(0, 0, 0, 0);

    const currentEnd = new Date(now);
    currentEnd.setHours(23, 59, 59, 999);

    // Previous year (same date range)
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);
    previousStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    previousEnd.setHours(23, 59, 59, 999);

    return {
      current: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
      },
      previous: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
    };
  }

  /**
   * Get custom period ranges
   * Previous period has same duration as current
   */
  private getCustomRanges(customRange: PeriodRange): {
    current: PeriodRange;
    previous: PeriodRange;
  } {
    const currentStart = new Date(customRange.start);
    const currentEnd = new Date(customRange.end);

    // Calculate duration in milliseconds
    const duration = currentEnd.getTime() - currentStart.getTime();

    // Previous period ends where current starts
    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);

    const previousStart = new Date(previousEnd.getTime() - duration);

    return {
      current: customRange,
      previous: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
    };
  }

  /**
   * Filter transactions by period range
   */
  private getTransactionsInPeriod(transactions: Transaction[], period: PeriodRange): Transaction[] {
    const start = new Date(period.start).getTime();
    const end = new Date(period.end).getTime();

    return transactions.filter((t) => {
      const transactionDate = new Date(t.date).getTime();
      return transactionDate >= start && transactionDate <= end;
    });
  }

  /**
   * Calculate total spending for transactions (expenses only)
   */
  private calculateTotal(transactions: Transaction[]): number {
    return transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Calculate spending by category
   */
  private calculateByCategory(transactions: Transaction[]): Map<Category, number> {
    const categoryTotals = new Map<Category, number>();

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const current = categoryTotals.get(t.category) || 0;
        categoryTotals.set(t.category, current + t.amount);
      });

    return categoryTotals;
  }

  /**
   * Calculate percentage change
   * Returns null for new categories (previous = 0) to handle separately
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      // Don't show percentage for new spending categories
      // They will be filtered out in insights
      return 0;
    }
    return ((current - previous) / previous) * 100;
  }

  /**
   * Determine trend based on percentage change
   */
  private determineTrend(percentageChange: number): 'increasing' | 'decreasing' | 'stable' {
    if (Math.abs(percentageChange) < 5) {
      return 'stable';
    }
    return percentageChange > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Compare spending between two periods
   */
  comparePeriods(
    transactions: Transaction[],
    periodType: PeriodType,
    customRange?: PeriodRange
  ): PeriodComparison {
    // Calculate period ranges
    const { current: currentPeriod, previous: previousPeriod } = this.calculatePeriodRanges(
      periodType,
      customRange
    );

    // Get transactions for each period
    const currentTransactions = this.getTransactionsInPeriod(transactions, currentPeriod);
    const previousTransactions = this.getTransactionsInPeriod(transactions, previousPeriod);

    // Calculate totals
    const currentTotal = this.calculateTotal(currentTransactions);
    const previousTotal = this.calculateTotal(previousTransactions);

    // Calculate change
    const change = currentTotal - previousTotal;
    const percentageChange = this.calculatePercentageChange(currentTotal, previousTotal);
    const trend = this.determineTrend(percentageChange);

    // Calculate category comparisons
    const currentByCategory = this.calculateByCategory(currentTransactions);
    const previousByCategory = this.calculateByCategory(previousTransactions);

    // Get all categories that appear in either period
    const allCategories = new Set<Category>([
      ...currentByCategory.keys(),
      ...previousByCategory.keys(),
    ]);

    const categoryComparisons: CategoryComparison[] = Array.from(allCategories).map((category) => {
      const currentAmount = currentByCategory.get(category) || 0;
      const previousAmount = previousByCategory.get(category) || 0;
      const categoryChange = currentAmount - previousAmount;
      const categoryPercentageChange = this.calculatePercentageChange(
        currentAmount,
        previousAmount
      );

      return {
        category,
        currentAmount,
        previousAmount,
        change: categoryChange,
        percentageChange: categoryPercentageChange,
        significant: Math.abs(categoryPercentageChange) > 20,
      };
    });

    // Sort by absolute percentage change (most significant first)
    categoryComparisons.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));

    return {
      currentPeriod,
      previousPeriod,
      currentTotal,
      previousTotal,
      change,
      percentageChange,
      trend,
      categoryComparisons,
    };
  }

  /**
   * Get significant category changes (>20% change)
   */
  getSignificantChanges(comparison: PeriodComparison): CategoryComparison[] {
    return comparison.categoryComparisons.filter((c) => c.significant);
  }

  /**
   * Format period range for display
   */
  formatPeriodRange(period: PeriodRange): string {
    const start = new Date(period.start);
    const end = new Date(period.end);

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };

    // Add year if different from current year
    const currentYear = new Date().getFullYear();
    if (start.getFullYear() !== currentYear || end.getFullYear() !== currentYear) {
      options.year = 'numeric';
    }

    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }

  /**
   * Format percentage change for display
   */
  formatPercentageChange(percentageChange: number): string {
    const sign = percentageChange > 0 ? '+' : '';
    return `${sign}${percentageChange.toFixed(1)}%`;
  }
}

export const ComparisonService = new ComparisonServiceClass();
