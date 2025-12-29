/**
 * Insights Service
 * Generates personalized financial insights based on spending patterns
 */

import { Transaction, Budget, CategoryBudget, Goal, Category } from '@/types/models';
import { ComparisonService } from './comparisonService';

export type InsightType = 'warning' | 'success' | 'info' | 'tip';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  actionable: boolean;
  action?: {
    label: string;
    route?: string;
    handler?: () => void;
  };
  dismissible: boolean;
  createdAt: string;
  priority: number; // Higher = more important
}

export interface InsightGenerationContext {
  transactions: Transaction[];
  budget: Budget | null;
  categoryBudgets: CategoryBudget[];
  goals: Goal[];
  dateRange: {
    start: string;
    end: string;
  };
}

class InsightsServiceClass {
  private dismissedInsights: Set<string> = new Set();

  /**
   * Generate all insights for the given context
   */
  generateInsights(context: InsightGenerationContext): Insight[] {
    const insights: Insight[] = [];

    // Only generate insights if we have enough data (at least 7 days of transactions)
    const daysCovered = this.calculateDaysCovered(context.transactions);
    if (daysCovered < 7) {
      return [
        {
          id: 'insufficient-data',
          type: 'info',
          title: 'Keep tracking your expenses',
          description: 'Add more transactions to get personalized insights about your spending',
          actionable: false,
          dismissible: false,
          createdAt: new Date().toISOString(),
          priority: 1,
        },
      ];
    }

    // Generate different types of insights
    insights.push(...this.generateSpendingSpikeInsights(context));
    insights.push(...this.generateBudgetSuccessInsights(context));
    insights.push(...this.generateSavingsOpportunityInsights(context));
    insights.push(...this.generateGoalProgressInsights(context));
    insights.push(...this.generateCategoryInsights(context));

    // Filter out dismissed insights
    const activeInsights = insights.filter((insight) => !this.dismissedInsights.has(insight.id));

    // Sort by priority (highest first) and limit to top 10
    return activeInsights.sort((a, b) => b.priority - a.priority).slice(0, 10);
  }

  /**
   * Detect spending spikes (>20% increase from previous period)
   */
  private generateSpendingSpikeInsights(context: InsightGenerationContext): Insight[] {
    const insights: Insight[] = [];

    try {
      const comparison = ComparisonService.comparePeriods(context.transactions, 'month');

      // Overall spending spike
      if (comparison.percentageChange > 20) {
        insights.push({
          id: 'spending-spike-overall',
          type: 'warning',
          title: `Spending increased by ${comparison.percentageChange.toFixed(0)}%`,
          description: `You spent ${Math.abs(comparison.change).toFixed(2)} more this month compared to last month`,
          actionable: true,
          action: {
            label: 'Review Budget',
            route: '/budget',
          },
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 9,
        });
      }

      // Category-specific spikes
      // Filter out new categories (previousAmount = 0) and only show real increases
      const significantChanges = comparison.categoryComparisons.filter(
        (c) => c.significant && c.percentageChange > 20 && c.previousAmount > 0
      );

      significantChanges.slice(0, 2).forEach((change, index) => {
        insights.push({
          id: `spending-spike-${change.category}`,
          type: 'warning',
          title: `${this.getCategoryName(change.category)} spending up ${change.percentageChange.toFixed(0)}%`,
          description: `You spent ${change.change.toFixed(2)} more on ${this.getCategoryName(change.category)} this month`,
          actionable: true,
          action: {
            label: 'View Transactions',
            route: '/transactions',
          },
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 8 - index,
        });
      });
    } catch (error) {
      console.error('Error generating spending spike insights:', error);
    }

    return insights;
  }

