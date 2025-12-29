/**
 * Insight Card Component
 * Displays a single financial insight with appropriate styling
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { Insight, InsightType } from '@/services/insightsService';
import { useRouter } from 'expo-router';

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const router = useRouter();

  const getInsightStyles = (type: InsightType) => {
    switch (type) {
      case 'warning':
        return {
          backgroundColor: '#ffebee',
          iconColor: '#f44336',
          icon: '⚠️',
          borderColor: '#f44336',
        };
      case 'success':
        return {
          backgroundColor: '#e8f5e9',
          iconColor: '#4caf50',
          icon: '✅',
          borderColor: '#4caf50',
        };
      case 'info':
        return {
          backgroundColor: '#e3f2fd',
          iconColor: '#2196f3',
          icon: 'ℹ️',
          borderColor: '#2196f3',
        };
      case 'tip':
        return {
          backgroundColor: '#fff8e1',
          iconColor: '#ffc107',
          icon: '💡',
          borderColor: '#ffc107',
        };
      default:
        return {
          backgroundColor: '#f5f5f5',
          iconColor: '#9ca3af',
          icon: '📌',
          borderColor: '#9ca3af',
        };
    }
  };

  const styles = getInsightStyles(insight.type);

  const handleAction = () => {
    if (insight.action?.handler) {
      insight.action.handler();
    } else if (insight.action?.route) {
      router.push(insight.action.route as any);
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(insight.id);
    }
  };

  return (
    <View
      className="mb-3 rounded-2xl p-4"
      style={{
        backgroundColor: styles.backgroundColor,
        borderLeftWidth: 4,
        borderLeftColor: styles.borderColor,
      }}>
      <View className="flex-row items-start">
        {/* Icon */}
        <View className="mr-3">
          <Text className="text-2xl">{styles.icon}</Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className="mb-1 text-base font-bold" style={{ color: '#1a3d3d' }}>
            {insight.title}
          </Text>
          <Text className="mb-3 text-sm text-gray-700">{insight.description}</Text>

          {/* Actions */}
          <View className="flex-row items-center">
            {insight.actionable && insight.action && (
              <TouchableOpacity
                className="mr-3 rounded-full px-4 py-2"
                style={{ backgroundColor: styles.iconColor }}
                onPress={handleAction}>
                <Text className="text-sm font-semibold text-white">{insight.action.label}</Text>
              </TouchableOpacity>
            )}

            {insight.dismissible && (
              <TouchableOpacity
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: '#f5f5f5' }}
                onPress={handleDismiss}>
                <Text className="text-sm font-semibold text-gray-600">Dismiss</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
