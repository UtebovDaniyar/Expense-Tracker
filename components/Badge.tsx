import { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface BadgeProps {
  count?: number;
  label?: string;
  variant?: 'notification' | 'status' | 'count';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Badge = forwardRef<View, BadgeProps>(
  ({ count, label, variant = 'notification', color, size = 'medium', className }, ref) => {
    const getBackgroundColor = () => {
      if (color) return color;
      if (variant === 'notification') return '#f44336';
      if (variant === 'status') return BRAND_COLORS.success;
      return BRAND_COLORS.accent;
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'small':
          return { minWidth: 16, height: 16, paddingHorizontal: 4 };
        case 'large':
          return { minWidth: 28, height: 28, paddingHorizontal: 10 };
        default:
          return { minWidth: 20, height: 20, paddingHorizontal: 6 };
      }
    };

    const getTextSize = () => {
      switch (size) {
        case 'small':
          return 'text-[10px]';
        case 'large':
          return 'text-sm';
        default:
          return 'text-xs';
      }
    };

    const displayText = label || (count !== undefined ? count.toString() : '');
    const shouldShow = count !== undefined ? count > 0 : !!label;

    if (!shouldShow) return null;

    return (
      <View
        ref={ref}
        className={`items-center justify-center rounded-full ${className}`}
        style={{
          backgroundColor: getBackgroundColor(),
          ...getSizeStyles(),
        }}
        accessible={true}
        accessibilityLabel={`${count || label} notifications`}
        accessibilityRole="text">
        <Text className={`font-bold text-white ${getTextSize()}`}>{displayText}</Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';