  /**
   * Recognize budget success (staying under budget for consecutive months)
   */
  private generateBudgetSuccessInsights(context: InsightGenerationContext): Insight[] {
    const insights: Insight[] = [];

    if (!context.budget) return insights;

    const expenses = context.transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const percentageUsed = (expenses / context.budget.amount) * 100;

    // Under budget success
    if (percentageUsed < 90 && expenses > 0) {
      const remaining = context.budget.amount - expenses;
      insights.push({
        id: 'budget-success',
        type: 'success',
        title: 'Great job staying under budget!',
        description: `You have ${remaining.toFixed(2)} remaining in your budget. Keep up the good work!`,
        actionable: false,
        dismissible: true,
        createdAt: new Date().toISOString(),
        priority: 7,
      });
    }

    // Budget warning
    if (percentageUsed >= 90 && percentageUsed < 100) {
      insights.push({
        id: 'budget-warning',
        type: 'warning',
        title: 'Approaching budget limit',
        description: `You've used ${percentageUsed.toFixed(0)}% of your monthly budget. Be mindful of your spending.`,
        actionable: true,
        action: {
          label: 'View Budget',
          route: '/budget',
        },
        dismissible: true,
        createdAt: new Date().toISOString(),
        priority: 10,
      });
    }

    // Budget exceeded
    if (percentageUsed >= 100) {
      const overspent = expenses - context.budget.amount;
      insights.push({
        id: 'budget-exceeded',
        type: 'warning',
        title: 'Budget exceeded',
        description: `You've exceeded your budget by ${overspent.toFixed(2)}. Consider adjusting your spending.`,
        actionable: true,
        action: {
          label: 'Review Expenses',
          route: '/transactions',
        },
        dismissible: true,
        createdAt: new Date().toISOString(),
        priority: 10,
      });
    }

    return insights;
  }

  /**
   * Suggest savings opportunities (unused budget with time remaining)
   */
  private generateSavingsOpportunityInsights(context: InsightGenerationContext): Insight[] {
    const insights: Insight[] = [];

    if (!context.budget) return insights;

    const expenses = context.transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = context.budget.amount - expenses;
    const percentageRemaining = (remaining / context.budget.amount) * 100;

    // Calculate days remaining in period
    const now = new Date();
    const endDate = new Date(context.dateRange.end);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Savings opportunity if >15% remaining with 5+ days left
    if (percentageRemaining > 15 && daysRemaining >= 5 && remaining > 0) {
      insights.push({
        id: 'savings-opportunity',
        type: 'tip',
        title: 'Savings opportunity detected',
        description: `You have ${remaining.toFixed(2)} left in your budget with ${daysRemaining} days remaining. Consider saving this amount!`,
        actionable: true,
        action: {
          label: 'Add to Goal',
          route: '/goals',
        },
        dismissible: true,
        createdAt: new Date().toISOString(),
        priority: 6,
      });
    }

    return insights;
  }

  /**
   * Generate goal progress insights and recommendations
   */
  private generateGoalProgressInsights(context: InsightGenerationContext): Insight[] {
    const insights: Insight[] = [];

    context.goals.forEach((goal) => {
      if (goal.status !== 'active') return;

      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const remaining = goal.targetAmount - goal.currentAmount;

      // Calculate days remaining
      const now = new Date();
      const targetDate = new Date(goal.targetDate);
      const daysRemaining = Math.ceil(
        (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Milestone celebrations (25%, 50%, 75%)
      // Show milestone for the highest achieved milestone
      const milestones = [75, 50, 25]; // Check in descending order
      let milestoneShown = false;

      milestones.forEach((milestone) => {
        if (!milestoneShown && progress >= milestone && progress < 100) {
          insights.push({
            id: `goal-milestone-${goal.id}-${milestone}`,
            type: 'success',
            title: `${milestone}% towards ${goal.name}!`,
            description: `You're making great progress! Only ${remaining.toFixed(2)} to go.`,
            actionable: false,
            dismissible: true,
            createdAt: new Date().toISOString(),
            priority: 7,
          });
          milestoneShown = true; // Only show one milestone per goal
        }
      });

      // Goal deadline approaching
      if (daysRemaining <= 30 && daysRemaining > 0 && progress < 100) {
        const monthlyRequired = remaining / (daysRemaining / 30);
        insights.push({
          id: `goal-deadline-${goal.id}`,
          type: 'info',
          title: `${goal.name} deadline approaching`,
          description: `Save ${monthlyRequired.toFixed(2)} per month to reach your goal on time.`,
          actionable: true,
          action: {
            label: 'Add Funds',
            route: '/goals',
          },
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 8,
        });
      }

      // Goal completion
      if (progress >= 100) {
        insights.push({
          id: `goal-completed-${goal.id}`,
          type: 'success',
          title: `🎉 Goal achieved: ${goal.name}!`,
          description: 'Congratulations on reaching your financial goal!',
          actionable: false,
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 10,
        });
      }
    });

    return insights;
  }

  /**
   * Generate category-specific insights
   */
  private generateCategoryInsights(context: InsightGenerationContext): Insight[] {
    const insights: Insight[] = [];

    // Calculate category spending
    const categoryTotals = new Map<Category, number>();
    context.transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount);
      });

