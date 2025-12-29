import { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  height?: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export const ProgressBar = forwardRef<View, ProgressBarProps>(
  (
    { percentage, showLabel = false, height = 8, color, backgroundColor = '#e0e0e0', className },
    ref
  ) => {
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

    const getColor = () => {
      if (color) return color;
      if (clampedPercentage >= 100) return '#f44336';
      if (clampedPercentage >= 75) return '#ff9800';
      return BRAND_COLORS.success;
    };

    return (
      <View ref={ref} className={className}>
        <View
          className="rounded-full"
          style={{
            height,
            backgroundColor,
            overflow: 'hidden',
          }}>
          <View
            className="rounded-full"
            style={{
              height: '100%',
              width: `${clampedPercentage}%`,
              backgroundColor: getColor(),
            }}
          />
        </View>

        {showLabel && (
          <Text className="mt-1 text-xs text-gray-600">{Math.round(clampedPercentage)}%</Text>
        )}
      </View>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
