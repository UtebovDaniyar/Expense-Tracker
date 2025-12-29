// Core data models for PennyWise expense tracker

export type Category =
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'bills'
  | 'shopping'
  | 'health'
  | 'education'
  | 'other';

export interface CategoryConfig {
  id: Category;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: Category;
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  recurringId?: string;
}

export interface Budget {
  id: string;
  amount: number;
  period: 'monthly';
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudget {
  id: string;
  category: Category;
  amount: number;
  period: 'monthly';
  createdAt: string;
  updatedAt: string;
}

export interface BudgetStatus {
  totalBudget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  dailyAllowance: number;
  daysRemaining: number;
  spentToday: number;
}

export interface CategoryBudgetStatus {
  category: Category;
  budget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'on-track' | 'warning' | 'exceeded';
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  percentage: number;
  remaining: number;
  daysRemaining: number;
  requiredMonthly: number;
}

export interface RecurringTransaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: Category;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  lastCreated: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  currency: string;
  currencySymbol: string;
  hasCompletedOnboarding: boolean;
  preferredCategories: Category[];
  userName?: string;
  theme: 'light' | 'dark' | 'auto';
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlerts {
  enabled50Percent: boolean;
  enabled75Percent: boolean;
  enabled90Percent: boolean;
  enabledDailyLimit: boolean;
}