    const totalExpenses = Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0);

    // Find dominant category (>40% of spending)
    categoryTotals.forEach((amount, category) => {
      const percentage = (amount / totalExpenses) * 100;
      if (percentage > 40) {
        insights.push({
          id: `category-dominant-${category}`,
          type: 'info',
          title: `${this.getCategoryName(category)} is your top expense`,
          description: `${percentage.toFixed(0)}% of your spending goes to ${this.getCategoryName(category)}. Consider if this aligns with your priorities.`,
          actionable: true,
          action: {
            label: 'View Category',
            route: '/analytics',
          },
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 5,
        });
      }
    });

    // Category budget warnings
    context.categoryBudgets.forEach((categoryBudget) => {
      const spent = categoryTotals.get(categoryBudget.category) || 0;
      const percentageUsed = (spent / categoryBudget.amount) * 100;

      if (percentageUsed >= 90 && percentageUsed < 100) {
        insights.push({
          id: `category-budget-warning-${categoryBudget.category}`,
          type: 'warning',
          title: `${this.getCategoryName(categoryBudget.category)} budget almost reached`,
          description: `You've used ${percentageUsed.toFixed(0)}% of your ${this.getCategoryName(categoryBudget.category)} budget.`,
          actionable: true,
          action: {
            label: 'View Budget',
            route: '/budget',
          },
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 9,
        });
      }

      if (percentageUsed >= 100) {
        const overspent = spent - categoryBudget.amount;
        insights.push({
          id: `category-budget-exceeded-${categoryBudget.category}`,
          type: 'warning',
          title: `${this.getCategoryName(categoryBudget.category)} budget exceeded`,
          description: `You've exceeded your ${this.getCategoryName(categoryBudget.category)} budget by ${overspent.toFixed(2)}.`,
          actionable: true,
          action: {
            label: 'Review Expenses',
            route: '/transactions',
          },
          dismissible: true,
          createdAt: new Date().toISOString(),
          priority: 9,
        });
      }
    });

    return insights;
  }

  /**
   * Dismiss an insight
   */
  dismissInsight(insightId: string): void {
    this.dismissedInsights.add(insightId);
  }

  /**
   * Clear all dismissed insights
   */
  clearDismissedInsights(): void {
    this.dismissedInsights.clear();
  }

  /**
   * Calculate number of days covered by transactions
   */
  private calculateDaysCovered(transactions: Transaction[]): number {
    if (transactions.length === 0) return 0;

    const dates = transactions.map((t) => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Get human-readable category name
   */
  private getCategoryName(category: Category): string {
    const names: Record<Category, string> = {
      food: 'Food',
      transport: 'Transport',
      entertainment: 'Entertainment',
      bills: 'Bills',
      shopping: 'Shopping',
      health: 'Health',
      education: 'Education',
      other: 'Other',
    };
    return names[category] || category;
  }
}

export const InsightsService = new InsightsServiceClass();
