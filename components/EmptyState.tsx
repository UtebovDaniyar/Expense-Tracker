import { forwardRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = forwardRef<View, EmptyStateProps>(
  ({ icon = '📭', title, subtitle, actionLabel, onAction, className }, ref) => {
    return (
      <View
        ref={ref}
        className={`items-center rounded-2xl p-8 ${className}`}
        style={{ backgroundColor: '#e8f5e9' }}
        accessible={true}
        accessibilityLabel={`${title}. ${subtitle || ''}`}>
        <Text className="mb-3 text-5xl">{icon}</Text>

        <Text
          className="mb-2 text-center text-lg font-bold"
          style={{ color: BRAND_COLORS.primary }}>
          {title}
        </Text>

        {subtitle && <Text className="mb-4 text-center text-sm text-gray-600">{subtitle}</Text>}

        {actionLabel && onAction && (
          <TouchableOpacity
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: BRAND_COLORS.primary }}
            onPress={onAction}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}>
            <Text className="font-semibold text-white">{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

EmptyState.displayName = 'EmptyState';
