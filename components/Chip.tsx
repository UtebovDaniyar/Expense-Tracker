import { forwardRef } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface ChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'filter' | 'status';
  color?: string;
  className?: string;
}

export const Chip = forwardRef<View, ChipProps>(
  ({ label, isActive = false, onPress, onRemove, variant = 'default', color, className }, ref) => {
    const getBackgroundColor = () => {
      if (variant === 'status') {
        return color || BRAND_COLORS.accent + '40';
      }
      if (isActive) {
        return BRAND_COLORS.accent + '40';
      }
      return '#f5f5f5';
    };

    const getBorderColor = () => {
      if (variant === 'status') {
        return color || BRAND_COLORS.accent;
      }
      if (isActive) {
        return BRAND_COLORS.accent;
      }
      return 'transparent';
    };

    return (
      <TouchableOpacity
        ref={ref}
        className={`flex-row items-center rounded-full px-4 py-2 ${className}`}
        style={{
          backgroundColor: getBackgroundColor(),
          borderWidth: isActive || variant === 'status' ? 1 : 0,
          borderColor: getBorderColor(),
        }}
        onPress={onPress}
        disabled={!onPress && !onRemove}>
        <Text
          className="text-sm font-semibold"
          style={{
            color: isActive || variant === 'status' ? BRAND_COLORS.primary : '#757575',
          }}>
          {label}
        </Text>

        {onRemove && isActive && (
          <TouchableOpacity
            className="ml-2"
            onPress={(e) => {
              e.stopPropagation();
              onRemove();
            }}>
            <Text className="text-sm font-bold text-gray-600">✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }
);

Chip.displayName = 'Chip';
