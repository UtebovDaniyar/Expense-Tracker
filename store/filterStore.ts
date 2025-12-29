/**
 * Filter Store
 * Manages transaction filter state and persistence
 */

import { create } from 'zustand';
import { FilterCriteria, FilterService } from '@/services/filterService';
import { Transaction } from '@/types/models';

interface FilterStoreState {
  activeFilters: FilterCriteria;
  isFiltering: boolean;

  // Actions
  setFilters: (filters: FilterCriteria) => void;
  clearFilters: () => void;
  setDateRange: (start: string, end: string) => void;
  setCategories: (categories: FilterCriteria['categories']) => void;
  setAmountRange: (min?: number, max?: number) => void;
  setType: (type: FilterCriteria['type']) => void;
  applyPredefinedPeriod: (period: 'week' | 'month' | 'year') => void;
  getFilteredTransactions: (
    transactions: Transaction[]
  ) => ReturnType<typeof FilterService.applyFilters>;
  getActiveFilterCount: () => number;
  hasActiveFilters: () => boolean;
}

const DEFAULT_FILTERS: FilterCriteria = {
  dateRange: undefined,
  categories: [],
  amountRange: undefined,
  type: 'all',
};

export const useFilterStore = create<FilterStoreState>((set, get) => ({
  activeFilters: DEFAULT_FILTERS,
  isFiltering: false,

  setFilters: (filters: FilterCriteria) => {
    const validation = FilterService.validateFilters(filters);

    if (!validation.valid) {
      console.error('Invalid filters:', validation.error);
      return;
    }

    set({
      activeFilters: filters,
      isFiltering: FilterService.hasActiveFilters(filters),
    });
  },

  clearFilters: () => {
    set({
      activeFilters: DEFAULT_FILTERS,
      isFiltering: false,
    });
  },

  setDateRange: (start: string, end: string) => {
    const { activeFilters } = get();
    get().setFilters({
      ...activeFilters,
      dateRange: { start, end },
    });
  },

  setCategories: (categories) => {
    const { activeFilters } = get();
    get().setFilters({
      ...activeFilters,
      categories,
    });
  },

  setAmountRange: (min, max) => {
    const { activeFilters } = get();
    get().setFilters({
      ...activeFilters,
      amountRange: min !== undefined || max !== undefined ? { min, max } : undefined,
    });
  },

  setType: (type) => {
    const { activeFilters } = get();
    get().setFilters({
      ...activeFilters,
      type,
    });
  },

  applyPredefinedPeriod: (period) => {
    const dateRange = FilterService.getDateRangeForPeriod(period);
    const { activeFilters } = get();
    get().setFilters({
      ...activeFilters,
      dateRange,
    });
  },

  getFilteredTransactions: (transactions) => {
    const { activeFilters } = get();
    return FilterService.applyFilters(transactions, activeFilters);
  },

  getActiveFilterCount: () => {
    const { activeFilters } = get();
    return FilterService.getActiveFilterCount(activeFilters);
  },

  hasActiveFilters: () => {
    const { activeFilters } = get();
    return FilterService.hasActiveFilters(activeFilters);
  },
}));
