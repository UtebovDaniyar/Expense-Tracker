/**
 * Period Comparison Component
 * Displays side-by-side comparison of spending between periods
 */

import { View, Text } from 'react-native';
import { PeriodComparison } from '@/services/comparisonService';
import { formatCurrency } from '@/utils/currency';
import { getCategoryConfig } from '@/constants/categories';

interface PeriodComparisonProps {
  comparison: PeriodComparison;
  currencySymbol: string;
}

export function PeriodComparisonCard({ comparison, currencySymbol }: PeriodComparisonProps) {
  const getTrendColor = () => {
    if (comparison.trend === 'increasing') return '#f44336';
    if (comparison.trend === 'decreasing') return '#4caf50';
    return '#9ca3af';
  };

  const getTrendIcon = () => {
    if (comparison.trend === 'increasing') return '📈';
    if (comparison.trend === 'decreasing') return '📉';
    return '➡️';
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${formatCurrency(Math.abs(change), currencySymbol)}`;
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  return (
    <View className="mb-6">
      {/* Overall Comparison */}
      <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Period Comparison</Text>
          <View className="flex-row items-center">
            <Text className="mr-1 text-lg">{getTrendIcon()}</Text>
            <Text className="text-sm font-semibold" style={{ color: getTrendColor() }}>
              {formatPercentage(comparison.percentageChange)}
            </Text>
          </View>
        </View>

        {/* Side by Side Bars */}
        <View className="mb-4">
          <View className="mb-2 flex-row items-end justify-between">
            {/* Previous Period */}
            <View className="flex-1 items-center">
              <View
                className="w-full rounded-t-lg"
                style={{
                  height: Math.max(
                    (comparison.previousTotal /
                      Math.max(comparison.currentTotal, comparison.previousTotal)) *
                      120,
                    20
                  ),
                  backgroundColor: '#9ca3af',
                }}
              />
              <Text className="mt-2 text-xs text-gray-600">Previous</Text>
              <Text className="text-sm font-bold" style={{ color: '#1a3d3d' }}>
                {formatCurrency(comparison.previousTotal, currencySymbol)}
              </Text>
            </View>

            {/* Spacer */}
            <View className="w-4" />

            {/* Current Period */}
            <View className="flex-1 items-center">
              <View
                className="w-full rounded-t-lg"
                style={{
                  height: Math.max(
                    (comparison.currentTotal /
                      Math.max(comparison.currentTotal, comparison.previousTotal)) *
                      120,
                    20
                  ),
                  backgroundColor: getTrendColor(),
                }}
              />
              <Text className="mt-2 text-xs text-gray-600">Current</Text>
              <Text className="text-sm font-bold" style={{ color: '#1a3d3d' }}>
                {formatCurrency(comparison.currentTotal, currencySymbol)}
              </Text>
            </View>
          </View>

          {/* Change Amount */}
          <View className="mt-3 items-center rounded-lg p-2" style={{ backgroundColor: '#f5f5f5' }}>
            <Text className="text-xs text-gray-600">Change</Text>
            <Text className="text-lg font-bold" style={{ color: getTrendColor() }}>
              {formatChange(comparison.change)}
            </Text>
          </View>
        </View>
      </View>

      {/* Significant Category Changes */}
      {comparison.categoryComparisons.filter((c) => c.significant).length > 0 && (
        <View>
          <Text className="mb-3 text-base font-bold" style={{ color: '#1a3d3d' }}>
            Significant Changes
          </Text>
          {comparison.categoryComparisons
            .filter((c) => c.significant)
            .slice(0, 5)
            .map((categoryComp) => {
              const category = getCategoryConfig(categoryComp.category);
              if (!category) return null;

              const changeColor = categoryComp.change > 0 ? '#f44336' : '#4caf50';

              return (
                <View
                  key={categoryComp.category}
                  className="mb-3 flex-row items-center justify-between rounded-xl p-3"
                  style={{ backgroundColor: category.color + '10' }}>
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color + '20' }}>
                      <Text className="text-lg">{category.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold" style={{ color: '#1a3d3d' }}>
                        {category.name}
                      </Text>
                      <Text className="text-xs text-gray-600">
                        {formatCurrency(categoryComp.previousAmount, currencySymbol)} →{' '}
                        {formatCurrency(categoryComp.currentAmount, currencySymbol)}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold" style={{ color: changeColor }}>
                      {formatPercentage(categoryComp.percentageChange)}
                    </Text>
                    <Text className="text-xs" style={{ color: changeColor }}>
                      {formatChange(categoryComp.change)}
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* No Significant Changes */}
      {comparison.categoryComparisons.filter((c) => c.significant).length === 0 && (
        <View className="items-center rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
          <Text className="text-sm text-gray-600">
            No significant category changes (±20%) detected
          </Text>
        </View>
      )}
    </View>
  );
}
