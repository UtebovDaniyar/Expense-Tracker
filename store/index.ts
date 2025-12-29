// Central export for all Zustand stores

export { useSettingsStore } from './settingsStore';
export { useTransactionsStore } from './transactionsStore';
export { useBudgetStore } from './budgetStore';
export { useGoalsStore } from './goalsStore';
export { useAnalyticsStore } from './analyticsStore';
export { useFilterStore } from './filterStore';
export { useInsightsStore } from './insightsStore';

// Initialize all stores on app launch
export async function initializeStores() {
  const { useSettingsStore } = await import('./settingsStore');
  const { useTransactionsStore } = await import('./transactionsStore');
  const { useBudgetStore } = await import('./budgetStore');
  const { useGoalsStore } = await import('./goalsStore');

  await Promise.all([
    useSettingsStore.getState().loadSettings(),
    useTransactionsStore.getState().loadTransactions(),
    useBudgetStore.getState().loadBudget(),
    useGoalsStore.getState().loadGoals(),
  ]);

  // Process recurring transactions after loading
  await useTransactionsStore.getState().processRecurringTransactions();
}
