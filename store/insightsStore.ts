/**
 * Insights Store
 * Manages financial insights state and dismissed insights
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Insight, InsightsService, InsightGenerationContext } from '@/services/insightsService';

interface InsightsState {
  dismissedInsights: string[];
  dismissInsight: (insightId: string) => void;
  clearDismissedInsights: () => void;
  generateInsights: (context: InsightGenerationContext) => Insight[];
}

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      dismissedInsights: [],

      dismissInsight: (insightId: string) => {
        set((state) => ({
          dismissedInsights: [...state.dismissedInsights, insightId],
        }));
        InsightsService.dismissInsight(insightId);
      },

      clearDismissedInsights: () => {
        set({ dismissedInsights: [] });
        InsightsService.clearDismissedInsights();
      },

      generateInsights: (context: InsightGenerationContext) => {
        const insights = InsightsService.generateInsights(context);
        const { dismissedInsights } = get();

        // Filter out dismissed insights
        return insights.filter((insight) => !dismissedInsights.includes(insight.id));
      },
    }),
    {
      name: 'insights-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
