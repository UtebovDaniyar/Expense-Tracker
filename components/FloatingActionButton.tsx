import { forwardRef } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  size?: number;
  color?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  className?: string;
}

export const FloatingActionButton = forwardRef<View, FloatingActionButtonProps>(
  (
    {
      onPress,
      icon = '+',
      size = 56,
      color = BRAND_COLORS.primary,
      position = 'bottom-right',
      className,
    },
    ref
  ) => {
    const getPositionStyles = () => {
      const base = { position: 'absolute' as const, bottom: 24 };
      switch (position) {
        case 'bottom-center':
          return { ...base, alignSelf: 'center' as const };
        case 'bottom-left':
          return { ...base, left: 24 };
        default:
          return { ...base, right: 24 };
      }
    };

    return (
      <TouchableOpacity
        ref={ref}
        className={`items-center justify-center rounded-full shadow-lg ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          ...getPositionStyles(),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Add new item"
        activeOpacity={0.8}>
        <Text className="text-3xl font-bold text-white">{icon}</Text>
      </TouchableOpacity>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';
